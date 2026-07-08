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
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { JwtService } from '@nestjs/jwt';
import { SessionsRepository } from './sessions.repository';

type AuthedSocket = WebSocket & { sessionId?: string; userId?: string };

// websocket gateway that receives transcript segments in real-time and persists them to the database
@WebSocketGateway({ path: '/api/ws/sessions' })
export class SessionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(SessionsGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly repo: SessionsRepository,
  ) {}

  // authenticates the connecting client via jwt in query string; sets userId on socket
  handleConnection(client: AuthedSocket, req: IncomingMessage) {
    try {
      const url = new URL(req.url ?? '', 'http://localhost');
      const token = url.searchParams.get('token') ?? '';
      this.logger.log(`ws connect: url=${req.url} token_len=${token.length}`);
      const payload = this.jwt.verify<{ sub: string }>(token);
      client.userId = payload.sub;
      this.logger.log(`ws auth ok: userId=${payload.sub}`);
    } catch (err) {
      this.logger.warn(`ws auth failed: ${err}`);
      client.close(1008, 'unauthorized');
    }
  }

  handleDisconnect(client: AuthedSocket) {
    this.logger.log(`ws disconnect: userId=${client.userId} sessionId=${client.sessionId}`);
  }

  // binds the socket to a specific session after verifying ownership
  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    this.logger.log(`ws join: userId=${client.userId} sessionId=${data?.sessionId}`);
    if (!client.userId) return this.send(client, 'error', { message: 'unauthorized' });
    const session = await this.repo.findById(data.sessionId);
    if (!session || session.userId !== client.userId) {
      this.logger.warn(`ws join failed: session not found or userId mismatch`);
      return this.send(client, 'error', { message: 'not found' });
    }
    client.sessionId = data.sessionId;
    this.logger.log(`ws joined: sessionId=${data.sessionId}`);
    this.send(client, 'joined', { sessionId: data.sessionId });
  }

  // receives a single transcript segment and saves it to the database
  @SubscribeMessage('segment')
  async handleSegment(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() data: { id: string; speaker?: string; text: string; startMs: number; endMs: number; source?: string; language?: string; translationStatus?: string; originId?: string },
  ) {
    this.logger.log(`ws segment: sessionId=${client.sessionId} id=${data?.id} source=${data?.source} translationStatus=${data?.translationStatus} originId=${data?.originId} text="${data?.text?.slice(0, 30)}"`);
    if (!client.sessionId || !client.userId) {
      this.logger.warn(`ws segment skipped: no sessionId or userId`);
      return;
    }
    try {
      await this.repo.insertSegments(client.sessionId, [
        {
          id: data.id,
          speaker: data.speaker,
          text: data.text,
          startMs: data.startMs,
          endMs: data.endMs,
          source: data.source,
          language: data.language,
          translationStatus: data.translationStatus,
          originId: data.originId,
        },
      ]);
      this.logger.log(`ws segment saved: id=${data.id}`);
      this.send(client, 'ack', { id: data.id });
    } catch (err) {
      this.logger.error(`ws segment insert error: ${err}`);
    }
  }

  private send(client: WebSocket, event: string, data: unknown) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event, data }));
    }
  }
}
