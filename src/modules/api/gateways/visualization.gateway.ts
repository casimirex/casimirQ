/**
 * Visualization WebSocket Gateway
 *
 * Provides real-time streaming for circuit visualization
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

interface CircuitData {
  circuitId: string;
  qubitStates: Array<{
    qubitId: number;
    theta: number;
    phi: number;
    amplitude: number;
  }>;
  probabilities: Record<string, number>;
  timestamp: number;
}

@WebSocketGateway({
  namespace: 'visualization',
  cors: {
    origin: '*',
  },
})
export class VisualizationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(VisualizationGateway.name);
  private readonly activeRooms = new Map<string, Set<string>>();

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove client from all rooms
    this.activeRooms.forEach((clients, roomId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.activeRooms.delete(roomId);
        }
      }
    });
  }

  /**
   * Subscribe to circuit visualization updates
   */
  @SubscribeMessage('subscribe:circuit')
  handleCircuitSubscription(client: Socket, payload: { circuitId: string }): void {
    const { circuitId } = payload;
    const roomId = `circuit:${circuitId}`;

    client.join(roomId);

    if (!this.activeRooms.has(roomId)) {
      this.activeRooms.set(roomId, new Set());
    }
    this.activeRooms.get(roomId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to ${roomId}`);

    // Acknowledge subscription
    client.emit('subscribed', {
      circuitId,
      success: true,
    });
  }

  /**
   * Unsubscribe from circuit updates
   */
  @SubscribeMessage('unsubscribe:circuit')
  handleCircuitUnsubscription(client: Socket, payload: { circuitId: string }): void {
    const { circuitId } = payload;
    const roomId = `circuit:${circuitId}`;

    client.leave(roomId);

    const clients = this.activeRooms.get(roomId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.activeRooms.delete(roomId);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from ${roomId}`);

    client.emit('unsubscribed', {
      circuitId,
      success: true,
    });
  }

  /**
   * Broadcast circuit state update
   */
  broadcastCircuitUpdate(circuitId: string, data: CircuitData): void {
    const roomId = `circuit:${circuitId}`;
    this.server.to(roomId).emit('circuit:update', data);
  }

  /**
   * Stream Bloch sphere updates
   */
  @SubscribeMessage('stream:bloch')
  handleBlochStream(client: Socket, payload: { qubitId: number }): void {
    const { qubitId } = payload;

    // Simulate Bloch sphere data stream
    const interval = setInterval(() => {
      const data = {
        qubitId,
        theta: Math.random() * Math.PI,
        phi: Math.random() * 2 * Math.PI,
        timestamp: Date.now(),
      };

      client.emit('bloch:update', data);
    }, 100);

    // Store interval for cleanup
    client.data.blochIntervals = client.data.blochIntervals || [];
    client.data.blochIntervals.push(interval);

    // Stop streaming after 10 seconds (demo purposes)
    setTimeout(() => {
      clearInterval(interval);
      client.emit('bloch:complete', { qubitId });
    }, 10000);
  }

  /**
   * Request simulation progress
   */
  @SubscribeMessage('request:progress')
  handleProgressRequest(client: Socket, payload: { jobId: string }): void {
    const { jobId } = payload;

    // Simulate progress updates
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;

      client.emit('job:progress', {
        jobId,
        progress,
        status: progress < 100 ? 'running' : 'completed',
      });

      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 500);
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptions(): number {
    let count = 0;
    this.activeRooms.forEach((clients) => {
      count += clients.size;
    });
    return count;
  }

  /**
   * Get active circuits being watched
   */
  getActiveCircuits(): string[] {
    return Array.from(this.activeRooms.keys())
      .filter((roomId) => roomId.startsWith('circuit:'))
      .map((roomId) => roomId.replace('circuit:', ''));
  }
}
