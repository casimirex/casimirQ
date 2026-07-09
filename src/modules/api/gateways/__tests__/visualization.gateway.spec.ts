/**
 * Visualization Gateway Tests
 *
 * Tests for WebSocket visualization gateway
 */

import { VisualizationGateway } from '../visualization.gateway';

describe('VisualizationGateway', () => {
  let gateway: VisualizationGateway;

  beforeEach(() => {
    gateway = new VisualizationGateway();
    // Mock WebSocket server
    gateway.server = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    } as any;
  });

  const createMockSocket = (id: string): any => ({
    id,
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    data: {},
  });

  describe('handleConnection', () => {
    it('should handle client connection', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleConnection(socket);
      // Should log connection
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnection', () => {
      const socket = createMockSocket('socket-1');

      // First subscribe to a circuit
      gateway.handleCircuitSubscription(socket, { circuitId: 'circuit-1' });

      // Then disconnect
      gateway.handleDisconnect(socket);

      // Should clean up subscriptions
      expect(gateway.getActiveSubscriptions()).toBe(0);
    });
  });

  describe('handleCircuitSubscription', () => {
    it('should subscribe client to circuit updates', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleCircuitSubscription(socket, { circuitId: 'circuit-1' });

      expect(socket.join).toHaveBeenCalledWith('circuit:circuit-1');
      expect(socket.emit).toHaveBeenCalledWith('subscribed', {
        circuitId: 'circuit-1',
        success: true,
      });
    });

    it('should track active subscriptions', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleCircuitSubscription(socket, { circuitId: 'circuit-1' });

      expect(gateway.getActiveSubscriptions()).toBe(1);
    });
  });

  describe('handleCircuitUnsubscription', () => {
    it('should unsubscribe client from circuit', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleCircuitSubscription(socket, { circuitId: 'circuit-1' });
      gateway.handleCircuitUnsubscription(socket, { circuitId: 'circuit-1' });

      expect(socket.leave).toHaveBeenCalledWith('circuit:circuit-1');
      expect(socket.emit).toHaveBeenCalledWith('unsubscribed', {
        circuitId: 'circuit-1',
        success: true,
      });
    });

    it('should remove subscription tracking', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleCircuitSubscription(socket, { circuitId: 'circuit-1' });
      expect(gateway.getActiveSubscriptions()).toBe(1);

      gateway.handleCircuitUnsubscription(socket, { circuitId: 'circuit-1' });
      expect(gateway.getActiveSubscriptions()).toBe(0);
    });
  });

  describe('broadcastCircuitUpdate', () => {
    it('should broadcast circuit update to subscribed clients', () => {
      const data = {
        circuitId: 'circuit-1',
        qubitStates: [],
        probabilities: {},
        timestamp: Date.now(),
      };

      gateway.broadcastCircuitUpdate('circuit-1', data);

      expect(gateway.server.to).toHaveBeenCalledWith('circuit:circuit-1');
    });
  });

  describe('handleBlochStream', () => {
    it('should start Bloch sphere streaming', () => {
      jest.useFakeTimers();
      const socket = createMockSocket('socket-1');

      gateway.handleBlochStream(socket, { qubitId: 0 });

      // Should emit initial update
      jest.advanceTimersByTime(100);
      expect(socket.emit).toHaveBeenCalledWith(
        'bloch:update',
        expect.objectContaining({
          qubitId: 0,
          theta: expect.any(Number),
          phi: expect.any(Number),
          timestamp: expect.any(Number),
        }),
      );

      jest.useRealTimers();
    });
  });

  describe('handleProgressRequest', () => {
    it('should emit progress updates', () => {
      jest.useFakeTimers();
      const socket = createMockSocket('socket-1');

      gateway.handleProgressRequest(socket, { jobId: 'job-1' });

      jest.advanceTimersByTime(500);
      expect(socket.emit).toHaveBeenCalledWith(
        'job:progress',
        expect.objectContaining({
          jobId: 'job-1',
          progress: expect.any(Number),
          status: expect.any(String),
        }),
      );

      jest.useRealTimers();
    });
  });

  describe('getActiveCircuits', () => {
    it('should return list of active circuits', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleCircuitSubscription(socket, { circuitId: 'circuit-1' });
      gateway.handleCircuitSubscription(socket, { circuitId: 'circuit-2' });

      const circuits = gateway.getActiveCircuits();

      expect(circuits).toContain('circuit-1');
      expect(circuits).toContain('circuit-2');
    });
  });
});
