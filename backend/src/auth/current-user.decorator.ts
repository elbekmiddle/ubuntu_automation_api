import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Handler ichida `@CurrentUser() userId: string` sifatida ishlatiladi. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.userId;
});
