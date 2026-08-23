import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job as BullJob } from 'bullmq';
import { DatabaseService } from '../../database/database.service';
import { TemplatesService } from '../templates/templates.service';
import { JobsService } from '../jobs/jobs.service';

@Processor('schedule-trigger')
export class ScheduleTriggerProcessor extends WorkerHost {
    private readonly logger = new Logger(ScheduleTriggerProcessor.name);

    constructor(
        private readonly db: DatabaseService,
        private readonly templatesService: TemplatesService,
        private readonly jobsService: JobsService,
    ) {
        super();
    }

    async process(bullJob: BullJob<{ scheduleId: string }>): Promise<void> {
        const { scheduleId } = bullJob.data;

        const { rows } = await this.db.query<{
            enabled: boolean;
            action: string;
            args: Record<string, unknown>;
            slug: string;
        }>(
            `SELECT s.enabled, s.action, s.args, t.slug
             FROM schedules s JOIN templates t ON t.id = s.template_id
             WHERE s.id = $1`,
            [scheduleId],
        );
        const schedule = rows[0];

        if (!schedule) {
            this.logger.warn(`Schedule ${scheduleId} no longer exists, skipping trigger`);
            return;
        }
        if (!schedule.enabled) {
            this.logger.log(`Schedule ${scheduleId} is disabled, skipping trigger`);
            return;
        }

        this.logger.log(`Schedule ${scheduleId} fired -> ${schedule.slug}/${schedule.action}`);
        const job = await this.jobsService.enqueue(schedule.slug, schedule.action, schedule.args ?? {});

        await this.db.query(`UPDATE jobs SET schedule_id = $2 WHERE id = $1`, [job.id, scheduleId]);
    }
}
