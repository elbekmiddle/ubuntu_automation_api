import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from './audit-log.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Path'dan resource turini taxmin qiladi: /templates/:id/files/:name -> 'template'
function guessResourceType(path: string): string | undefined {
    if (path.startsWith('/jobs')) return 'job';
    if (path.startsWith('/templates')) {
        if (path.includes('/files')) return 'file';
        if (path.includes('/versions')) return 'template-version';
        if (path.includes('/visibility')) return 'template-visibility';
        return 'template';
    }
    if (path.startsWith('/schedules')) return 'schedule';
    if (path.startsWith('/devices')) return 'device';
    if (path.startsWith('/auth')) return 'auth';
    return undefined;
}

function guessAction(method: string, path: string): string {
    const resource = guessResourceType(path) ?? 'unknown';
    const verb = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' }[method] ?? method.toLowerCase();
    return `${resource}.${verb}`;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(private readonly auditLog: AuditLogService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();

        if (!MUTATING_METHODS.has(req.method)) {
            return next.handle();
        }

        return next.handle().pipe(
            tap({
                next: (body: unknown) => {
                    const resourceId =
                        req.params?.id ?? (body as { id?: string } | undefined)?.id ?? undefined;

                    this.auditLog
                        .record({
                            deviceId: req.deviceId ?? null,
                            userId: req.userId ?? null,
                            ip: req.clientIp ?? req.ip ?? 'unknown',
                            method: req.method,
                            path: req.route?.path ?? req.path,
                            action: guessAction(req.method, req.path),
                            resourceType: guessResourceType(req.path),
                            resourceId,
                            statusCode: res.statusCode,
                        })
                        .catch(() => {
                            // Audit log yozilmasa ham asosiy so'rov muvaffaqiyatli qaytishi kerak
                        });
                },
                error: (err: { status?: number }) => {
                    this.auditLog
                        .record({
                            deviceId: req.deviceId ?? null,
                            userId: req.userId ?? null,
                            ip: req.clientIp ?? req.ip ?? 'unknown',
                            method: req.method,
                            path: req.route?.path ?? req.path,
                            action: guessAction(req.method, req.path),
                            resourceType: guessResourceType(req.path),
                            resourceId: req.params?.id,
                            statusCode: err?.status ?? 500,
                        })
                        .catch(() => {});
                },
            }),
        );
    }
}
