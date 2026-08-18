import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AppsRepository } from './apps.repository';
import { APP_ERROR_CODES, APP_ERRORS } from '../config/errors/apps-error-code';

function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRegistrationToken(): string {
    return `app_reg_${crypto.randomBytes(32).toString('hex')}`;
}

@Injectable()
export class AppsService {
    private readonly logger = new Logger(AppsService.name);

    constructor(private readonly repo: AppsRepository) {}

    async create(userId: string, name: string) {
        const registrationToken = generateRegistrationToken();
        const app = await this.repo.create(userId, name, hashToken(registrationToken));
        this.logger.log(`Created app "${name}" for user ${userId}`);

        // registrationToken faqat SHU javobda qaytadi — DB'da faqat hash saqlanadi,
        // shuning uchun keyinroq qayta ko'rsatib bo'lmaydi.
        return { app, registrationToken };
    }

    async findAllForUser(userId: string) {
        return this.repo.findAllForUser(userId);
    }

    async findOneForUser(userId: string, id: string) {
        const app = await this.repo.findByIdForUser(userId, id);
        if (!app) {
            throw new NotFoundException({
                code: APP_ERROR_CODES.NOT_FOUND,
                message: `${APP_ERRORS[APP_ERROR_CODES.NOT_FOUND]}: "${id}"`,
            });
        }
        return app;
    }

    async remove(userId: string, id: string) {
        const removed = await this.repo.remove(userId, id);
        if (!removed) {
            throw new NotFoundException({
                code: APP_ERROR_CODES.NOT_FOUND,
                message: `${APP_ERRORS[APP_ERROR_CODES.NOT_FOUND]}: "${id}"`,
            });
        }
        return { removed: true };
    }

    /** Agent WebSocket orqali ulanganda registration token'ni tekshiradi. */
    async authenticateAgent(appId: string, registrationToken: string) {
        const app = await this.repo.findById(appId);
        if (!app || app.registration_token_hash !== hashToken(registrationToken)) {
            throw new ForbiddenException({
                code: APP_ERROR_CODES.INVALID_REGISTRATION,
                message: APP_ERRORS[APP_ERROR_CODES.INVALID_REGISTRATION],
            });
        }
        return app;
    }

    async markOnline(appId: string, systemInfo: { hostname?: string; osPlatform?: string; osRelease?: string }) {
        await this.repo.markOnline(appId, systemInfo);
    }

    async heartbeat(appId: string, metrics: Record<string, unknown>) {
        await this.repo.heartbeat(appId, metrics);
    }

    async markOffline(appId: string) {
        await this.repo.markOffline(appId);
    }
}
