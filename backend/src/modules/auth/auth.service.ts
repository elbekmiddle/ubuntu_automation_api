import {
    BadRequestException,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersRepository, User } from './users.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { AUTH_ERROR_CODES, AUTH_ERRORS } from '../../config/errors/auth-error-code';
import { OrganizationsService } from '../organizations/organizations.service';

const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface PublicUser {
    id: string;
    email: string;
    name: string | null;
}

function toPublicUser(user: User): PublicUser {
    return { id: user.id, email: user.email, name: user.name };
}

// Refresh token'ni DB'da HASH qilib saqlaymiz (bcrypt emas — tez qidirish
// kerak, shuning uchun tokenning o'zi kriptografik jihatdan tasodifiy va
// uzun, SHA-256 hash'i esa faqat lookup uchun ishlatiladi).
function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOpaqueToken(): string {
    return crypto.randomBytes(48).toString('hex');
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly refreshTtlMs: number;

    constructor(
        private readonly usersRepo: UsersRepository,
        private readonly refreshTokensRepo: RefreshTokensRepository,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
        private readonly organizationsService: OrganizationsService,
    ) {
        this.refreshTtlMs = Number(this.config.get('JWT_REFRESH_TTL_MS') ?? 30 * 24 * 60 * 60 * 1000);
    }

    async register(email: string, password: string, name: string | null, deviceId: string | null): Promise<{ user: PublicUser; tokens: AuthTokens }> {
        const existing = await this.usersRepo.findByEmail(email);
        if (existing) {
            throw new BadRequestException({
                code: AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
                message: AUTH_ERRORS[AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS],
            });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await this.usersRepo.create(email, passwordHash, name ?? null);
        this.logger.log(`Registered new user: ${user.email}`);

        // Har bir yangi user shaxsiy workspace bilan boshlaydi (Organizations
        // moduli) va agar undan oldin biror tashkilotga email orqali
        // taklif qilingan bo'lsa ("pending" invite), shu a'zoliklar endi
        // uning user_id'siga bog'lanadi.
        await this.organizationsService.createPersonalWorkspace(user.id, user.email, user.name);
        await this.organizationsService.linkPendingInvites(user.id, user.email);

        const tokens = await this.issueTokens(user, deviceId);
        return { user: toPublicUser(user), tokens };
    }

    async login(email: string, password: string, deviceId: string | null): Promise<{ user: PublicUser; tokens: AuthTokens }> {
        const user = await this.usersRepo.findByEmail(email);
        // Doim bir xil xabar/kod — "email topilmadi" va "parol xato"ni ajratib bermaymiz,
        // aks holda tashqi odam qaysi email'lar ro'yxatdan o'tganini bilib oladi.
        if (!user) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
                message: AUTH_ERRORS[AUTH_ERROR_CODES.INVALID_CREDENTIALS],
            });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
                message: AUTH_ERRORS[AUTH_ERROR_CODES.INVALID_CREDENTIALS],
            });
        }

        const tokens = await this.issueTokens(user, deviceId);
        return { user: toPublicUser(user), tokens };
    }

    async refresh(refreshToken: string, deviceId: string | null): Promise<AuthTokens> {
        const tokenHash = hashToken(refreshToken);
        const stored = await this.refreshTokensRepo.findValidByHash(tokenHash);
        if (!stored) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN,
                message: AUTH_ERRORS[AUTH_ERROR_CODES.INVALID_REFRESH_TOKEN],
            });
        }

        const user = await this.usersRepo.findById(stored.user_id);
        if (!user) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODES.USER_NOT_FOUND,
                message: AUTH_ERRORS[AUTH_ERROR_CODES.USER_NOT_FOUND],
            });
        }

        // Rotation: eski refresh token darhol bekor qilinadi, yangisi chiqariladi —
        // shu bilan o'g'irlangan eski token qayta ishlatilsa, sezib qolamiz.
        await this.refreshTokensRepo.revoke(tokenHash);
        return this.issueTokens(user, deviceId);
    }

    async logout(refreshToken: string): Promise<void> {
        await this.refreshTokensRepo.revoke(hashToken(refreshToken));
    }

    async logoutAll(userId: string): Promise<void> {
        await this.refreshTokensRepo.revokeAllForUser(userId);
    }

    async me(userId: string): Promise<PublicUser> {
        const user = await this.usersRepo.findById(userId);
        if (!user) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODES.USER_NOT_FOUND,
                message: AUTH_ERRORS[AUTH_ERROR_CODES.USER_NOT_FOUND],
            });
        }
        return toPublicUser(user);
    }

    private async issueTokens(user: User, deviceId: string | null): Promise<AuthTokens> {
        // expiresIn JwtModule.registerAsync ichida (auth.module.ts) allaqachon
        // sozlangan — bu yerda qayta ko'rsatish shart emas.
        const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email });

        const refreshToken = generateOpaqueToken();
        const expiresAt = new Date(Date.now() + this.refreshTtlMs);
        await this.refreshTokensRepo.create(user.id, hashToken(refreshToken), expiresAt, deviceId);

        return { accessToken, refreshToken };
    }
}
