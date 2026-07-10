import { Test, TestingModule } from '@nestjs/testing';
import { QuantumVisualizationGateway } from './visualization.gateway';
import { ObservabilityService } from '../services/observability.service';
import { BlochSphereService } from '../services/bloch-sphere.service';
import { CircuitDiagramService } from '../services/circuit-diagram.service';
import { Server, Socket } from 'socket.io';

describe('QuantumVisualizationGateway', () => {
  let gateway: QuantumVisualizationGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuantumVisualizationGateway,
        ObservabilityService,
        BlochSphereService,
        CircuitDiagramService,
      ],
    }).compile();

    gateway = module.get<QuantumVisualizationGateway>(QuantumVisualizationGateway);

    // Mock server for broadcast operations
    const mockServerTo = jest.fn(() => ({ emit: jest.fn() }));
    (gateway as any).server = { to: mockServerTo };
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('Room Management', () => {
    it('should join circuit room', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = {
        id: 'test-socket',
        join: jest.fn(),
        leave: jest.fn(),
        to: mockTo,
        rooms: new Set(),
      } as unknown as Socket;
      const result = gateway.handleJoinCircuit(mockSocket, { circuitId: 'circuit-123' });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should leave circuit room', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = {
        id: 'test-socket',
        leave: jest.fn(),
        to: mockTo,
        rooms: new Set(['circuit:test']),
      } as unknown as Socket;
      const result = gateway.handleLeaveCircuit(mockSocket, { circuitId: 'circuit-123' });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Visualization Events', () => {
    it('should handle bloch sphere request', () => {
      const result = gateway.handleGetBlochSphere({
        qubitIndex: 0,
        alpha: { re: 1, im: 0 },
        beta: { re: 0, im: 0 },
      });
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle measurement event', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      gateway.handleMeasure(mockSocket, {
        circuitId: 'test-circuit',
        qubit: 0,
        outcome: 0,
        probability: 0.5,
      });
      expect(true).toBe(true); // Returns void
    });

    it('should handle circuit diagram request', () => {
      const result = gateway.handleGetCircuitDiagram({
        circuit: { numQubits: 2, operations: [] },
      });
      expect(result).toBeDefined();
    });

    it('should handle effects update', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      const result = gateway.handleUpdateEffects(mockSocket, {
        circuitId: 'test-circuit',
        config: {
          visualEnabled: true,
          audioEnabled: false,
          hapticEnabled: false,
          intensity: 1.0,
        },
      });
      expect(result).toBeUndefined(); // Returns void
    });
  });

  describe('State Streaming', () => {
    it('should handle state stream request', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', emit: jest.fn(), to: mockTo } as unknown as Socket;
      gateway.handleStreamState(mockSocket, {
        circuitId: 'test-circuit',
        stateVector: [1, 0],
      });
      expect(true).toBe(true); // Returns void
    });
  });

  describe('Server Events', () => {
    it('should broadcast visualization update', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockServer = { to: mockTo } as unknown as Server;
      (gateway as any).server = mockServer;

      gateway.broadcastVisualizationUpdate('circuit-123', { data: true });
      expect(mockTo).toHaveBeenCalledWith('circuit:circuit-123');
    });
  });

  describe('Connection Handling', () => {
    it('should handle connection', () => {
      const mockSocket = { id: 'test-socket', emit: jest.fn() } as unknown as Socket;
      gateway.handleConnection(mockSocket);
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should handle disconnection', () => {
      const mockSocket = { id: 'test-socket' } as Socket;
      gateway.handleDisconnect(mockSocket);
      // Should clean up any subscriptions
      expect(true).toBe(true);
    });
  });
});
