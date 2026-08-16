import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface Device {
    id: string;
    ip: string;
    user_agent: string | null;
    first_seen: Date;
    last_seen: Date;
    request_count: number;
}

@Injectable()
export class DevicesService {
    constructor(private readonly db: DatabaseService) {}

    /**
     * Har bir so'rovda chaqiriladi — IP+user-agent kombinatsiyasi bo'yicha
     * device'ni topadi yoki yaratadi, va last_seen/request_count'ni yangilaydi.
     */
    async touch(ip: string, userAgent: string | null): Promise<Device> {
        const { rows } = await this.db.query<Device>(
            `INSERT INTO devices (ip, user_agent)
             VALUES ($1, $2)
             ON CONFLICT (ip, user_agent) DO UPDATE SET
                 last_seen = now(),
                 request_count = devices.request_count + 1
             RETURNING *`,
            [ip, userAgent],
        );
        return rows[0];
    }

    async findAll(): Promise<Device[]> {
        const { rows } = await this.db.query<Device>(
            `SELECT * FROM devices ORDER BY last_seen DESC LIMIT 200`,
        );
        return rows;
    }

    async countActive(withinMinutes = 5): Promise<number> {
        const { rows } = await this.db.query<{ count: string }>(
            `SELECT COUNT(*)::int AS count FROM devices WHERE last_seen > now() - ($1 || ' minutes')::interval`,
            [withinMinutes],
        );
        return Number(rows[0]?.count ?? 0);
    }
}
