import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DevicesService } from './devices.service';

// Express'da `req.ip` ni proxy orqasida to'g'ri olish uchun main.ts'da
// `app.set('trust proxy', ...)` sozlanishi kerak (reverse proxy bo'lsa).
export function resolveClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

declare module 'express-serve-static-core' {
    interface Request {
        deviceId?: string;
        clientIp?: string;
    }
}

@Injectable()
export class DeviceTrackingMiddleware implements NestMiddleware {
    constructor(private readonly devices: DevicesService) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const ip = resolveClientIp(req);
        req.clientIp = ip;

        try {
            const device = await this.devices.touch(ip, req.headers['user-agent'] ?? null);
            req.deviceId = device.id;
        } catch {
            // Device tracking ishlamasa ham asosiy so'rov to'xtab qolmasin
        }

        next();
    }
}
