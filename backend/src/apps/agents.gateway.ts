import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AppsService } from './apps.service';
import { JobsRepository } from '../jobs/jobs.repository';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

interface RegisterPayload {
    appId: string;
    registrationToken: string;
    hostname?: string;
    osPlatform?: string;
    osRelease?: string;
}

interface HeartbeatPayload {
    cpu?: number;
    memory?: number;
    disk?: number;
    [key: string]: unknown;
}

export interface JobRunPayload {
    jobId: string;
    action: string;
    script: string;
    args: Record<string, unknown>;
}

interface JobLogPayload {
    jobId: string;
    stream: 'stdout' | 'stderr';
    chunk: string;
}

interface JobCompletePayload {
    jobId: string;
    exitCode: number | null;
}

const MAX_LOG_CHUNK = 8000;

@WebSocketGateway({ namespace: '/agents', cors: { origin: '*' } })
export class AgentsGateway implements OnGatewayDisconnect {
    private readonly logger = new Logger(AgentsGateway.name);

    // Ulangan socket'larni appId bo'yicha kuzatib boramiz.
    private readonly connectedAgents = new Map<string, string>(); // socket.id -> appId

    @WebSocketServer()
    server: Server;

    constructor(
        private readonly appsService: AppsService,
        private readonly jobsRepo: JobsRepository,
        private readonly pubsub: RedisPubSubService,
    ) {}

    @SubscribeMessage('register')
    async handleRegister(
        @MessageBody() payload: RegisterPayload,
        @ConnectedSocket() client: Socket,
    ) {
        try {
            const app = await this.appsService.authenticateAgent(payload.appId, payload.registrationToken);
            await this.appsService.markOnline(app.id, {
                hostname: payload.hostname,
                osPlatform: payload.osPlatform,
                osRelease: payload.osRelease,
            });

            this.connectedAgents.set(client.id, app.id);
            client.join(`app:${app.id}`);

            this.logger.log(`Agent registered: app=${app.id} (${payload.hostname ?? 'unknown host'})`);
            return { event: 'registered', data: { appId: app.id, status: 'online' } };
        } catch (err) {
            this.logger.warn(`Agent registration failed: ${(err as Error).message}`);
            client.disconnect(true);
            return { event: 'error', data: { message: 'Registration failed' } };
        }
    }

    @SubscribeMessage('heartbeat')
    async handleHeartbeat(
        @MessageBody() payload: HeartbeatPayload,
        @ConnectedSocket() client: Socket,
    ) {
        const appId = this.connectedAgents.get(client.id);
        if (!appId) {
            return { event: 'error', data: { message: 'Not registered — send "register" first' } };
        }
        await this.appsService.heartbeat(appId, payload);
        return { event: 'heartbeat-ack', data: { receivedAt: new Date().toISOString() } };
    }

    // ---------- Job execution (Agentga marshrutlangan job'lar) ----------

    /** JobsService bu metodni chaqiradi — script'ni shu appId ulangan agentga yuboradi. */
    isAppConnected(appId: string): boolean {
        return this.server.sockets.adapter.rooms.has(`app:${appId}`);
    }

    dispatchJob(appId: string, payload: JobRunPayload): void {
        this.server.to(`app:${appId}`).emit('job:run', payload);
        this.logger.log(`Dispatched job ${payload.jobId} (${payload.action}) -> app=${appId}`);
    }

    private truncate(s: string): string {
        return s.length > MAX_LOG_CHUNK ? s.slice(0, MAX_LOG_CHUNK) + '\n…[truncated]' : s;
    }

    @SubscribeMessage('job:log')
    async handleJobLog(@MessageBody() payload: JobLogPayload) {
        const chunk = this.truncate(payload.chunk);
        await this.jobsRepo.appendLog(payload.jobId, payload.stream, chunk).catch((e) => this.logger.error(e));
        this.pubsub.publish(`job:${payload.jobId}:log`, { stream: payload.stream, chunk, ts: Date.now() });
    }

    @SubscribeMessage('job:complete')
    async handleJobComplete(@MessageBody() payload: JobCompletePayload) {
        const status = payload.exitCode === 0 ? 'success' : 'failed';
        await this.jobsRepo.markFinished(payload.jobId, status, payload.exitCode).catch((e) => this.logger.error(e));
        this.pubsub.publish(`job:${payload.jobId}:status`, { status, exitCode: payload.exitCode });
        this.logger.log(`Job ${payload.jobId} finished remotely: ${status} (exit ${payload.exitCode})`);
    }

    async handleDisconnect(client: Socket) {
        const appId = this.connectedAgents.get(client.id);
        if (appId) {
            this.connectedAgents.delete(client.id);
            await this.appsService.markOffline(appId);
            this.logger.log(`Agent disconnected: app=${appId}, now offline`);
        }
    }
}
