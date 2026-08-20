import {
    BadRequestException,
    forwardRef,
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobsRepository } from './jobs.repository';
import { TemplatesService } from '../templates/templates.service';
import { JobQueuePayload } from './jobs.types';
import { JOB_ERROR_CODES, JOB_ERRORS } from '../config/errors/job-error-code';
import { AppsService } from '../apps/apps.service';
import { AgentsGateway } from '../apps/agents.gateway';

@Injectable()
export class JobsService {
    private readonly logger = new Logger(JobsService.name);

    constructor(
        private readonly jobsRepo: JobsRepository,
        private readonly templatesService: TemplatesService,
        @InjectQueue('script-execution') private readonly queue: Queue<JobQueuePayload>,
        @Inject(forwardRef(() => AppsService)) private readonly appsService: AppsService,
        @Inject(forwardRef(() => AgentsGateway)) private readonly agentsGateway: AgentsGateway,
    ) {}

    async enqueue(templateSlug: string, action: string, args: Record<string, unknown> = {}, appId?: string | null) {
        if (!templateSlug?.trim()) {
            throw new BadRequestException({
                code: JOB_ERROR_CODES.TEMPLATE_SLUG_REQUIRED,
                message: JOB_ERRORS[JOB_ERROR_CODES.TEMPLATE_SLUG_REQUIRED],
            });
        }

        if (!action?.trim()) {
            throw new BadRequestException({
                code: JOB_ERROR_CODES.ACTION_REQUIRED,
                message: JOB_ERRORS[JOB_ERROR_CODES.ACTION_REQUIRED],
            });
        }

        // findBySlug already throws TEMPLATE_NOT_FOUND with the right code
        const template = await this.templatesService.findBySlug(templateSlug);

        if (!template.actions.includes(action)) {
            throw new NotFoundException({
                code: JOB_ERROR_CODES.ACTION_NOT_FOUND,
                message: `${JOB_ERRORS[JOB_ERROR_CODES.ACTION_NOT_FOUND]}: "${action}"`,
            });
        }

        // appId berilgan bo'lsa — job Agent orqali (masofaviy mashinada) ishlaydi.
        // Bo'lmasa — avvalgidek, backend'ning o'zida (BullMQ + local spawn).
        if (appId) {
            return this.enqueueRemote(template.id, template.slug, action, args, appId);
        }

        try {
            const job = await this.jobsRepo.create(template.id, action, args, null);

            await this.queue.add('run-script', {
                jobId: job.id,
                templatePath: template.path,
                action,
                args,
            });

            this.logger.log(`Enqueued job ${job.id} (${template.slug} -> ${action}) [local]`);

            return job;
        } catch (error) {
            this.logger.error(
                `Failed to enqueue job for "${templateSlug}" -> "${action}"`,
                error instanceof Error ? error.stack : String(error),
            );

            throw new HttpException(
                {
                    code: JOB_ERROR_CODES.ENQUEUE_FAILED,
                    message: JOB_ERRORS[JOB_ERROR_CODES.ENQUEUE_FAILED],
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private async enqueueRemote(
        templateId: string,
        templateSlug: string,
        action: string,
        args: Record<string, unknown>,
        appId: string,
    ) {
        const app = await this.appsService.findByIdInternal(appId);
        if (!app) {
            throw new NotFoundException({
                code: JOB_ERROR_CODES.DEVICE_NOT_FOUND,
                message: JOB_ERRORS[JOB_ERROR_CODES.DEVICE_NOT_FOUND],
            });
        }
        if (app.status !== 'online' || !this.agentsGateway.isAppConnected(appId)) {
            throw new BadRequestException({
                code: JOB_ERROR_CODES.DEVICE_OFFLINE,
                message: JOB_ERRORS[JOB_ERROR_CODES.DEVICE_OFFLINE],
            });
        }

        try {
            const script = await this.templatesService.getActionScript(templateId, action);
            const job = await this.jobsRepo.create(templateId, action, args, appId);
            await this.jobsRepo.markDispatched(job.id);

            this.agentsGateway.dispatchJob(appId, { jobId: job.id, action, script, args });
            this.logger.log(`Enqueued job ${job.id} (${templateSlug} -> ${action}) [remote -> app=${appId}]`);

            return job;
        } catch (error) {
            this.logger.error(
                `Failed to dispatch remote job for "${templateSlug}" -> "${action}" on app ${appId}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw new HttpException(
                {
                    code: JOB_ERROR_CODES.ENQUEUE_FAILED,
                    message: JOB_ERRORS[JOB_ERROR_CODES.ENQUEUE_FAILED],
                },
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async findAll(page = 1, pageSize = 10) {
        const safePage = Math.max(1, page);
        const safePageSize = Math.min(Math.max(1, pageSize), 100); // 100 tadan oshmasin — DoS himoyasi
        const offset = (safePage - 1) * safePageSize;

        const [data, total] = await Promise.all([
            this.jobsRepo.findAll(safePageSize, offset),
            this.jobsRepo.count(),
        ]);

        return {
            data,
            page: safePage,
            pageSize: safePageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / safePageSize)),
        };
    }

    async findOne(id: string) {
        const job = await this.jobsRepo.findById(id);
        if (!job) {
            throw new NotFoundException({
                code: JOB_ERROR_CODES.NOT_FOUND,
                message: `${JOB_ERRORS[JOB_ERROR_CODES.NOT_FOUND]}: "${id}"`,
            });
        }
        return job;
    }

    async findLogs(id: string) {
        // Ensure the job exists before returning (possibly empty) logs
        await this.findOne(id);
        return this.jobsRepo.findLogs(id);
    }
}
