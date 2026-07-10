import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { BlochSphereService } from '../services/bloch-sphere.service';
import { ObservabilityService } from '../services/observability.service';
import { CircuitDiagramService } from '../services/circuit-diagram.service';
import { Circuit } from '../../circuit-engine/circuit';
import { Complex } from '../../../common/utils/complex';

/**
 * Quantum Visualization WebSocket Gateway
 *
 * Enables real-time collaborative visualization of quantum circuits:
 * - Live state streaming
 * - Synchronized measurements
 * - Multi-user Bloch sphere viewing
 * - "Universe looks back" shared effects
 */
@WebSocketGateway({
  namespace: '/visualization',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class QuantumVisualizationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(QuantumVisualizationGateway.name);

  /** Track active circuit sessions */
  private circuitSessions: Map<string, Set<string>> = new Map();

  constructor(
    private readonly blochSphereService: BlochSphereService,
    private readonly observabilityService: ObservabilityService,
    private readonly circuitDiagramService: CircuitDiagramService,
  ) {}

  /**
   * Handle client connection
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { clientId: client.id, timestamp: Date.now() });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from all circuit sessions
    this.circuitSessions.forEach((clients, circuitId) => {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.circuitSessions.delete(circuitId);
      }
    });
  }

  /**
   * Join a circuit visualization session
   */
  @SubscribeMessage('join-circuit')
  handleJoinCircuit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { circuitId: string; circuit?: unknown },
  ): { success: boolean; participants: number } {
    const { circuitId } = data;

    // Leave previous circuit rooms
    client.rooms.forEach((room: string) => {
      if (room.startsWith('circuit:')) {
        client.leave(room);
      }
    });

    // Join new circuit room
    const roomName = `circuit:${circuitId}`;
    client.join(roomName);

    // Track session
    if (!this.circuitSessions.has(circuitId)) {
      this.circuitSessions.set(circuitId, new Set());
    }
    this.circuitSessions.get(circuitId)!.add(client.id);

    const participants = this.circuitSessions.get(circuitId)!.size;
    this.logger.log(
      `Client ${client.id} joined circuit ${circuitId} (${participants} participants)`,
    );

    // Notify others
    client.to(roomName).emit('participant-joined', {
      clientId: client.id,
      participants,
      timestamp: Date.now(),
    });

    return { success: true, participants };
  }

  /**
   * Leave a circuit visualization session
   */
  @SubscribeMessage('leave-circuit')
  handleLeaveCircuit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { circuitId: string },
  ): { success: boolean } {
    const { circuitId } = data;
    const roomName = `circuit:${circuitId}`;

    client.leave(roomName);

    const clients = this.circuitSessions.get(circuitId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.circuitSessions.delete(circuitId);
      }
    }

    // Notify others
    client.to(roomName).emit('participant-left', {
      clientId: client.id,
      participants: clients?.size || 0,
      timestamp: Date.now(),
    });

    return { success: true };
  }

  /**
   * Request Bloch sphere data for a qubit
   */
  @SubscribeMessage('get-bloch-sphere')
  handleGetBlochSphere(
    @MessageBody()
    data: {
      qubitIndex: number;
      alpha: { re: number; im: number };
      beta: { re: number; im: number };
    },
  ): { data: unknown } {
    const alpha = new Complex(data.alpha.re, data.alpha.im);
    const beta = new Complex(data.beta.re, data.beta.im);

    const blochCoords = this.blochSphereService.amplitudesToBloch(alpha, beta);
    const state = {
      bloch: blochCoords,
      alpha: data.alpha,
      beta: data.beta,
      probabilities: this.blochSphereService.calculateProbabilities({ bloch: blochCoords } as any),
      isSuperposition: blochCoords.theta > 0.01 && blochCoords.theta < Math.PI - 0.01,
      entangledWith: [],
    };

    const blochData = this.blochSphereService.generateBlochSphereData(state);

    return { data: blochData };
  }

  /**
   * Broadcast measurement event to all participants
   */
  @SubscribeMessage('measure')
  handleMeasure(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { circuitId: string; qubit: number; outcome: 0 | 1; probability: number },
  ): void {
    const { circuitId, qubit, outcome, probability } = data;
    const roomName = `circuit:${circuitId}`;

    // Create measurement event
    const event = this.observabilityService.createMeasurementEvent(
      circuitId,
      qubit,
      outcome,
      probability,
      null as any, // preState
      null as any, // postState
      [], // entangledWith
    );

    // Broadcast to all participants
    this.server.to(roomName).emit('measurement', {
      ...event,
      measuredBy: client.id,
    });

    // Trigger "universe looks back" effect
    this.observabilityService.emitMeasurement(event);

    this.logger.debug(`Measurement broadcast: qubit ${qubit} = |${outcome}⟩ in ${circuitId}`);
  }

  /**
   * Stream circuit state updates
   */
  @SubscribeMessage('stream-state')
  handleStreamState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { circuitId: string; stateVector: unknown[] },
  ): void {
    const { circuitId, stateVector } = data;
    const roomName = `circuit:${circuitId}`;

    // Broadcast state update
    client.to(roomName).emit('state-update', {
      circuitId,
      stateVector,
      timestamp: Date.now(),
      fromClient: client.id,
    });
  }

  /**
   * Request circuit diagram
   */
  @SubscribeMessage('get-circuit-diagram')
  handleGetCircuitDiagram(@MessageBody() data: { circuit: unknown }): {
    svg: string;
    json: unknown;
  } {
    const circuit = data.circuit as Circuit;

    const svg = this.circuitDiagramService.generateSVG(circuit);
    const json = this.circuitDiagramService.exportToJSON(circuit);

    return { svg, json };
  }

  /**
   * Update effect configuration
   */
  @SubscribeMessage('update-effects')
  handleUpdateEffects(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { circuitId: string; config: unknown },
  ): void {
    const { circuitId, config } = data;
    const roomName = `circuit:${circuitId}`;

    // Broadcast config update
    client.to(roomName).emit('effects-updated', {
      config,
      updatedBy: client.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast visualization update to circuit participants
   */
  broadcastVisualizationUpdate(circuitId: string, update: unknown): void {
    const roomName = `circuit:${circuitId}`;
    this.server.to(roomName).emit('visualization-update', update);
  }

  /**
   * Get active circuit sessions
   */
  getActiveSessions(): { circuitId: string; participants: number }[] {
    return Array.from(this.circuitSessions.entries()).map(([circuitId, clients]) => ({
      circuitId,
      participants: clients.size,
    }));
  }

  /**
   * Get participants in a circuit session
   */
  getSessionParticipants(circuitId: string): string[] {
    const clients = this.circuitSessions.get(circuitId);
    return clients ? Array.from(clients) : [];
  }
}
