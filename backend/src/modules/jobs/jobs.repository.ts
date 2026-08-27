import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Job } from './jobs.types';

// `apps`dagi bilan bir xil naqsh: bu userga "ko'rinadigan" job'lar — o'zi
// yaratgan (`user_id`) YOKI a'zo bo'lgan tashkilotga tegishli
// (`organization_id`, ya'ni shu tashkilotning biror device'iga qarshi
// ishga tushirilgan) bo'lsa.
const VISIBLE_TO_USER_CLAUSE = `(
    jobs.user_id = $1
    OR jobs.organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = $1 AND status = 'active'
    )
)`;

@Injectable()
export class JobsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(
    templateId: string,
    action: string,
    args: Record<string, unknown>,
    appId: string | null = null,
    userId: string | null = null,
    organizationId: string | null = null,
  ): Promise<Job> {
    const { rows } = await this.db.query<Job>(
      `INSERT INTO jobs (template_id, action, args, status, app_id, user_id, organization_id)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING *`,
      [templateId, action, JSON.stringify(args), appId, userId, organizationId],
    );
    return rows[0];
  }

  /** Ownership tekshiruvisiz — faqat AgentsGateway/JobsProcessor kabi ichki callback'lar uchun (jobId allaqachon ma'lum). */
  async findById(id: string): Promise<Job | null> {
    const { rows } = await this.db.query<Job>(
      `SELECT * FROM jobs WHERE id = $1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async findByIdForUser(userId: string, id: string): Promise<Job | null> {
    const { rows } = await this.db.query<Job>(
      `SELECT DISTINCT jobs.* FROM jobs WHERE jobs.id = $2 AND ${VISIBLE_TO_USER_CLAUSE}`,
      [userId, id],
    );
    return rows[0] ?? null;
  }

  async findAllForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<Job[]> {
    const { rows } = await this.db.query<Job>(
      `SELECT DISTINCT jobs.* FROM jobs
       WHERE ${VISIBLE_TO_USER_CLAUSE}
       ORDER BY jobs.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return rows;
  }

  async countForUser(userId: string): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(DISTINCT jobs.id)::int AS count FROM jobs WHERE ${VISIBLE_TO_USER_CLAUSE}`,
      [userId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async markRunning(id: string, pid: number) {
    await this.db.query(
      `UPDATE jobs SET status = 'running', pid = $2, started_at = now() WHERE id = $1`,
      [id, pid],
    );
  }

  /** Masofaviy (agent orqali) job — local pid yo'q, faqat statusni yangilaymiz. */
  async markDispatched(id: string) {
    await this.db.query(
      `UPDATE jobs SET status = 'running', started_at = now() WHERE id = $1`,
      [id],
    );
  }

  async markFinished(
    id: string,
    status: 'success' | 'failed',
    exitCode: number | null,
  ) {
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
    const { rows } = await this.db.query<{
      stream: 'stdout' | 'stderr';
      chunk: string;
      created_at: Date;
    }>(
      `SELECT stream, chunk, created_at FROM job_logs WHERE job_id = $1 ORDER BY id ASC`,
      [jobId],
    );
    return rows;
  }
}
