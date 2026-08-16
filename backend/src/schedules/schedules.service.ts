import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DatabaseService } from '../database/database.service';
import { TemplatesService } from '../templates/templates.service';

export interface Schedule {
    id: string;
    template_id: string;
    action: string;
    cron: string;
    args: Record<string, unknown>;
    enabled: boolean;
    bullmq_job_key: string | null;
    device_id: string | null;
    created_at: Date;
    updated_at: Date;
}

const CRON_RE = /^(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)\s+(\*|[0-9,\-*/]+)$/;

@Injectable()
export class SchedulesService {
    private readonly logger = new Logger(SchedulesService.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly templatesService: TemplatesService,
        @InjectQueue('schedule-trigger') private readonly scheduleQueue: Queue,
    ) {}

    private schedulerId(scheduleId: string) {
        return `schedule:${scheduleId}`;
    }

    async create(templateSlug: string, action: string, cron: string, args: Record<string, unknown> = {}, deviceId: string | null = null): Promise<Schedule> {
        if (!CRON_RE.test(cron)) {
            throw new BadRequestException('Cron ifodasi noto\'g\'ri — "minut soat kun oy hafta" formatida bo\'lishi kerak (masalan "0 3 * * *")');
        }

        const template = await this.templatesService.findBySlug(templateSlug);
        if (!template.actions.includes(action)) {
            throw new BadRequestException(`Action "${action}" template "${templateSlug}"da mavjud emas`);
        }

        const { rows } = await this.db.query<Schedule>(
            `INSERT INTO schedules (template_id, action, cron, args, device_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [template.id, action, cron, JSON.stringify(args), deviceId],
        );
        const schedule = rows[0];

        await this.scheduleQueue.upsertJobScheduler(
            this.schedulerId(schedule.id),
            { pattern: cron },
            { name: 'trigger', data: { scheduleId: schedule.id } },
        );

        this.logger.log(`Created schedule ${schedule.id} for ${templateSlug}/${action} (${cron})`);
        return schedule;
    }

    async findAll(): Promise<Schedule[]> {
        const { rows } = await this.db.query<Schedule>(
            `SELECT s.*, t.slug AS template_slug, t.name AS template_name
             FROM schedules s JOIN templates t ON t.id = s.template_id
             ORDER BY s.created_at DESC`,
        );
        return rows;
    }

    async findOne(id: string): Promise<Schedule> {
        const { rows } = await this.db.query<Schedule>(`SELECT * FROM schedules WHERE id = $1`, [id]);
        if (!rows[0]) throw new NotFoundException(`Schedule "${id}" not found`);
        return rows[0];
    }

    async setEnabled(id: string, enabled: boolean): Promise<Schedule> {
        const schedule = await this.findOne(id);

        if (enabled) {
            await this.scheduleQueue.upsertJobScheduler(
                this.schedulerId(id),
                { pattern: schedule.cron },
                { name: 'trigger', data: { scheduleId: id } },
            );
        } else {
            await this.scheduleQueue.removeJobScheduler(this.schedulerId(id));
        }

        const { rows } = await this.db.query<Schedule>(
            `UPDATE schedules SET enabled = $2, updated_at = now() WHERE id = $1 RETURNING *`,
            [id, enabled],
        );
        return rows[0];
    }

    async remove(id: string): Promise<{ removed: true; id: string }> {
        await this.findOne(id); // 404 agar topilmasa
        await this.scheduleQueue.removeJobScheduler(this.schedulerId(id));
        await this.db.query(`DELETE FROM schedules WHERE id = $1`, [id]);
        this.logger.log(`Removed schedule ${id}`);
        return { removed: true, id };
    }
}
