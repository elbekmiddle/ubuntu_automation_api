import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

export interface FleetRunRow {
    id: string;
    template_id: string;
    action: string;
    args: Record<string, unknown>;
    device_filter: Record<string, unknown>;
    created_by: string;
    created_at: Date;
}

export type DispatchStatus = 'dispatched' | 'offline' | 'error';

export interface FleetRunTargetRow {
    id: string;
    fleet_run_id: string;
    app_id: string;
    job_id: string | null;
    dispatch_status: DispatchStatus;
    error: string | null;
    created_at: Date;
}

/** `GET /fleet-runs/:id` uchun — target'lar jobs jadvali bilan LIVE JOIN qilingan. */
export interface FleetRunTargetWithStatus extends FleetRunTargetRow {
    app_name: string;
    // dispatch_status === 'dispatched' bo'lsa jobs.status shu yerda,
    // aks holda NULL (job umuman yaratilmagan).
    job_status: 'pending' | 'running' | 'success' | 'failed' | null;
    exit_code: number | null;
}

@Injectable()
export class FleetRepository {
    constructor(private readonly db: DatabaseService) {}

    async createRun(
        templateId: string,
        action: string,
        args: Record<string, unknown>,
        deviceFilter: Record<string, unknown>,
        createdBy: string,
    ): Promise<FleetRunRow> {
        const { rows } = await this.db.query<FleetRunRow>(
            `INSERT INTO fleet_runs (template_id, action, args, device_filter, created_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [templateId, action, JSON.stringify(args), JSON.stringify(deviceFilter), createdBy],
        );
        return rows[0];
    }

    async addTarget(
        fleetRunId: string,
        appId: string,
        jobId: string | null,
        dispatchStatus: DispatchStatus,
        error: string | null,
    ): Promise<FleetRunTargetRow> {
        const { rows } = await this.db.query<FleetRunTargetRow>(
            `INSERT INTO fleet_run_targets (fleet_run_id, app_id, job_id, dispatch_status, error)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [fleetRunId, appId, jobId, dispatchStatus, error],
        );
        return rows[0];
    }

    async findRunById(id: string): Promise<FleetRunRow | null> {
        const { rows } = await this.db.query<FleetRunRow>(`SELECT * FROM fleet_runs WHERE id = $1`, [id]);
        return rows[0] ?? null;
    }

    async findRunsForUser(userId: string, limit = 30): Promise<(FleetRunRow & { template_name: string; target_count: number })[]> {
        const { rows } = await this.db.query(
            `SELECT fr.*, t.name AS template_name,
                    (SELECT COUNT(*) FROM fleet_run_targets WHERE fleet_run_id = fr.id)::int AS target_count
             FROM fleet_runs fr
             JOIN templates t ON t.id = fr.template_id
             WHERE fr.created_by = $1
             ORDER BY fr.created_at DESC
             LIMIT $2`,
            [userId, limit],
        );
        return rows;
    }

    /** Progress bar shu bilan poll qilinadi — job'larning JONLI holati bilan birga. */
    async findTargetsWithStatus(fleetRunId: string): Promise<FleetRunTargetWithStatus[]> {
        const { rows } = await this.db.query(
            `SELECT frt.*, a.name AS app_name, j.status AS job_status, j.exit_code
             FROM fleet_run_targets frt
             JOIN apps a ON a.id = frt.app_id
             LEFT JOIN jobs j ON j.id = frt.job_id
             WHERE frt.fleet_run_id = $1
             ORDER BY a.name ASC`,
            [fleetRunId],
        );
        return rows;
    }
}
