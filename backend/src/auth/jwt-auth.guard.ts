import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AUTH_ERROR_CODES, AUTH_ERRORS } from '../config/errors/auth-error-code';

declare module 'express-serve-static-core' {
    interface Request {
        userId?: string;
        userEmail?: string;
    }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const req = context.switchToHttp().getRequest<Request>();
        const authHeader = req.header('authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!token) {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODES.MISSING_TOKEN,
                message: AUTH_ERRORS[AUTH_ERROR_CODES.MISSING_TOKEN],
            });
        }

        try {
            const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
            req.userId = payload.sub;
            req.userEmail = payload.email;
            return true;
        } catch {
            throw new UnauthorizedException({
                code: AUTH_ERROR_CODES.INVALID_ACCESS_TOKEN,
                message: AUTH_ERRORS[AUTH_ERROR_CODES.INVALID_ACCESS_TOKEN],
            });
        }
    }
}
