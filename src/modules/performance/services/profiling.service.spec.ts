import { ProfilingService } from './profiling.service';

describe('ProfilingService', () => {
  let service: ProfilingService;

  beforeEach(() => {
    service = new ProfilingService({ enabled: true, sampleRate: 1.0 });
  });

  afterEach(() => {
    service.clearProfiles();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Operation Profiling', () => {
    it('should start and end operation', () => {
      const id = service.startOperation('test-op');
      expect(id).toBeTruthy();

      const profile = service.endOperation(id);
      expect(profile).toBeDefined();
      expect(profile?.operation).toBe('test-op');
      expect(profile?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should track operation duration', async () => {
      const id = service.startOperation('slow-op');
      await new Promise(r => setTimeout(r, 50));
      const profile = service.endOperation(id)!;

      expect(profile.durationMs).toBeGreaterThanOrEqual(40);
    });

    it('should handle metadata', () => {
      const id = service.startOperation('simulation', {
        numQubits: 5,
        numGates: 100
      });
      const profile = service.endOperation(id)!;

      expect(profile.numQubits).toBe(5);
      expect(profile.numGates).toBe(100);
    });

    it('should return null for invalid id', () => {
      const profile = service.endOperation('invalid-id');
      expect(profile).toBeNull();
    });

    it('should skip profiling when disabled', () => {
      const disabledService = new ProfilingService({ enabled: false });
      const id = disabledService.startOperation('test');
      expect(id).toBe('');
    });
  });

  describe('Statistics', () => {
    it('should calculate operation stats', () => {
      // Create multiple profiles
      for (let i = 0; i < 5; i++) {
        const id = service.startOperation('test-op');
        service.endOperation(id);
      }

      const stats = service.getOperationStats('test-op');
      expect(stats.count).toBe(5);
      expect(stats.avgDuration).toBeGreaterThanOrEqual(0);
    });

    it('should return zeros for unknown operation', () => {
      const stats = service.getOperationStats('unknown');
      expect(stats.count).toBe(0);
      expect(stats.avgDuration).toBe(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should get current metrics', () => {
      const metrics = service.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.activeConnections).toBe(0);
    });

    it('should track active operations', () => {
      const id1 = service.startOperation('op1');
      const id2 = service.startOperation('op2');

      let metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(2);

      service.endOperation(id1);
      metrics = service.getMetrics();
      expect(metrics.activeConnections).toBe(1);

      service.endOperation(id2);
    });
  });

  describe('Slow Operations', () => {
    it('should identify slow operations', async () => {
      const fastId = service.startOperation('fast');
      service.endOperation(fastId);

      const slowId = service.startOperation('slow');
      await new Promise(r => setTimeout(r, 100));
      service.endOperation(slowId);

      const slow = service.getSlowOperations(50);
      expect(slow.length).toBe(1);
      expect(slow[0].operation).toBe('slow');
    });
  });

  describe('Report Generation', () => {
    it('should generate performance report', () => {
      const id = service.startOperation('simulation');
      service.endOperation(id);

      const report = service.generateReport();
      expect(report).toContain('Performance Report');
      expect(report).toContain('simulation');
    });

    it('should include memory usage', () => {
      const report = service.generateReport();
      expect(report).toContain('Memory Usage');
    });
  });

  describe('Profile Management', () => {
    it('should get profiles by operation', () => {
      const id1 = service.startOperation('op1');
      const id2 = service.startOperation('op2');
      service.endOperation(id1);
      service.endOperation(id2);

      const profiles = service.getProfiles('op1');
      expect(profiles.length).toBeGreaterThan(0);
    });

    it('should clear all profiles', () => {
      const id = service.startOperation('test');
      service.endOperation(id);

      service.clearProfiles();
      const stats = service.getOperationStats('test');
      expect(stats.count).toBe(0);
    });
  });
});
