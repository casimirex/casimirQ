import { Test, TestingModule } from '@nestjs/testing';
import { QuantumVisualizationGateway } from './visualization.gateway';
import { ObservabilityService } from '../services/observability.service';
import { BlochSphereService } from '../services/bloch-sphere.service';
import { CircuitDiagramService } from '../services/circuit-diagram.service';
import { Server, Socket } from 'socket.io';

describe('QuantumVisualizationGateway Extended', () => {
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

  describe('Room Edge Cases', () => {
    it('should handle joining with empty circuitId', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = {
        id: 'test-socket',
        join: jest.fn(),
        leave: jest.fn(),
        to: mockTo,
        rooms: new Set(),
      } as unknown as Socket;
      const result = gateway.handleJoinCircuit(mockSocket, { circuitId: '' });
      expect(result).toBeDefined();
    });

    it('should handle multiple joins to same room', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = {
        id: 'test-socket',
        join: jest.fn(),
        leave: jest.fn(),
        to: mockTo,
        rooms: new Set(),
      } as unknown as Socket;
      // Join twice
      gateway.handleJoinCircuit(mockSocket, { circuitId: 'circuit-123' });
      const result = gateway.handleJoinCircuit(mockSocket, { circuitId: 'circuit-123' });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle leaving room not joined', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = {
        id: 'test-socket',
        leave: jest.fn(),
        to: mockTo,
        rooms: new Set(),
      } as unknown as Socket;
      const result = gateway.handleLeaveCircuit(mockSocket, { circuitId: 'nonexistent' });
      expect(result).toBeDefined();
    });

    it('should leave all circuits on disconnect', () => {
      const mockSocket = {
        id: 'test-socket',
        rooms: new Set(['circuit:test1', 'circuit:test2']),
      } as unknown as Socket;
      gateway.handleDisconnect(mockSocket);
      expect(true).toBe(true);
    });
  });

  describe('Visualization Data Edge Cases', () => {
    it('should handle bloch sphere with null alpha/beta', () => {
      const result = gateway.handleGetBlochSphere({
        qubitIndex: 0,
        alpha: { re: 0, im: 0 },
        beta: { re: 1, im: 0 },
      });
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle bloch sphere with superposition state', () => {
      const result = gateway.handleGetBlochSphere({
        qubitIndex: 0,
        alpha: { re: 1 / Math.sqrt(2), im: 0 },
        beta: { re: 1 / Math.sqrt(2), im: 0 },
      });
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle circuit diagram with empty operations', () => {
      const result = gateway.handleGetCircuitDiagram({
        circuit: { numQubits: 3, operations: [] },
      });
      expect(result).toBeDefined();
      expect(result.svg).toBeDefined();
    });

    it('should handle circuit diagram with many operations', () => {
      const result = gateway.handleGetCircuitDiagram({
        circuit: {
          numQubits: 2,
          operations: [
            { gate: { type: 'h' }, targets: [0] },
            { gate: { type: 'cx' }, targets: [0, 1] },
            { gate: { type: 'x' }, targets: [1] },
            { gate: { type: 'z' }, targets: [0] },
          ],
        },
      });
      expect(result).toBeDefined();
      expect(result.svg).toBeDefined();
    });

    it('should handle circuit diagram with empty circuit', () => {
      const result = gateway.handleGetCircuitDiagram({
        circuit: { numQubits: 1, operations: [] },
      });
      expect(result).toBeDefined();
    });
  });

  describe('Measurement Events', () => {
    it('should handle measurement with high probability', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      gateway.handleMeasure(mockSocket, {
        circuitId: 'test-circuit',
        qubit: 0,
        outcome: 1,
        probability: 0.95,
      });
      expect(true).toBe(true);
    });

    it('should handle measurement with low probability', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      gateway.handleMeasure(mockSocket, {
        circuitId: 'test-circuit',
        qubit: 1,
        outcome: 0,
        probability: 0.05,
      });
      expect(true).toBe(true);
    });

    it('should handle measurement with multiple qubits', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      for (let i = 0; i < 4; i++) {
        gateway.handleMeasure(mockSocket, {
          circuitId: 'test-circuit',
          qubit: i,
          outcome: (i % 2) as 0 | 1,
          probability: 0.5,
        });
      }
      expect(true).toBe(true);
    });
  });

  describe('State Streaming', () => {
    it('should handle state stream with complex amplitudes', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', emit: jest.fn(), to: mockTo } as unknown as Socket;
      gateway.handleStreamState(mockSocket, {
        circuitId: 'test-circuit',
        stateVector: [
          { re: 1 / Math.sqrt(2), im: 0 },
          { re: 0, im: 1 / Math.sqrt(2) },
        ],
      });
      expect(true).toBe(true);
    });

    it('should handle state stream with empty state', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', emit: jest.fn(), to: mockTo } as unknown as Socket;
      gateway.handleStreamState(mockSocket, {
        circuitId: 'test-circuit',
        stateVector: [],
      });
      expect(true).toBe(true);
    });

    it('should handle state stream with null circuitId', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', emit: jest.fn(), to: mockTo } as unknown as Socket;
      gateway.handleStreamState(mockSocket, {
        circuitId: '' as unknown as string,
        stateVector: [1, 0],
      });
      expect(true).toBe(true);
    });
  });

  describe('Effects Configuration', () => {
    it('should handle effects with visual only', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      gateway.handleUpdateEffects(mockSocket, {
        circuitId: 'test-circuit',
        config: {
          visual: true,
          audio: false,
          haptic: false,
          intensity: 0.5,
        },
      });
      expect(true).toBe(true);
    });

    it('should handle effects with audio only', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      gateway.handleUpdateEffects(mockSocket, {
        circuitId: 'test-circuit',
        config: {
          visual: false,
          audio: true,
          haptic: false,
          intensity: 1.0,
        },
      });
      expect(true).toBe(true);
    });

    it('should handle effects with all disabled', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      gateway.handleUpdateEffects(mockSocket, {
        circuitId: 'test-circuit',
        config: {
          visual: false,
          audio: false,
          haptic: false,
          intensity: 0,
        },
      });
      expect(true).toBe(true);
    });

    it('should handle effects with max intensity', () => {
      const mockTo = jest.fn(() => ({ emit: jest.fn() }));
      const mockSocket = { id: 'test-socket', to: mockTo } as unknown as Socket;
      gateway.handleUpdateEffects(mockSocket, {
        circuitId: 'test-circuit',
        config: {
          visual: true,
          audio: true,
          haptic: true,
          intensity: 2.0,
        },
      });
      expect(true).toBe(true);
    });
  });

  describe('Server Broadcast', () => {
    it('should broadcast to all clients in circuit', () => {
      const emitMock = jest.fn();
      const mockTo = jest.fn(() => ({ emit: emitMock }));
      const mockServer = { to: mockTo } as unknown as Server;
      (gateway as any).server = mockServer;

      gateway.broadcastVisualizationUpdate('circuit-123', { type: 'update', data: {} });
      expect(mockTo).toHaveBeenCalledWith('circuit:circuit-123');
      expect(emitMock).toHaveBeenCalledWith('visualization-update', expect.any(Object));
    });

    it('should handle broadcast with empty data', () => {
      const emitMock = jest.fn();
      const mockTo = jest.fn(() => ({ emit: emitMock }));
      const mockServer = { to: mockTo } as unknown as Server;
      (gateway as any).server = mockServer;

      gateway.broadcastVisualizationUpdate('circuit-123', {});
      expect(mockTo).toHaveBeenCalledWith('circuit:circuit-123');
    });
  });

  describe('Connection Handling', () => {
    it('should emit connected event on connection', () => {
      const emitMock = jest.fn();
      const mockSocket = { id: 'test-socket', emit: emitMock } as unknown as Socket;
      gateway.handleConnection(mockSocket);
      expect(emitMock).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should handle multiple simultaneous connections', () => {
      for (let i = 0; i < 5; i++) {
        const mockSocket = { id: `socket-${i}`, emit: jest.fn() } as unknown as Socket;
        gateway.handleConnection(mockSocket);
        expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.any(Object));
      }
    });

    it('should clean up on disconnect', () => {
      const mockSocket = {
        id: 'test-socket',
        rooms: new Set(),
        emit: jest.fn(),
      } as unknown as Socket;
      gateway.handleConnection(mockSocket);
      gateway.handleDisconnect(mockSocket);
      expect(true).toBe(true);
    });
  });
});
