import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface AppRow {
    id: string;
    user_id: string;
    name: string;
    registration_token_hash: string;
    status: 'offline' | 'online';
    last_seen_at: Date | null;
    hostname: string | null;
    os_platform: string | null;
    os_release: string | null;
    last_metrics: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}

@Injectable()
export class AppsRepository {
    constructor(private readonly db: DatabaseService) {}

    async create(userId: string, name: string, registrationTokenHash: string): Promise<AppRow> {
        const { rows } = await this.db.query<AppRow>(
            `INSERT INTO apps (user_id, name, registration_token_hash)
             VALUES ($1, $2, $3) RETURNING *`,
            [userId, name, registrationTokenHash],
        );
        return rows[0];
    }

    async findAllForUser(userId: string): Promise<AppRow[]> {
        const { rows } = await this.db.query<AppRow>(
            `SELECT * FROM apps WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId],
        );
        return rows;
    }

    async findByIdForUser(userId: string, id: string): Promise<AppRow | null> {
        const { rows } = await this.db.query<AppRow>(
            `SELECT * FROM apps WHERE id = $1 AND user_id = $2`,
            [id, userId],
        );
        return rows[0] ?? null;
    }

    async findByTokenHash(tokenHash: string): Promise<AppRow | null> {
        const { rows } = await this.db.query<AppRow>(
            `SELECT * FROM apps WHERE registration_token_hash = $1`,
            [tokenHash],
        );
        return rows[0] ?? null;
    }

    async findById(id: string): Promise<AppRow | null> {
        const { rows } = await this.db.query<AppRow>(`SELECT * FROM apps WHERE id = $1`, [id]);
        return rows[0] ?? null;
    }

    async remove(userId: string, id: string): Promise<boolean> {
        const { rowCount } = await this.db.query(`DELETE FROM apps WHERE id = $1 AND user_id = $2`, [
            id,
            userId,
        ]);
        return (rowCount ?? 0) > 0;
    }

    async markOnline(id: string, systemInfo: { hostname?: string; osPlatform?: string; osRelease?: string }) {
        await this.db.query(
            `UPDATE apps SET status = 'online', last_seen_at = now(),
                hostname = COALESCE($2, hostname),
                os_platform = COALESCE($3, os_platform),
                os_release = COALESCE($4, os_release),
                updated_at = now()
             WHERE id = $1`,
            [id, systemInfo.hostname ?? null, systemInfo.osPlatform ?? null, systemInfo.osRelease ?? null],
        );
    }

    async heartbeat(id: string, metrics: Record<string, unknown>) {
        await this.db.query(
            `UPDATE apps SET status = 'online', last_seen_at = now(), last_metrics = $2, updated_at = now()
             WHERE id = $1`,
            [id, JSON.stringify(metrics)],
        );
    }

    async markOffline(id: string) {
        await this.db.query(`UPDATE apps SET status = 'offline', updated_at = now() WHERE id = $1`, [id]);
    }
}
