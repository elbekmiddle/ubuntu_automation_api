import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface AppRow {
  id: string;
  user_id: string;
  name: string;
  registration_token_hash: string;
  status: 'offline' | 'online';
  permission: 'read_only' | 'read_write';
  machine_id: string | null;
  last_seen_at: Date | null;
  hostname: string | null;
  os_platform: string | null;
  os_release: string | null;
  last_metrics: Record<string, unknown>;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AppsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(
    userId: string,
    name: string,
    registrationTokenHash: string,
    permission: 'read_only' | 'read_write' = 'read_write',
    machineId: string | null = null,
  ): Promise<AppRow> {
    const { rows } = await this.db.query<AppRow>(
      `INSERT INTO apps (user_id, name, registration_token_hash, permission, machine_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, name, registrationTokenHash, permission, machineId],
    );
    return rows[0];
  }

  async findByUserAndMachineId(
    userId: string,
    machineId: string,
  ): Promise<AppRow | null> {
    const { rows } = await this.db.query<AppRow>(
      `SELECT * FROM apps WHERE user_id = $1 AND machine_id = $2`,
      [userId, machineId],
    );
    return rows[0] ?? null;
  }

  /** Reconnect paytida — yangi registration token, nom va permission bilan yangilaydi. */
  async rotateToken(
    id: string,
    registrationTokenHash: string,
    name: string,
    permission: 'read_only' | 'read_write',
  ): Promise<AppRow> {
    const { rows } = await this.db.query<AppRow>(
      `UPDATE apps SET registration_token_hash = $2, name = $3, permission = $4, updated_at = now()
             WHERE id = $1 RETURNING *`,
      [id, registrationTokenHash, name, permission],
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
    const { rows } = await this.db.query<AppRow>(
      `SELECT * FROM apps WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      `DELETE FROM apps WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    return (rowCount ?? 0) > 0;
  }

  async markOnline(
    id: string,
    systemInfo: { hostname?: string; osPlatform?: string; osRelease?: string },
  ) {
    await this.db.query(
      `UPDATE apps SET status = 'online', last_seen_at = now(),
                hostname = COALESCE($2, hostname),
                os_platform = COALESCE($3, os_platform),
                os_release = COALESCE($4, os_release),
                updated_at = now()
             WHERE id = $1`,
      [
        id,
        systemInfo.hostname ?? null,
        systemInfo.osPlatform ?? null,
        systemInfo.osRelease ?? null,
      ],
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
    await this.db.query(
      `UPDATE apps SET status = 'offline', updated_at = now() WHERE id = $1`,
      [id],
    );
  }

  async setTags(
    userId: string,
    id: string,
    tags: string[],
  ): Promise<AppRow | null> {
    const { rows } = await this.db.query<AppRow>(
      `UPDATE apps SET tags = $3, updated_at = now() WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId, tags],
    );
    return rows[0] ?? null;
  }

  /**
   * Target selector — fleet automation'ning "qaysi device'larda ishga
   * tushirilsin" savoliga javob beradi. `platform` va `tags` filtrlari
   * OR emas AND mantig'ida qo'shiladi (masalan platform=linux + tag=prod
   * — ikkalasiga ham mos kelishi kerak); `tags` ro'yxatining o'zi ichida
   * esa OR (device shu teglardan KAMIDA bittasiga ega bo'lsa yetarli —
   * `&&` operatori). `online` — `withComputedStatus` bilan bir xil
   * "so'nggi 60s ichida heartbeat kelganmi" mantig'ini SQL darajasida
   * takrorlaydi, chunki bu katta flotalarda Node ichida filtrlashdan
   * ko'ra database'da filtrlash ancha arzon.
   */
  async findMatchingForUser(
    userId: string,
    selector: { platform?: string[]; tags?: string[]; online?: boolean },
  ): Promise<AppRow[]> {
    const conditions: string[] = ['user_id = $1'];
    const params: unknown[] = [userId];

    if (selector.platform?.length) {
      params.push(selector.platform);
      conditions.push(`os_platform = ANY($${params.length}::text[])`);
    }

    if (selector.tags?.length) {
      params.push(selector.tags);
      conditions.push(`tags && $${params.length}::text[]`);
    }

    if (selector.online === true) {
      conditions.push(
        `status = 'online' AND last_seen_at > now() - interval '60 seconds'`,
      );
    } else if (selector.online === false) {
      conditions.push(
        `(status = 'offline' OR last_seen_at <= now() - interval '60 seconds' OR last_seen_at IS NULL)`,
      );
    }

    const { rows } = await this.db.query<AppRow>(
      `SELECT * FROM apps WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      params,
    );
    return rows;
  }
}
