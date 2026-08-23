import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // MUHIM: bu guard `app.useGlobalGuards(...)` bilan GLOBAL ro'yxatdan
    // o'tgan — demak HTTP controller'lar bilan bir qatorda WS gateway
    // handler'lari (`@SubscribeMessage`) uchun ham ishga tushadi.
    // `context.switchToHttp().getRequest()` WS context'da Express
    // `Request emas`, balki xabarning xom payload'ini (masalan
    // `{appId, cols, rows}`) qaytaradi — uning `.header()` metodi yo'q.
    // API_KEY o'rnatilgach, bu QAYSI xabar bo'lishidan qat'iy nazar
    // (`register`, `terminal:open`, ...) `TypeError: req.header is not
    // a function` bilan yiqilib, butun real-time terminal/agent tizimini
    // ishlatmay qo'yar edi. WS gateway'larning o'z autentifikatsiyasi bor
    // (TerminalGateway — JWT handshake, AgentsGateway —
    // registrationToken), shuning uchun bu guard faqat HTTP so'rovlarga
    // tegishli bo'lishi kerak.
    if (context.getType() !== 'http') return true;

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
