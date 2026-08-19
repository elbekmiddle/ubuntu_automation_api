import {
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';

import { AppsRepository } from './apps.repository';
import {
    APP_ERROR_CODES,
    APP_ERRORS,
} from '../config/errors/apps-error-code';

function hashToken(token: string): string {
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

function generateRegistrationToken(): string {
    return `app_reg_${crypto
        .randomBytes(32)
        .toString('hex')}`;
}

const STALE_AFTER_MS = 60_000;

function withComputedStatus<
    T extends {
        status: string;
        last_seen_at: Date | null;
    },
>(app: T) {
    const isRecentlyAlive =
        app.last_seen_at != null &&
        Date.now() -
        new Date(app.last_seen_at).getTime() <
        STALE_AFTER_MS;

    return {
        ...app,

        status:
            app.status === 'online' &&
            !isRecentlyAlive
                ? 'offline'
                : app.status,
    };
}

@Injectable()
export class AppsService {
    private readonly logger =
        new Logger(AppsService.name);

    constructor(
        private readonly repo: AppsRepository,
    ) {}

    async create(
        userId: string,
        name: string,
        permission:
            | 'read_only'
            | 'read_write' = 'read_write',
    ) {
        const registrationToken =
            generateRegistrationToken();

        const app = await this.repo.create(
            userId,
            name,
            hashToken(registrationToken),
            permission,
        );

        this.logger.log(
            `Created app "${name}" (${permission}) for user ${userId}`,
        );

        return {
            app,
            registrationToken,
        };
    }

    async findAllForUser(
        userId: string,
    ) {
        const apps =
            await this.repo.findAllForUser(
                userId,
            );

        return apps.map(withComputedStatus);
    }

    async findOneForUser(
        userId: string,
        id: string,
    ) {
        const app =
            await this.repo.findByIdForUser(
                userId,
                id,
            );

        if (!app) {
            throw new NotFoundException({
                code: APP_ERROR_CODES.NOT_FOUND,
                message:
                    `${APP_ERRORS[APP_ERROR_CODES.NOT_FOUND]}: "${id}"`,
            });
        }

        return withComputedStatus(app);
    }

    async remove(
        userId: string,
        id: string,
    ) {
        const removed =
            await this.repo.remove(
                userId,
                id,
            );

        if (!removed) {
            throw new NotFoundException({
                code: APP_ERROR_CODES.NOT_FOUND,
                message:
                    `${APP_ERRORS[APP_ERROR_CODES.NOT_FOUND]}: "${id}"`,
            });
        }

        return {
            removed: true,
        };
    }

    /**
     * Authenticate agent using registration token.
     */
    async authenticateAgent(
        appId: string,
        registrationToken: string,
    ) {
        const app =
            await this.repo.findById(
                appId,
            );

        if (
            !app ||
            app.registration_token_hash !==
            hashToken(registrationToken)
        ) {
            throw new ForbiddenException({
                code:
                APP_ERROR_CODES.INVALID_REGISTRATION,
                message:
                    APP_ERRORS[
                        APP_ERROR_CODES
                            .INVALID_REGISTRATION
                        ],
            });
        }

        return app;
    }

    async markOnline(
        appId: string,
        systemInfo: {
            hostname?: string;
            osPlatform?: string;
            osRelease?: string;
        },
    ) {
        await this.repo.markOnline(
            appId,
            systemInfo,
        );
    }

    async heartbeat(
        appId: string,
        metrics: Record<string, unknown>,
    ) {
        await this.repo.heartbeat(
            appId,
            metrics,
        );
    }

    async markOffline(
        appId: string,
    ) {
        await this.repo.markOffline(
            appId,
        );
    }

    async getSystem(
        userId: string,
        appId: string,
    ) {
        const app =
            await this.repo.findByIdForUser(
                userId,
                appId,
            );

        if (!app) {
            throw new NotFoundException({
                code: APP_ERROR_CODES.NOT_FOUND,
                message:
                    `${APP_ERRORS[APP_ERROR_CODES.NOT_FOUND]}: "${appId}"`,
            });
        }

        const metrics =
            app.last_metrics ?? {};

        return {
            app: {
                id: app.id,
                name: app.name,
                status:
                withComputedStatus(app)
                    .status,
                hostname: app.hostname,
                os_platform:
                app.os_platform,
                os_release:
                app.os_release,
                last_seen_at:
                app.last_seen_at,
            },

            ...metrics,
        };
    }
}