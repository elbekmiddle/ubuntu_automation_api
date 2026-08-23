import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { AppsService } from './apps.service';
import { AgentsGateway } from './agents.gateway';

interface TerminalSession {
  appId: string;
  userId: string;
  socketId: string;
}

interface ClientSocketData {
  userId?: string;
}

type ClientSocket = Socket<any, any, any, ClientSocketData>;

type AppRecord = Awaited<ReturnType<AppsService['findOneForUser']>>;

/**
 * Frontend (browser) shu namespace'ga JWT bilan ulanadi va o'ziga tegishli
 * App'lar uchun real-vaqtli terminal sessiyasi ochadi. AgentsGateway ('/agents'
 * namespace) bilan Redis pub/sub orqali gaplashadi — ikkisi alohida socket.io
 * namespace bo'lgani uchun to'g'ridan-to'g'ri bir-birining xonalariga
 * yoza olmaydi.
 */
@Injectable()
@WebSocketGateway({ namespace: '/clients', cors: { origin: '*' } })
export class TerminalGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
  private readonly logger = new Logger(TerminalGateway.name);

  @WebSocketServer()
  server: Server;

  // sessionId -> session ma'lumoti
  private readonly sessions = new Map<string, TerminalSession>();
  // appId -> shu appga tegishli ochiq sessiyalar (agent uzilganda tozalash uchun)
  private readonly sessionsByApp = new Map<string, Set<string>>();

  private readonly redisSub = new Redis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
  });

  constructor(
    private readonly jwtService: JwtService,
    private readonly appsService: AppsService,
    private readonly agentsGateway: AgentsGateway,
  ) {}

  onModuleInit() {
    // Har bir sessiya uchun alohida `subscribe` chaqirish o'rniga bitta
    // doimiy pattern-subscriber ishlatamiz — shunda socket/listener
    // "leak" bo'lmaydi, sessiya soni qancha ko'p bo'lmasin.
    this.redisSub.psubscribe('term:*', 'agent:*:offline');
    this.redisSub.on(
      'pmessage',
      (_pattern: string, channel: string, raw: string) => {
        this.routeRedisMessage(channel, raw);
      },
    );
  }

  onModuleDestroy() {
    this.redisSub.disconnect();
  }

  private routeRedisMessage(channel: string, raw: string) {
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    const dataMatch = channel.match(/^term:(.+):data$/);
    if (dataMatch) {
      const sessionId = dataMatch[1];
      if (this.sessions.has(sessionId)) {
        this.server
          .to(`term:${sessionId}`)
          .emit('terminal:data', { sessionId, ...(payload as object) });
      }
      return;
    }

    const exitMatch = channel.match(/^term:(.+):exit$/);
    if (exitMatch) {
      const sessionId = exitMatch[1];
      if (this.sessions.has(sessionId)) {
        this.server
          .to(`term:${sessionId}`)
          .emit('terminal:exit', { sessionId, ...(payload as object) });
        this.dropSession(sessionId);
      }
      return;
    }

    const offlineMatch = channel.match(/^agent:(.+):offline$/);
    if (offlineMatch) {
      const appId = offlineMatch[1];
      const sessionIds = this.sessionsByApp.get(appId);
      if (sessionIds) {
        for (const sessionId of [...sessionIds]) {
          this.server.to(`term:${sessionId}`).emit('terminal:exit', {
            sessionId,
            exitCode: null,
            reason: 'agent-disconnected',
          });
          this.dropSession(sessionId);
        }
      }
    }
  }

  private dropSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.delete(sessionId);
    this.sessionsByApp.get(session.appId)?.delete(sessionId);
  }

  async handleConnection(client: ClientSocket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
      }>(token);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: ClientSocket) {
    for (const [sessionId, session] of this.sessions) {
      if (session.socketId !== client.id) continue;
      this.agentsGateway.closeTerminal(session.appId, sessionId);
      this.dropSession(sessionId);
    }
  }

  @SubscribeMessage('terminal:open')
  async handleOpen(
    @MessageBody() body: { appId: string; cols?: number; rows?: number },
    @ConnectedSocket() client: ClientSocket,
  ) {
    const userId = client.data.userId;
    if (!userId)
      return {
        event: 'terminal:error',
        data: { message: 'Not authenticated' },
      };

    let app: AppRecord;
    try {
      app = await this.appsService.findOneForUser(userId, body.appId);
    } catch {
      return { event: 'terminal:error', data: { message: 'Device not found' } };
    }

    if (app.permission !== 'read_write') {
      return {
        event: 'terminal:error',
        data: {
          message: 'This device is read-only — terminal access is disabled',
        },
      };
    }
    if (app.status !== 'online' || !this.agentsGateway.isAppConnected(app.id)) {
      return {
        event: 'terminal:error',
        data: { message: 'Device is offline' },
      };
    }

    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      appId: app.id,
      userId,
      socketId: client.id,
    });
    if (!this.sessionsByApp.has(app.id))
      this.sessionsByApp.set(app.id, new Set());
    this.sessionsByApp.get(app.id)!.add(sessionId);

    client.join(`term:${sessionId}`);
    this.agentsGateway.openTerminal(
      app.id,
      sessionId,
      body.cols ?? 80,
      body.rows ?? 24,
    );

    this.logger.log(
      `Terminal session ${sessionId} opened for app=${app.id} by user=${userId}`,
    );
    return { event: 'terminal:opened', data: { sessionId } };
  }

  private sessionFor(
    sessionId: string,
    client: ClientSocket,
  ): TerminalSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.socketId !== client.id) return null;
    return session;
  }

  @SubscribeMessage('terminal:input')
  handleInput(
    @MessageBody() body: { sessionId: string; data: string },
    @ConnectedSocket() client: ClientSocket,
  ) {
    const session = this.sessionFor(body.sessionId, client);
    if (!session) return;
    this.agentsGateway.sendTerminalInput(
      session.appId,
      body.sessionId,
      body.data,
    );
  }

  @SubscribeMessage('terminal:resize')
  handleResize(
    @MessageBody() body: { sessionId: string; cols: number; rows: number },
    @ConnectedSocket() client: ClientSocket,
  ) {
    const session = this.sessionFor(body.sessionId, client);
    if (!session) return;
    this.agentsGateway.resizeTerminal(
      session.appId,
      body.sessionId,
      body.cols,
      body.rows,
    );
  }

  @SubscribeMessage('terminal:close')
  handleClose(
    @MessageBody() body: { sessionId: string },
    @ConnectedSocket() client: ClientSocket,
  ) {
    const session = this.sessionFor(body.sessionId, client);
    if (!session) return;
    this.agentsGateway.closeTerminal(session.appId, body.sessionId);
    this.dropSession(body.sessionId);
  }
}
