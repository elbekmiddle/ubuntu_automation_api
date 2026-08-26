import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  FleetRun,
  FleetRunTarget,
  FleetRunTargetStatus,
  FleetRunWithTargets,
} from './fleet-runs.types';

@Injectable()
export class FleetRunsRepository {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Fleet run + barcha target qatorlarini bitta tranzaksiyada yaratadi.
   * `targets` — har biri `{ appId, appName }`; job hali yaratilmagan
   * bo'lsa `jobId: null`, offline device'lar uchun `status: 'offline'`
   * beriladi (chaqiruvchi tomondan hisoblab kelinadi).
   */
  async createWithTargets(
    userId: string,
    templateId: string,
    templateSlug: string,
    action: string,
    args: Record<string, unknown>,
    targets: Array<{
      appId: string;
      appName: string;
      status: FleetRunTargetStatus;
    }>,
  ): Promise<FleetRunWithTargets> {
    return this.db.transaction(async (client) => {
      const { rows: runRows } = await client.query<FleetRun>(
        `INSERT INTO fleet_runs (user_id, template_id, template_slug, action, args, target_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          userId,
          templateId,
          templateSlug,
          action,
          JSON.stringify(args),
          targets.length,
        ],
      );
      const run = runRows[0];

      const insertedTargets: FleetRunTarget[] = [];
      for (const t of targets) {
        const { rows } = await client.query<FleetRunTarget>(
          `INSERT INTO fleet_run_targets (fleet_run_id, app_id, app_name, status)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [run.id, t.appId, t.appName, t.status],
        );
        insertedTargets.push(rows[0]);
      }

      return { ...run, targets: insertedTargets };
    });
  }

  async attachJob(
    targetId: string,
    jobId: string,
    status: FleetRunTargetStatus,
  ) {
    await this.db.query(
      `UPDATE fleet_run_targets SET job_id = $2, status = $3, updated_at = now() WHERE id = $1`,
      [targetId, jobId, status],
    );
  }

  async markTargetError(targetId: string, message: string) {
    await this.db.query(
      `UPDATE fleet_run_targets SET status = 'error', error_message = $2, updated_at = now() WHERE id = $1`,
      [targetId, message],
    );
  }

  async updateTargetStatus(targetId: string, status: FleetRunTargetStatus) {
    await this.db.query(
      `UPDATE fleet_run_targets SET status = $2, updated_at = now() WHERE id = $1`,
      [targetId, status],
    );
  }

  async markCompleted(runId: string) {
    await this.db.query(
      `UPDATE fleet_runs SET status = 'completed', completed_at = now() WHERE id = $1 AND status != 'completed'`,
      [runId],
    );
  }

  async findAllForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<FleetRun[]> {
    const offset = (Math.max(page, 1) - 1) * limit;
    const { rows } = await this.db.query<FleetRun>(
      `SELECT * FROM fleet_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return rows;
  }

  async findOneForUser(
    userId: string,
    id: string,
  ): Promise<FleetRunWithTargets | null> {
    const { rows: runRows } = await this.db.query<FleetRun>(
      `SELECT * FROM fleet_runs WHERE id = $1 AND user_id = $2`,
      [id, userId],
    );
    const run = runRows[0];
    if (!run) return null;

    const { rows: targets } = await this.db.query<FleetRunTarget>(
      `SELECT * FROM fleet_run_targets WHERE fleet_run_id = $1 ORDER BY created_at ASC`,
      [id],
    );

    return { ...run, targets };
  }

  /**
   * Berilgan target'larga tegishli job'larning ENG SO'NGGI statusini
   * `jobs` jadvalidan olib, `fleet_run_targets`ga sinxronlaydi. `GET
   * /fleet-runs/:id` chaqirilganda ishlatiladi — alohida background
   * poller/worker kerak emas, "on read" yangilanadi.
   */
  async syncTargetStatusesFromJobs(
    targets: FleetRunTarget[],
  ): Promise<FleetRunTarget[]> {
    const jobIds = targets
      .filter(
        (t) => t.job_id && t.status !== 'success' && t.status !== 'failed',
      )
      .map((t) => t.job_id as string);
    if (jobIds.length === 0) return targets;

    const { rows: jobs } = await this.db.query<{ id: string; status: string }>(
      `SELECT id, status FROM jobs WHERE id = ANY($1::uuid[])`,
      [jobIds],
    );
    const statusByJobId = new Map(jobs.map((j) => [j.id, j.status]));

    const updated: FleetRunTarget[] = [];
    for (const t of targets) {
      const latest = t.job_id ? statusByJobId.get(t.job_id) : undefined;
      if (
        latest &&
        latest !== t.status &&
        ['pending', 'running', 'success', 'failed'].includes(latest)
      ) {
        await this.updateTargetStatus(t.id, latest as FleetRunTargetStatus);
        updated.push({ ...t, status: latest as FleetRunTargetStatus });
      } else {
        updated.push(t);
      }
    }
    return updated;
  }
}
