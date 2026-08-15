import {
    BadRequestException,
    HttpException,
    HttpStatus,
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

@Injectable()
export class JobsService {
    private readonly logger = new Logger(JobsService.name);

    constructor(
        private readonly jobsRepo: JobsRepository,
        private readonly templatesService: TemplatesService,
        @InjectQueue('script-execution') private readonly queue: Queue<JobQueuePayload>,
    ) {}

    async enqueue(templateSlug: string, action: string, args: Record<string, unknown> = {}) {
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

        try {
            const job = await this.jobsRepo.create(template.id, action, args);

            await this.queue.add('run-script', {
                jobId: job.id,
                templatePath: template.path,
                action,
                args,
            });

            this.logger.log(`Enqueued job ${job.id} (${template.slug} -> ${action})`);

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

    findAll() {
        return this.jobsRepo.findAll();
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
