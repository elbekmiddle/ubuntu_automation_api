import {
    BadRequestException,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersRepository, User } from './users.repository';
import { RefreshTokensRepository } from './refresh-tokens.repository';

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 15 * 60); // 15 daqiqa
const REFRESH_TOKEN_TTL_MS = Number(process.env.JWT_REFRESH_TTL_MS ?? 30 * 24 * 60 * 60 * 1000); // 30 kun
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

    constructor(
        private readonly usersRepo: UsersRepository,
        private readonly refreshTokensRepo: RefreshTokensRepository,
        private readonly jwtService: JwtService,
    ) {}

    async register(email: string, password: string, name: string | null, deviceId: string | null): Promise<{ user: PublicUser; tokens: AuthTokens }> {
        const existing = await this.usersRepo.findByEmail(email);
        if (existing) {
            throw new BadRequestException('Bu email bilan foydalanuvchi allaqachon mavjud');
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const user = await this.usersRepo.create(email, passwordHash, name ?? null);
        this.logger.log(`Registered new user: ${user.email}`);

        const tokens = await this.issueTokens(user, deviceId);
        return { user: toPublicUser(user), tokens };
    }

    async login(email: string, password: string, deviceId: string | null): Promise<{ user: PublicUser; tokens: AuthTokens }> {
        const user = await this.usersRepo.findByEmail(email);
        // Doim bir xil xabar — "email topilmadi" va "parol xato"ni ajratib bermaymiz,
        // aks holda tashqi odam qaysi email'lar ro'yxatdan o'tganini bilib oladi.
        if (!user) {
            throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
        }

        const tokens = await this.issueTokens(user, deviceId);
        return { user: toPublicUser(user), tokens };
    }

    async refresh(refreshToken: string, deviceId: string | null): Promise<AuthTokens> {
        const tokenHash = hashToken(refreshToken);
        const stored = await this.refreshTokensRepo.findValidByHash(tokenHash);
        if (!stored) {
            throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati o\'tgan');
        }

        const user = await this.usersRepo.findById(stored.user_id);
        if (!user) {
            throw new UnauthorizedException('Foydalanuvchi topilmadi');
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
            throw new UnauthorizedException('Foydalanuvchi topilmadi');
        }
        return toPublicUser(user);
    }

    private async issueTokens(user: User, deviceId: string | null): Promise<AuthTokens> {
        const accessToken = await this.jwtService.signAsync(
            { sub: user.id, email: user.email },
            { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
        );

        const refreshToken = generateOpaqueToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
        await this.refreshTokensRepo.create(user.id, hashToken(refreshToken), expiresAt, deviceId);

        return { accessToken, refreshToken };
    }
}
