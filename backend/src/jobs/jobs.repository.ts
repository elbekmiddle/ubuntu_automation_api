import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Job } from './jobs.types';

@Injectable()
export class JobsRepository {
    constructor(private readonly db: DatabaseService) {}

    async create(templateId: string, action: string, args: Record<string, unknown>): Promise<Job> {
        const { rows } = await this.db.query<Job>(
            `INSERT INTO jobs (template_id, action, args, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
            [templateId, action, JSON.stringify(args)],
        );
        return rows[0];
    }

    async findById(id: string): Promise<Job | null> {
        const { rows } = await this.db.query<Job>(`SELECT * FROM jobs WHERE id = $1`, [id]);
        return rows[0] ?? null;
    }
    async findBySlug(slug: string): Promise<Job | null> {
        const { rows } = await this.db.query<Job>(`SELECT * FROM jobs WHERE slug = $1`, [slug]);
        return rows[0] ?? null;
    }

    async findAll(): Promise<Job[]> {
        const { rows } = await this.db.query<Job>(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100`);
        return rows;
    }

    async markRunning(id: string, pid: number) {
        await this.db.query(
            `UPDATE jobs SET status = 'running', pid = $2, started_at = now() WHERE id = $1`,
            [id, pid],
        );
    }

    async markFinished(id: string, status: 'success' | 'failed', exitCode: number | null) {
        await this.db.query(
            `UPDATE jobs SET status = $2, exit_code = $3, finished_at = now() WHERE id = $1`,
            [id, status, exitCode],
        );
    }

    async appendLog(jobId: string, stream: 'stdout' | 'stderr', chunk: string) {
        await this.db.query(
            `INSERT INTO job_logs (job_id, stream, chunk) VALUES ($1, $2, $3)`,
            [jobId, stream, chunk],
        );
    }

    async findLogs(jobId: string) {
        const { rows } = await this.db.query(
            `SELECT stream, chunk, created_at FROM job_logs WHERE job_id = $1 ORDER BY id ASC`,
            [jobId],
        );
        return rows;
    }
}