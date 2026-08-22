import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
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

// ---------- Terminal ----------

interface TerminalOutputPayload {
  sessionId: string;
  data: string;
}

interface TerminalExitPayload {
  sessionId: string;
  exitCode: number | null;
}

const MAX_LOG_CHUNK = 8000;

@WebSocketGateway({
  namespace: '/agents',
  cors: {
    origin: '*',
  },
})
export class AgentsGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AgentsGateway.name);

  /**
   * socket.id -> appId
   *
   * Qaysi socket qaysi app'ga tegishli ekanini aniqlash uchun.
   */
  private readonly connectedAgents = new Map<string, string>();

  /**
   * appId -> Socket
   *
   * App'ga command yuborish va connection holatini tekshirish uchun.
   */
  private readonly agentSockets = new Map<string, Socket>();

  @WebSocketServer()
  server!: Server;

  constructor(
      private readonly appsService: AppsService,
      private readonly jobsRepo: JobsRepository,
      private readonly pubsub: RedisPubSubService,
  ) {}

  // --------------------------------------------------
  // Connection lifecycle
  // --------------------------------------------------

  handleConnection(client: Socket) {
    this.logger.log(`Agent socket connected: socket=${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const appId = this.connectedAgents.get(client.id);

    if (!appId) {
      this.logger.debug(
          `Unregistered agent socket disconnected: socket=${client.id}`,
      );
      return;
    }

    this.connectedAgents.delete(client.id);

    /**
     * Muhim:
     *
     * Agar shu app yangi socket bilan reconnect qilgan bo'lsa,
     * eski socket disconnect bo'lganda app'ni offline qilmaymiz.
     */
    const currentSocket = this.agentSockets.get(appId);

    if (!currentSocket || currentSocket.id !== client.id) {
      this.logger.log(
          `Old agent socket disconnected: app=${appId}, socket=${client.id}`,
      );
      return;
    }

    this.agentSockets.delete(appId);

    try {
      await this.appsService.markOffline(appId);
    } catch (error) {
      this.logger.error(
          `Failed to mark app offline: app=${appId}`,
          error instanceof Error ? error.stack : String(error),
      );
    }

    /**
     * TerminalGateway shu eventni Redis orqali oladi
     * va shu app'ga tegishli terminal sessionlarni yopadi.
     */
    this.pubsub.publish(`agent:${appId}:offline`, {});

    this.logger.log(
        `Agent disconnected: app=${appId}, socket=${client.id}, now offline`,
    );
  }

  // --------------------------------------------------
  // Agent registration
  // --------------------------------------------------

  @SubscribeMessage('register')
  async handleRegister(
      @MessageBody() payload: RegisterPayload,
      @ConnectedSocket() client: Socket,
  ) {
    try {
      const app = await this.appsService.authenticateAgent(
          payload.appId,
          payload.registrationToken,
      );

      await this.appsService.markOnline(app.id, {
        hostname: payload.hostname,
        osPlatform: payload.osPlatform,
        osRelease: payload.osRelease,
      });

      /**
       * Agar shu app oldin boshqa socket bilan ulangan bo'lsa,
       * eski socketni disconnect qilamiz.
       *
       * Bu reconnect scenario uchun muhim.
       */
      const previousSocket = this.agentSockets.get(app.id);

      if (previousSocket && previousSocket.id !== client.id) {
        this.connectedAgents.delete(previousSocket.id);

        this.logger.log(
            `Replacing previous agent connection: ` +
            `app=${app.id}, ` +
            `oldSocket=${previousSocket.id}, ` +
            `newSocket=${client.id}`,
        );

        previousSocket.disconnect(true);
      }

      /**
       * Yangi connection'ni registry'ga qo'shamiz.
       */
      this.connectedAgents.set(client.id, app.id);
      this.agentSockets.set(app.id, client);

      /**
       * Room bu yerda faqat Socket.IO grouping uchun.
       * Connection state endi room orqali tekshirilmaydi.
       */
      client.join(`app:${app.id}`);

      this.logger.log(
          `Agent registered: app=${app.id} ` +
          `(${payload.hostname ?? 'unknown host'})`,
      );

      return {
        event: 'registered',
        data: {
          appId: app.id,
          status: 'online',
        },
      };
    } catch (error) {
      this.logger.warn(
          `Agent registration failed: ${
              error instanceof Error ? error.message : String(error)
          }`,
      );

      client.disconnect(true);

      return {
        event: 'error',
        data: {
          message: 'Registration failed',
        },
      };
    }
  }

  // --------------------------------------------------
  // Connection state
  // --------------------------------------------------

  isAppConnected(appId: string): boolean {
    return this.agentSockets.has(appId);
  }

  private getAgentSocket(appId: string): Socket | null {
    return this.agentSockets.get(appId) ?? null;
  }

  /**
   * Agent'ga event yuborish uchun yagona helper.
   */
  private emitToAgent(
      appId: string,
      event: string,
      payload: unknown,
  ): boolean {
    const socket = this.agentSockets.get(appId);

    if (!socket) {
      this.logger.warn(
          `Cannot emit "${event}": agent is not connected, app=${appId}`,
      );

      return false;
    }

    this.logger.debug(
        `Sending "${event}" -> app=${appId}, socket=${socket.id}`,
    );

    socket.emit(event, payload);

    return true;
  }

  // --------------------------------------------------
  // Heartbeat
  // --------------------------------------------------

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
      @MessageBody() payload: HeartbeatPayload,
      @ConnectedSocket() client: Socket,
  ) {
    const appId = this.connectedAgents.get(client.id);

    if (!appId) {
      return {
        event: 'error',
        data: {
          message: 'Not registered — send "register" first',
        },
      };
    }

    /**
     * Faqat current socket heartbeat yuborayotganiga ishonch hosil qilamiz.
     */
    const currentSocket = this.agentSockets.get(appId);

    if (!currentSocket || currentSocket.id !== client.id) {
      return {
        event: 'error',
        data: {
          message: 'Connection is no longer active',
        },
      };
    }

    await this.appsService.heartbeat(appId, payload);

    return {
      event: 'heartbeat-ack',
      data: {
        receivedAt: new Date().toISOString(),
      },
    };
  }

  // --------------------------------------------------
  // Jobs
  // --------------------------------------------------

  /**
   * JobsService shu metod orqali agentga job yuboradi.
   */
  dispatchJob(appId: string, payload: JobRunPayload): boolean {
    const sent = this.emitToAgent(appId, 'job:run', payload);

    if (sent) {
      this.logger.log(
          `Dispatched job ${payload.jobId} ` +
          `(${payload.action}) -> app=${appId}`,
      );
    }

    return sent;
  }

  private truncate(value: string): string {
    return value.length > MAX_LOG_CHUNK
        ? value.slice(0, MAX_LOG_CHUNK) + '\n…[truncated]'
        : value;
  }

  @SubscribeMessage('job:log')
  async handleJobLog(@MessageBody() payload: JobLogPayload) {
    const chunk = this.truncate(payload.chunk);

    await this.jobsRepo
        .appendLog(payload.jobId, payload.stream, chunk)
        .catch((error) => {
          this.logger.error(
              `Failed to append job log: job=${payload.jobId}`,
              error instanceof Error ? error.stack : String(error),
          );
        });

    this.pubsub.publish(`job:${payload.jobId}:log`, {
      stream: payload.stream,
      chunk,
      ts: Date.now(),
    });
  }

  @SubscribeMessage('job:complete')
  async handleJobComplete(@MessageBody() payload: JobCompletePayload) {
    const status = payload.exitCode === 0 ? 'success' : 'failed';

    await this.jobsRepo
        .markFinished(payload.jobId, status, payload.exitCode)
        .catch((error) => {
          this.logger.error(
              `Failed to mark job finished: job=${payload.jobId}`,
              error instanceof Error ? error.stack : String(error),
          );
        });

    this.pubsub.publish(`job:${payload.jobId}:status`, {
      status,
      exitCode: payload.exitCode,
    });

    this.logger.log(
        `Job ${payload.jobId} finished remotely: ` +
        `${status} (exit ${payload.exitCode})`,
    );
  }

  // --------------------------------------------------
  // Terminal
  // --------------------------------------------------

  /**
   * TerminalGateway chaqiradi.
   */
  openTerminal(
      appId: string,
      sessionId: string,
      cols = 80,
      rows = 24,
  ): boolean {
    return this.emitToAgent(appId, 'terminal:start', {
      sessionId,
      cols,
      rows,
    });
  }

  sendTerminalInput(
      appId: string,
      sessionId: string,
      data: string,
  ): boolean {
    return this.emitToAgent(appId, 'terminal:input', {
      sessionId,
      data,
    });
  }

  resizeTerminal(
      appId: string,
      sessionId: string,
      cols: number,
      rows: number,
  ): boolean {
    return this.emitToAgent(appId, 'terminal:resize', {
      sessionId,
      cols,
      rows,
    });
  }

  closeTerminal(appId: string, sessionId: string): boolean {
    return this.emitToAgent(appId, 'terminal:close', {
      sessionId,
    });
  }

  // --------------------------------------------------
  // Terminal output from agent
  // --------------------------------------------------

  @SubscribeMessage('terminal:output')
  handleTerminalOutput(
      @MessageBody() payload: TerminalOutputPayload,
      @ConnectedSocket() client: Socket,
  ) {
    const appId = this.connectedAgents.get(client.id);

    if (!appId) {
      return;
    }

    /**
     * Faqat current active socket terminal output yuborishi mumkin.
     */
    const currentSocket = this.agentSockets.get(appId);

    if (!currentSocket || currentSocket.id !== client.id) {
      return;
    }

    this.pubsub.publish(`term:${payload.sessionId}:data`, {
      data: payload.data,
    });
  }

  @SubscribeMessage('terminal:exit')
  handleTerminalExit(
      @MessageBody() payload: TerminalExitPayload,
      @ConnectedSocket() client: Socket,
  ) {
    const appId = this.connectedAgents.get(client.id);

    if (!appId) {
      return;
    }

    const currentSocket = this.agentSockets.get(appId);

    if (!currentSocket || currentSocket.id !== client.id) {
      return;
    }

    this.pubsub.publish(`term:${payload.sessionId}:exit`, {
      exitCode: payload.exitCode,
    });
  }
}