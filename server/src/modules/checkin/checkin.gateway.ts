import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
  },
  namespace: 'checkin',
})
export class CheckinGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CheckinGateway.name);

  constructor(@Inject('REDIS_CLIENT') private redis: Redis | null) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:court')
  async handleSubscribeCourt(client: Socket, courtId: number) {
    if (!Number.isInteger(courtId) || courtId <= 0) {
      client.emit('error', { message: 'Invalid courtId' });
      return;
    }
    if (!this.redis) {
      client.emit('error', { message: 'Redis unavailable' });
      return;
    }
    const room = `court:${courtId}`;
    client.join(room);

    const count = await this.redis.get(`court:${courtId}:active_count`);
    client.emit('court:count', {
      courtId,
      count: parseInt(count || '0', 10),
    });
  }

  @SubscribeMessage('unsubscribe:court')
  handleUnsubscribeCourt(client: Socket, courtId: number) {
    client.leave(`court:${courtId}`);
  }

  async broadcastCountChange(courtId: number, count: number) {
    this.server.to(`court:${courtId}`).emit('court:count', { courtId, count });
  }
}
