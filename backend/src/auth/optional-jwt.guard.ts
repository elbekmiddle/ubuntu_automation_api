import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

/**
 * JwtAuthGuard'dan farqli o'laroq bu guard hech qachon so'rovni to'xtatmaydi.
 * Agar to'g'ri Bearer token kelsa — req.userId'ni to'ldiradi (masalan template
 * egasini aniqlash uchun), aks holda so'rov baribir anonim sifatida davom etadi.
 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const authHeader = req.header('authorization');
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (token) {
            try {
                const payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
                req.userId = payload.sub;
                req.userEmail = payload.email;
            } catch {
                // Yaroqsiz token — jim o'tkazib yuboramiz, so'rov baribir anonim davom etadi
            }
        }

        return true;
    }
}
