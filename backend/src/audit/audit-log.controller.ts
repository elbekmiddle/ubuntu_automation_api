import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
export class AuditLogController {
    constructor(private readonly auditLog: AuditLogService) {}

    @Get()
    findRecent(@Query('limit') limit?: string) {
        return this.auditLog.findRecent(Number(limit) || 50);
    }
}
