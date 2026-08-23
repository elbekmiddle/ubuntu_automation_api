import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job as BullJob } from 'bullmq';
import { spawn } from 'child_process';
import * as path from 'path';
import { JobsRepository } from './jobs.repository';
import { JobQueuePayload } from './jobs.types';
import {RedisPubSubService}      from "../../redis/redis-pubsub.service";

const SCRIPT_TIMEOUT_MS = Number(process.env.SCRIPT_TIMEOUT_MS ?? 5 * 60 * 1000); // default 5 daqiqa
const MAX_LOG_CHUNK = 8000; // bitta yozuv juda katta bo'lsa DB'ni shishirmaslik uchun kesamiz

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
            // Minimal, nazorat qilinadigan environment — host'ning to'liq env'ini (secretlar, tokenlar)
            // script ichiga oqizib yubormaslik uchun. DISPLAY/XAUTHORITY/XDG_RUNTIME_DIR ataylab
            // qoldirilgan — bo'lmasa xrandr kabi X11/Wayland bilan ishlaydigan scriptlar
            // "Can't open display" xatosi bilan yiqiladi.
            const safeEnv = {
                PATH: process.env.PATH,
                HOME: process.env.HOME,
                LANG: process.env.LANG ?? 'C.UTF-8',
                DISPLAY: process.env.DISPLAY,
                XAUTHORITY: process.env.XAUTHORITY,
                XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR,
                WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY,
                DBUS_SESSION_BUS_ADDRESS: process.env.DBUS_SESSION_BUS_ADDRESS,
            };

            const child = spawn('bash', [scriptPath], {
                cwd: templatePath,
                env: safeEnv,
                timeout: SCRIPT_TIMEOUT_MS,
                killSignal: 'SIGKILL',
            });

            const timeoutTimer = setTimeout(() => {
                this.logger.warn(`Job ${jobId} timed out after ${SCRIPT_TIMEOUT_MS}ms, killing`);
                child.kill('SIGKILL');
            }, SCRIPT_TIMEOUT_MS);

            this.jobsRepo.markRunning(jobId, child.pid!).catch((e) => this.logger.error(e));

            const truncate = (s: string) => (s.length > MAX_LOG_CHUNK ? s.slice(0, MAX_LOG_CHUNK) + '\n…[truncated]' : s);

            child.stdout.on('data', (data: Buffer) => {
                const chunk = truncate(data.toString());
                this.jobsRepo.appendLog(jobId, 'stdout', chunk).catch((e) => this.logger.error(e));
                this.pubsub.publish(`job:${jobId}:log`, { stream: 'stdout', chunk, ts: Date.now() });
            });

            child.stderr.on('data', (data: Buffer) => {
                const chunk = truncate(data.toString());
                this.jobsRepo.appendLog(jobId, 'stderr', chunk).catch((e) => this.logger.error(e));
                this.pubsub.publish(`job:${jobId}:log`, { stream: 'stderr', chunk, ts: Date.now() });
            });

            child.on('close', (code) => {
                clearTimeout(timeoutTimer);
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
                clearTimeout(timeoutTimer);
                this.jobsRepo.markFinished(jobId, 'failed', null).finally(() => reject(err));
            });
        });
    }
}