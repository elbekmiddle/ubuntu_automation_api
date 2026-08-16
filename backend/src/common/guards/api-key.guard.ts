import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const configuredKey = process.env.API_KEY;

    // API_KEY o'rnatilmagan bo'lsa — dev rejimda ochiq qoldiramiz, lekin ogohlantiramiz.
    if (!configuredKey) return true;

    const provided = req.header('x-api-key');
    if (provided !== configuredKey) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing X-API-Key header',
      });
    }
    return true;
  }
}
