import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job as BullJob } from 'bullmq';
import { spawn } from 'child_process';
import * as path from 'path';
import { JobsRepository } from './jobs.repository';
import { JobQueuePayload } from './jobs.types';
import {RedisPubSubService}      from "../redis/redis-pubsub.service";

@Processor('script-execution')
export class JobsProcessor extends WorkerHost {
    private readonly logger = new Logger(JobsProcessor.name);

    constructor(
        private readonly jobsRepo: JobsRepository,
        private readonly pubsub: RedisPubSubService
    ) {
        super();
    }

    async process(bullJob: BullJob<JobQueuePayload>): Promise<void> {
        const { jobId, templatePath, action } = bullJob.data;
        const scriptPath = path.join(templatePath, `${action}.sh`);

        return new Promise((resolve, reject) => {
            const child = spawn('bash', [scriptPath], { cwd: templatePath });

            this.jobsRepo.markRunning(jobId, child.pid!).catch((e) => this.logger.error(e));

            child.stdout.on('data', (data: Buffer) => {
                this.jobsRepo.appendLog(jobId, 'stdout', data.toString()).catch((e) => this.logger.error(e));
            });

            child.stderr.on('data', (data: Buffer) => {
                this.jobsRepo.appendLog(jobId, 'stderr', data.toString()).catch((e) => this.logger.error(e));
            });

            child.on('close', (code) => {

                const status = code === 0 ? 'success' : 'failed'
                this.jobsRepo
                    .markFinished(jobId, status, code)
                    .then(() => {
                        this.pubsub.publish(`job:${jobId}:status`, {status, exitCode: code});
                        resolve()
                    })
                    .catch(reject);
            });

            child.on('error', (err) => {
                this.jobsRepo.markFinished(jobId, 'failed', null).finally(() => reject(err));
            });
        });
    }
}