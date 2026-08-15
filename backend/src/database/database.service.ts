import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
    private readonly pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
    });

    async query<T extends QueryResultRow = any>(
        sql: string,
        params: any[] = [],
    ): Promise<QueryResult<T>> {
        return this.pool.query<T>(sql, params);
    }

    async transaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await fn(client);
            await client.query('COMMIT');
            return result;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    onModuleDestroy() {
        return this.pool.end();
    }
}