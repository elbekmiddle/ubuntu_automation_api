import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JobsRepository } from './jobs.repository';
import { TemplatesService } from '../templates/templates.service';
import { JobQueuePayload } from './jobs.types';

@Injectable()
export class JobsService {
    constructor(
        private readonly jobsRepo: JobsRepository,
        private readonly templatesService: TemplatesService,
        @InjectQueue('script-execution') private readonly queue: Queue<JobQueuePayload>,
    ) {}

    async enqueue(templateId: string, action: string, args: Record<string, unknown> = {}) {
        const template = await this.templatesService.findById(templateId);

        if (!template.actions.includes(action)) {
            throw new NotFoundException(`Action "${action}" not defined for template "${templateId}"`);
        }

        const job = await this.jobsRepo.create(template.id, action, args);

        await this.queue.add('run-script', {
            jobId: job.id,
            templatePath: template.path,
            action,
            args,
        });

        return job;
    }

    findAll() {
        return this.jobsRepo.findAll();
    }

    async findOne(id: string) {
        const job = await this.jobsRepo.findById(id);
        if (!job) throw new NotFoundException(`Job "${id}" not found`);
        return job;
    }

    findLogs(id: string) {
        return this.jobsRepo.findLogs(id);
    }
}