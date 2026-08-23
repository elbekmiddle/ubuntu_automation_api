import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface RefreshTokenRow {
    id: string;
    user_id: string;
    token_hash: string;
    device_id: string | null;
    expires_at: Date;
    revoked_at: Date | null;
    created_at: Date;
}

@Injectable()
export class RefreshTokensRepository {
    constructor(private readonly db: DatabaseService) {}

    async create(userId: string, tokenHash: string, expiresAt: Date, deviceId: string | null) {
        await this.db.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_id) VALUES ($1, $2, $3, $4)`,
            [userId, tokenHash, expiresAt, deviceId],
        );
    }

    async findValidByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
        const { rows } = await this.db.query<RefreshTokenRow>(
            `SELECT * FROM refresh_tokens
             WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
            [tokenHash],
        );
        return rows[0] ?? null;
    }

    async revoke(tokenHash: string) {
        await this.db.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [
            tokenHash,
        ]);
    }

    async revokeAllForUser(userId: string) {
        await this.db.query(
            `UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
            [userId],
        );
    }
}
