/**
 * Jobs Gateway Tests
 *
 * Tests for WebSocket jobs gateway
 */

import { JobsGateway } from '../jobs.gateway';

describe('JobsGateway', () => {
  let gateway: JobsGateway;

  beforeEach(() => {
    gateway = new JobsGateway();
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
    });
  });

  describe('handleDisconnect', () => {
    it('should handle client disconnection', () => {
      const socket = createMockSocket('socket-1');

      // Register and subscribe
      gateway.handleAuthRegister(socket, { userId: 'user-1' });
      gateway.handleJobSubscription(socket, { jobId: 'job-1' });

      // Disconnect
      gateway.handleDisconnect(socket);

      expect(gateway.getActiveJobCount()).toBe(0);
    });
  });

  describe('handleAuthRegister', () => {
    it('should register user with socket', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleAuthRegister(socket, { userId: 'user-1' });

      expect(socket.emit).toHaveBeenCalledWith('auth:confirmed', {
        userId: 'user-1',
        success: true,
      });
    });
  });

  describe('handleJobSubscription', () => {
    it('should subscribe client to job updates', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleJobSubscription(socket, { jobId: 'job-1' });

      expect(socket.join).toHaveBeenCalledWith('job:job-1');
      expect(socket.emit).toHaveBeenCalledWith('job:subscribed', {
        jobId: 'job-1',
        success: true,
      });
    });

    it('should track active job subscriptions', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleJobSubscription(socket, { jobId: 'job-1' });

      expect(gateway.getActiveJobCount()).toBe(1);
    });
  });

  describe('handleJobUnsubscription', () => {
    it('should unsubscribe client from job', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleJobSubscription(socket, { jobId: 'job-1' });
      gateway.handleJobUnsubscription(socket, { jobId: 'job-1' });

      expect(socket.leave).toHaveBeenCalledWith('job:job-1');
      expect(socket.emit).toHaveBeenCalledWith('job:unsubscribed', {
        jobId: 'job-1',
        success: true,
      });
    });

    it('should remove job subscription tracking', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleJobSubscription(socket, { jobId: 'job-1' });
      expect(gateway.getActiveJobCount()).toBe(1);

      gateway.handleJobUnsubscription(socket, { jobId: 'job-1' });
      expect(gateway.getActiveJobCount()).toBe(0);
    });
  });

  describe('broadcastJobStatus', () => {
    it('should broadcast job status to subscribers', () => {
      const status = {
        jobId: 'job-1',
        status: 'running' as const,
        progress: 50,
        timestamp: Date.now(),
      };

      gateway.broadcastJobStatus('job-1', status);

      expect(gateway.server.to).toHaveBeenCalledWith('job:job-1');
    });
  });

  describe('broadcastJobComplete', () => {
    it('should broadcast job completion', () => {
      const result = { success: true, data: {} };

      gateway.broadcastJobComplete('job-1', result);

      expect(gateway.server.to).toHaveBeenCalledWith('job:job-1');
    });
  });

  describe('broadcastJobError', () => {
    it('should broadcast job error', () => {
      gateway.broadcastJobError('job-1', 'Simulation failed');

      expect(gateway.server.to).toHaveBeenCalledWith('job:job-1');
    });
  });

  describe('getJobSubscribers', () => {
    it('should return subscriber count for a job', () => {
      const socket = createMockSocket('socket-1');
      gateway.handleJobSubscription(socket, { jobId: 'job-1' });

      expect(gateway.getJobSubscribers('job-1')).toBe(1);
    });

    it('should return 0 for non-existent job', () => {
      expect(gateway.getJobSubscribers('non-existent')).toBe(0);
    });
  });
});
