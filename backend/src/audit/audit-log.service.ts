import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface AuditLogEntry {
    deviceId: string | null;
    ip: string;
    method: string;
    path: string;
    action: string;
    resourceType?: string;
    resourceId?: string | string[];
    statusCode?: number;
    metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
    constructor(private readonly db: DatabaseService) {}

    async record(entry: AuditLogEntry) {
        await this.db.query(
            `INSERT INTO audit_logs (device_id, ip, method, path, action, resource_type, resource_id, status_code, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                entry.deviceId,
                entry.ip,
                entry.method,
                entry.path,
                entry.action,
                entry.resourceType ?? null,
                Array.isArray(entry.resourceId) ? entry.resourceId[0] ?? null : entry.resourceId ?? null,
                entry.statusCode ?? null,
                JSON.stringify(entry.metadata ?? {}),
            ],
        );
    }

    async findRecent(limit = 50) {
        const { rows } = await this.db.query(
            `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
            [Math.min(limit, 200)],
        );
        return rows;
    }

    async findForResource(resourceType: string, resourceId: string) {
        const { rows } = await this.db.query(
            `SELECT * FROM audit_logs WHERE resource_type = $1 AND resource_id = $2 ORDER BY created_at DESC`,
            [resourceType, resourceId],
        );
        return rows;
    }
}
