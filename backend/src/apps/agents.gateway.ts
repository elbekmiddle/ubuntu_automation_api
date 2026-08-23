import {
  Ack,
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

// ---------- Terminal (real-time shell) ----------

interface TerminalOutputPayload {
  sessionId: string;
  data: string;
}

interface TerminalExitPayload {
  sessionId: string;
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
    @Ack() ack: (response: { event: string; data: unknown }) => void,
  ) {
    // Xuddi TerminalGateway.handleOpen'dagi kabi: CLI agent
    // `socket.emit('register', payload, (ack) => {...})` orqali ack
    // callback kutadi. `{event, data}` shaklida `return` qilish Nest'ni
    // ack o'rniga yangi `client.emit(...)` xabari yuborishga majbur qiladi
    // — shu sabab agent hech qachon "✓ Registered" tasdiqini ko'rmas edi
    // (garchi ro'yxatdan o'tish backendda muvaffaqiyatli bo'lsa ham).
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

      this.connectedAgents.set(client.id, app.id);
      client.join(`app:${app.id}`);

      this.logger.log(
        `Agent registered: app=${app.id} (${payload.hostname ?? 'unknown host'})`,
      );
      ack({ event: 'registered', data: { appId: app.id, status: 'online' } });
    } catch (err) {
      this.logger.warn(`Agent registration failed: ${(err as Error).message}`);
      ack({ event: 'error', data: { message: 'Registration failed' } });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @MessageBody() payload: HeartbeatPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const appId = this.connectedAgents.get(client.id);
    if (!appId) {
      return {
        event: 'error',
        data: { message: 'Not registered — send "register" first' },
      };
    }
    await this.appsService.heartbeat(appId, payload);
    return {
      event: 'heartbeat-ack',
      data: { receivedAt: new Date().toISOString() },
    };
  }

  // ---------- Job execution (Agentga marshrutlangan job'lar) ----------

  /** JobsService bu metodni chaqiradi — script'ni shu appId ulangan agentga yuboradi. */
  isAppConnected(appId: string): boolean {
    // Diqqat: `@WebSocketGateway({ namespace: '/agents' })` ishlatilgani
    // uchun bu yerga inject qilingan `server` aslida socket.io'ning
    // Namespace obyekti (root Server emas) — shu sababli xonalar
    // to'g'ridan-to'g'ri `server.adapter.rooms`da turadi, `server.sockets`
    // orqali emas (`server.sockets` bu yerda faqat ulangan socketlar Map'i,
    // uning `.adapter`si yo'q — shuning uchun oldingi kod undefined'ga
    // urilib xato berardi).
    //
    // TypeScript tarafida esa `@WebSocketServer() server: Server` deb
    // e'lon qilingani uchun `.adapter` xossasi emas, `Server.adapter()`
    // metodi (adapter klassini o'rnatish uchun) ko'rinadi — shuning uchun
    // runtime'dagi haqiqiy Namespace shaklini alohida tasvirlab, xavfsiz
    // cast qilamiz.
    const namespace = this.server as unknown as {
      adapter: { rooms: Map<string, Set<string>> };
    };
    return namespace.adapter.rooms.has(`app:${appId}`);
  }

  dispatchJob(appId: string, payload: JobRunPayload): void {
    this.server.to(`app:${appId}`).emit('job:run', payload);
    this.logger.log(
      `Dispatched job ${payload.jobId} (${payload.action}) -> app=${appId}`,
    );
  }

  private truncate(s: string): string {
    return s.length > MAX_LOG_CHUNK
      ? s.slice(0, MAX_LOG_CHUNK) + '\n…[truncated]'
      : s;
  }

  @SubscribeMessage('job:log')
  async handleJobLog(@MessageBody() payload: JobLogPayload) {
    const chunk = this.truncate(payload.chunk);
    await this.jobsRepo
      .appendLog(payload.jobId, payload.stream, chunk)
      .catch((e) => this.logger.error(e));
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
      .catch((e) => this.logger.error(e));
    this.pubsub.publish(`job:${payload.jobId}:status`, {
      status,
      exitCode: payload.exitCode,
    });
    this.logger.log(
      `Job ${payload.jobId} finished remotely: ${status} (exit ${payload.exitCode})`,
    );
  }

  async handleDisconnect(client: Socket) {
    const appId = this.connectedAgents.get(client.id);
    if (appId) {
      this.connectedAgents.delete(client.id);
      await this.appsService.markOffline(appId);
      // TerminalGateway shu kanalni tinglab, shu appga tegishli barcha
      // ochiq terminal sessiyalarini yopadi (agent uzilib qoldi).
      this.pubsub.publish(`agent:${appId}:offline`, {});
      this.logger.log(`Agent disconnected: app=${appId}, now offline`);
    }
  }

  // ---------- Terminal (real-time shell, TerminalGateway orqali frontend'ga ulanadi) ----------

  /** TerminalGateway chaqiradi — agentga yangi interaktiv shell sessiyasini ochishni buyuradi. */
  openTerminal(appId: string, sessionId: string, cols = 80, rows = 24): void {
    this.server
      .to(`app:${appId}`)
      .emit('terminal:start', { sessionId, cols, rows });
  }

  sendTerminalInput(appId: string, sessionId: string, data: string): void {
    this.server.to(`app:${appId}`).emit('terminal:input', { sessionId, data });
  }

  resizeTerminal(
    appId: string,
    sessionId: string,
    cols: number,
    rows: number,
  ): void {
    this.server
      .to(`app:${appId}`)
      .emit('terminal:resize', { sessionId, cols, rows });
  }

  closeTerminal(appId: string, sessionId: string): void {
    this.server.to(`app:${appId}`).emit('terminal:close', { sessionId });
  }

  /** Agentdan real-vaqtli shell chiqishi (stdout/stderr aralash, pty bitta oqim). */
  @SubscribeMessage('terminal:output')
  handleTerminalOutput(@MessageBody() payload: TerminalOutputPayload) {
    this.pubsub.publish(`term:${payload.sessionId}:data`, {
      data: payload.data,
    });
  }

  /** Agentdagi shell process tugaganda (masalan `exit` yozilsa). */
  @SubscribeMessage('terminal:exit')
  handleTerminalExit(@MessageBody() payload: TerminalExitPayload) {
    this.pubsub.publish(`term:${payload.sessionId}:exit`, {
      exitCode: payload.exitCode,
    });
  }
}
