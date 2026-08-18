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

@WebSocketGateway({ namespace: '/agents', cors: { origin: '*' } })
export class AgentsGateway implements OnGatewayDisconnect {
    private readonly logger = new Logger(AgentsGateway.name);

    // Ulangan socket'larni appId bo'yicha kuzatib boramiz — kelajakda
    // "buyruq yuborish" (action run) shu orqali amalga oshadi.
    private readonly connectedAgents = new Map<string, string>(); // socket.id -> appId

    @WebSocketServer()
    server: Server;

    constructor(private readonly appsService: AppsService) {}

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

    async handleDisconnect(client: Socket) {
        const appId = this.connectedAgents.get(client.id);
        if (appId) {
            this.connectedAgents.delete(client.id);
            await this.appsService.markOffline(appId);
            this.logger.log(`Agent disconnected: app=${appId}, now offline`);
        }
    }
}
