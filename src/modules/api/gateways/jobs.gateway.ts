/**
 * Jobs WebSocket Gateway
 *
 * Provides real-time job status updates
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface JobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error?: string;
  timestamp: number;
}

@WebSocketGateway({
  namespace: 'jobs',
  cors: {
    origin: '*',
  },
})
export class JobsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(JobsGateway.name);
  private readonly jobSubscriptions = new Map<string, Set<string>>();
  private readonly userSockets = new Map<string, string>(); // userId -> socketId

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Job client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Job client disconnected: ${client.id}`);

    // Remove from all job subscriptions
    this.jobSubscriptions.forEach((clients, jobId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.jobSubscriptions.delete(jobId);
        }
      }
    });

    // Remove from user mapping
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  /**
   * Authenticate and register user
   */
  @SubscribeMessage('auth:register')
  handleAuthRegister(client: Socket, payload: { userId: string }): void {
    const { userId } = payload;
    this.userSockets.set(userId, client.id);
    this.logger.log(`User ${userId} registered with socket ${client.id}`);
    client.emit('auth:confirmed', { userId, success: true });
  }

  /**
   * Subscribe to job updates
   */
  @SubscribeMessage('subscribe:job')
  handleJobSubscription(client: Socket, payload: { jobId: string }): void {
    const { jobId } = payload;
    const roomId = `job:${jobId}`;

    client.join(roomId);

    if (!this.jobSubscriptions.has(jobId)) {
      this.jobSubscriptions.set(jobId, new Set());
    }
    this.jobSubscriptions.get(jobId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to job ${jobId}`);

    client.emit('job:subscribed', { jobId, success: true });
  }

  /**
   * Unsubscribe from job updates
   */
  @SubscribeMessage('unsubscribe:job')
  handleJobUnsubscription(client: Socket, payload: { jobId: string }): void {
    const { jobId } = payload;
    const roomId = `job:${jobId}`;

    client.leave(roomId);

    const clients = this.jobSubscriptions.get(jobId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.jobSubscriptions.delete(jobId);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from job ${jobId}`);

    client.emit('job:unsubscribed', { jobId, success: true });
  }

  /**
   * Broadcast job status update
   */
  broadcastJobStatus(jobId: string, status: JobStatus): void {
    const roomId = `job:${jobId}`;
    this.server.to(roomId).emit('job:status', status);
  }

  /**
   * Broadcast job completion
   */
  broadcastJobComplete(jobId: string, result: any): void {
    const roomId = `job:${jobId}`;
    this.server.to(roomId).emit('job:complete', {
      jobId,
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast job error
   */
  broadcastJobError(jobId: string, error: string): void {
    const roomId = `job:${jobId}`;
    this.server.to(roomId).emit('job:error', {
      jobId,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * Get active job subscriptions
   */
  getActiveJobCount(): number {
    return this.jobSubscriptions.size;
  }

  /**
   * Get subscribers for a job
   */
  getJobSubscribers(jobId: string): number {
    return this.jobSubscriptions.get(jobId)?.size || 0;
  }
}
