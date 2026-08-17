import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface User {
    id: string;
    email: string;
    password_hash: string;
    name: string | null;
    created_at: Date;
    updated_at: Date;
}

@Injectable()
export class UsersRepository {
    constructor(private readonly db: DatabaseService) {}

    async findByEmail(email: string): Promise<User | null> {
        const { rows } = await this.db.query<User>(`SELECT * FROM users WHERE email = $1`, [
            email.toLowerCase(),
        ]);
        return rows[0] ?? null;
    }

    async findById(id: string): Promise<User | null> {
        const { rows } = await this.db.query<User>(`SELECT * FROM users WHERE id = $1`, [id]);
        return rows[0] ?? null;
    }

    async create(email: string, passwordHash: string, name: string | null): Promise<User> {
        const { rows } = await this.db.query<User>(
            `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *`,
            [email.toLowerCase(), passwordHash, name],
        );
        return rows[0];
    }
}
