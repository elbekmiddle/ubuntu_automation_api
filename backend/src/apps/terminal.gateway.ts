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

type AppRecord = Awaited<
    ReturnType<AppsService['findOneForUser']>
>;

@Injectable()
@WebSocketGateway({
  namespace: '/clients',
  cors: {
    origin: '*',
  },
})
export class TerminalGateway
    implements
        OnGatewayConnection,
        OnGatewayDisconnect,
        OnModuleInit,
        OnModuleDestroy
{
  private readonly logger = new Logger(TerminalGateway.name);

  @WebSocketServer()
  server!: Server;

  /**
   * sessionId -> session
   */
  private readonly sessions = new Map<string, TerminalSession>();

  /**
   * appId -> sessionIds
   */
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

  // --------------------------------------------------
  // Redis
  // --------------------------------------------------

  onModuleInit() {
    this.redisSub.psubscribe(
        'term:*:data',
        'term:*:exit',
        'agent:*:offline',
    );

    this.redisSub.on(
        'pmessage',
        (_pattern: string, channel: string, raw: string) => {
          this.routeRedisMessage(channel, raw);
        },
    );
  }

  async onModuleDestroy() {
    try {
      await this.redisSub.quit();
    } catch {
      this.redisSub.disconnect();
    }
  }

  private routeRedisMessage(
      channel: string,
      raw: string,
  ) {
    let payload: unknown;

    try {
      payload = JSON.parse(raw);
    } catch {
      this.logger.warn(
          `Invalid Redis payload: channel=${channel}`,
      );
      return;
    }

    // ----------------------------------------------
    // Terminal data
    // ----------------------------------------------

    const dataMatch = channel.match(
        /^term:(.+):data$/,
    );

    if (dataMatch) {
      const sessionId = dataMatch[1];

      if (!this.sessions.has(sessionId)) {
        return;
      }

      this.server
          .to(`term:${sessionId}`)
          .emit('terminal:data', {
            sessionId,
            ...(payload as object),
          });

      return;
    }

    // ----------------------------------------------
    // Terminal exit
    // ----------------------------------------------

    const exitMatch = channel.match(
        /^term:(.+):exit$/,
    );

    if (exitMatch) {
      const sessionId = exitMatch[1];

      if (!this.sessions.has(sessionId)) {
        return;
      }

      this.server
          .to(`term:${sessionId}`)
          .emit('terminal:exit', {
            sessionId,
            ...(payload as object),
          });

      this.dropSession(sessionId);

      return;
    }

    // ----------------------------------------------
    // Agent offline
    // ----------------------------------------------

    const offlineMatch = channel.match(
        /^agent:(.+):offline$/,
    );

    if (offlineMatch) {
      const appId = offlineMatch[1];

      const sessionIds =
          this.sessionsByApp.get(appId);

      if (!sessionIds) {
        return;
      }

      for (const sessionId of [...sessionIds]) {
        this.server
            .to(`term:${sessionId}`)
            .emit('terminal:exit', {
              sessionId,
              exitCode: null,
              reason: 'agent-disconnected',
            });

        this.dropSession(sessionId);
      }

      return;
    }
  }

  // --------------------------------------------------
  // Session management
  // --------------------------------------------------

  private dropSession(sessionId: string) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return;
    }

    this.sessions.delete(sessionId);

    const appSessions =
        this.sessionsByApp.get(session.appId);

    if (!appSessions) {
      return;
    }

    appSessions.delete(sessionId);

    if (appSessions.size === 0) {
      this.sessionsByApp.delete(session.appId);
    }
  }

  private createSession(
      sessionId: string,
      session: TerminalSession,
  ) {
    this.sessions.set(sessionId, session);

    let appSessions =
        this.sessionsByApp.get(session.appId);

    if (!appSessions) {
      appSessions = new Set<string>();
      this.sessionsByApp.set(
          session.appId,
          appSessions,
      );
    }

    appSessions.add(sessionId);
  }

  // --------------------------------------------------
  // Client authentication
  // --------------------------------------------------

  async handleConnection(client: ClientSocket) {
    const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload =
          await this.jwtService.verifyAsync<{
            sub: string;
            email: string;
          }>(token);

      client.data.userId = payload.sub;

      this.logger.debug(
          `Client connected: socket=${client.id}, user=${payload.sub}`,
      );
    } catch {
      client.disconnect(true);
    }
  }

  // --------------------------------------------------
  // Client disconnect
  // --------------------------------------------------

  handleDisconnect(client: ClientSocket) {
    for (const [sessionId, session] of this.sessions) {
      if (session.socketId !== client.id) {
        continue;
      }

      this.agentsGateway.closeTerminal(
          session.appId,
          sessionId,
      );

      this.dropSession(sessionId);

      this.logger.log(
          `Terminal session closed because client disconnected: ` +
          `session=${sessionId}, app=${session.appId}`,
      );
    }
  }

  // --------------------------------------------------
  // Open terminal
  // --------------------------------------------------

  @SubscribeMessage('terminal:open')
  async handleOpen(
      @MessageBody()
      body: {
        appId: string;
        cols?: number;
        rows?: number;
      },
      @ConnectedSocket()
      client: ClientSocket,
  ) {
    const userId = client.data.userId;

    if (!userId) {
      return {
        event: 'terminal:error',
        data: {
          message: 'Not authenticated',
        },
      };
    }

    if (!body?.appId) {
      return {
        event: 'terminal:error',
        data: {
          message: 'appId is required',
        },
      };
    }

    let app: AppRecord;

    try {
      app =
          await this.appsService.findOneForUser(
              userId,
              body.appId,
          );
    } catch {
      return {
        event: 'terminal:error',
        data: {
          message: 'Device not found',
        },
      };
    }

    if (app.permission !== 'read_write') {
      return {
        event: 'terminal:error',
        data: {
          message:
              'This device is read-only — terminal access is disabled',
        },
      };
    }

    /**
     * Endi isAppConnected() rooms'ga qaramaydi.
     */
    if (
        app.status !== 'online' ||
        !this.agentsGateway.isAppConnected(app.id)
    ) {
      return {
        event: 'terminal:error',
        data: {
          message: 'Device is offline',
        },
      };
    }

    const sessionId = crypto.randomUUID();

    this.createSession(sessionId, {
      appId: app.id,
      userId,
      socketId: client.id,
    });

    client.join(`term:${sessionId}`);

    /**
     * Agentga terminal:start yuboramiz.
     */
    const sent =
        this.agentsGateway.openTerminal(
            app.id,
            sessionId,
            body.cols ?? 80,
            body.rows ?? 24,
        );

    if (!sent) {
      this.dropSession(sessionId);

      return {
        event: 'terminal:error',
        data: {
          message:
              'Device disconnected before terminal could be opened',
        },
      };
    }

    this.logger.log(
        `Terminal session ${sessionId} opened ` +
        `for app=${app.id} by user=${userId}`,
    );

    return {
      event: 'terminal:opened',
      data: {
        sessionId,
      },
    };
  }

  // --------------------------------------------------
  // Session lookup
  // --------------------------------------------------

  private sessionFor(
      sessionId: string,
      client: ClientSocket,
  ): TerminalSession | null {
    const session =
        this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    if (session.socketId !== client.id) {
      return null;
    }

    return session;
  }

  // --------------------------------------------------
  // Terminal input
  // --------------------------------------------------

  @SubscribeMessage('terminal:input')
  handleInput(
      @MessageBody()
      body: {
        sessionId: string;
        data: string;
      },
      @ConnectedSocket()
      client: ClientSocket,
  ) {
    const session =
        this.sessionFor(
            body.sessionId,
            client,
        );

    if (!session) {
      return;
    }

    this.agentsGateway.sendTerminalInput(
        session.appId,
        body.sessionId,
        body.data,
    );
  }

  // --------------------------------------------------
  // Terminal resize
  // --------------------------------------------------

  @SubscribeMessage('terminal:resize')
  handleResize(
      @MessageBody()
      body: {
        sessionId: string;
        cols: number;
        rows: number;
      },
      @ConnectedSocket()
      client: ClientSocket,
  ) {
    const session =
        this.sessionFor(
            body.sessionId,
            client,
        );

    if (!session) {
      return;
    }

    this.agentsGateway.resizeTerminal(
        session.appId,
        body.sessionId,
        body.cols,
        body.rows,
    );
  }

  // --------------------------------------------------
  // Terminal close
  // --------------------------------------------------

  @SubscribeMessage('terminal:close')
  handleClose(
      @MessageBody()
      body: {
        sessionId: string;
      },
      @ConnectedSocket()
      client: ClientSocket,
  ) {
    const session =
        this.sessionFor(
            body.sessionId,
            client,
        );

    if (!session) {
      return;
    }

    this.agentsGateway.closeTerminal(
        session.appId,
        body.sessionId,
    );

    this.dropSession(body.sessionId);

    this.logger.log(
        `Terminal session closed: ` +
        `session=${body.sessionId}, app=${session.appId}`,
    );
  }
}