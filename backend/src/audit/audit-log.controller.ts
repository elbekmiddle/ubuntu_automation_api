import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
export class AuditLogController {
    constructor(private readonly auditLog: AuditLogService) {}

    @Get()
    findRecent(@Query('limit') limit?: string, @Query('all') all?: string, @Req() req?: Request) {
        const n = Number(limit) || 50;
        // Default: faqat shu brauzer/qurilmaga oid loglar. ?all=true bersa —
        // butun server (barcha qurilmalar) ko'rinadi.
        if (all === 'true' || !req?.deviceId) {
            return this.auditLog.findRecent(n);
        }
        return this.auditLog.findRecentForDevice(req.deviceId, n);
    }
}
