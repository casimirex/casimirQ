/**
 * Advanced Features Controller Tests
 *
 * Tests for QEC, noise modeling, and quantum ML endpoints
 */

import { AdvancedFeaturesController } from '../advanced-features.controller';

describe('AdvancedFeaturesController', () => {
  let controller: AdvancedFeaturesController;

  beforeEach(() => {
    controller = new AdvancedFeaturesController();
  });

  // === Error Correction Tests ===

  describe('getQECCodes', () => {
    it('should return available QEC codes', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.getQECCodes(req);

      expect(result).toHaveProperty('codes');
      expect(result.codes).toBeInstanceOf(Array);
      expect(result.codes.length).toBeGreaterThan(0);

      const steane = result.codes.find((c) => c.id === 'steane');
      expect(steane).toBeDefined();
      expect(steane).toHaveProperty('name');
      expect(steane).toHaveProperty('distance');
    });
  });

  describe('encodeCircuit', () => {
    it('should encode circuit with QEC code', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = { circuitId: 'circuit-123', qubits: [0, 1] };
      const result = await controller.encodeCircuit('steane', body, req);

      expect(result).toHaveProperty('encodedCircuitId');
      expect(result).toHaveProperty('code', 'steane');
      expect(result).toHaveProperty('physicalQubits');
      expect(result).toHaveProperty('logicalQubits');
    });
  });

  describe('measureSyndrome', () => {
    it('should measure syndrome', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = { circuitId: 'circuit-123' };
      const result = await controller.measureSyndrome(body, req);

      expect(result).toHaveProperty('syndrome');
      expect(result).toHaveProperty('corrected');
    });
  });

  // === Noise Modeling Tests ===

  describe('getNoiseChannels', () => {
    it('should return noise channel types', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.getNoiseChannels(req);

      expect(result).toHaveProperty('channels');
      expect(result.channels).toBeInstanceOf(Array);

      const depolarizing = result.channels.find((c) => c.id === 'depolarizing');
      expect(depolarizing).toBeDefined();
      expect(depolarizing).toHaveProperty('params');
    });
  });

  describe('applyNoise', () => {
    it('should apply noise channels to circuit', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = {
        circuitId: 'circuit-123',
        channels: [
          { type: 'depolarizing', params: { probability: 0.01 }, targets: [0] },
        ],
      };
      const result = await controller.applyNoise(body, req);

      expect(result).toHaveProperty('noisyCircuitId');
      expect(result).toHaveProperty('channelsApplied');
      expect(result).toHaveProperty('noiseLevel');
    });
  });

  describe('characterizeNoise', () => {
    it('should characterize noise using gate set', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = { circuitId: 'circuit-123', method: 'gate' as const };
      const result = await controller.characterizeNoise(body, req);

      expect(result).toHaveProperty('method', 'gate');
      expect(result).toHaveProperty('parameters');
    });

    it('should characterize noise using measurement', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = { circuitId: 'circuit-123', method: 'measurement' as const };
      const result = await controller.characterizeNoise(body, req);

      expect(result.method).toBe('measurement');
    });
  });

  // === Quantum ML Tests ===

  describe('getVQEAnsatzTypes', () => {
    it('should return VQE ansatz types', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.getVQEAnsatzTypes(req);

      expect(result).toHaveProperty('ansatzes');
      expect(result.ansatzes).toBeInstanceOf(Array);

      const uccsd = result.ansatzes.find((a) => a.id === 'uccsd');
      expect(uccsd).toBeDefined();
      expect(uccsd).toHaveProperty('name');
      expect(uccsd).toHaveProperty('description');
    });
  });

  describe('runVQE', () => {
    it('should queue VQE optimization', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = {
        hamiltonian: [[1, 0], [0, -1]],
        ansatz: 'uccsd',
      };
      const result = await controller.runVQE(body, req);

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status', 'queued');
      expect(result).toHaveProperty('ansatz', 'uccsd');
      expect(result).toHaveProperty('maxIterations');
    });

    it('should use custom optimizer settings', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = {
        hamiltonian: [[1, 0], [0, -1]],
        ansatz: 'hardware_efficient',
        optimizer: 'SPSA',
        maxIterations: 200,
      };
      const result = await controller.runVQE(body, req);

      expect(result.optimizer).toBe('SPSA');
      expect(result.maxIterations).toBe(200);
    });
  });

  describe('trainClassifier', () => {
    it('should queue classifier training', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = {
        data: [[1, 2], [3, 4]],
        labels: [0, 1],
      };
      const result = await controller.trainClassifier(body, req);

      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status', 'queued');
      expect(result).toHaveProperty('epochs');
    });

    it('should support custom feature map and epochs', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = {
        data: [[1, 2]],
        labels: [0],
        featureMap: 'custom',
        epochs: 50,
      };
      const result = await controller.trainClassifier(body, req);

      expect(result.featureMap).toBe('custom');
      expect(result.epochs).toBe(50);
    });
  });

  describe('getKernelMatrix', () => {
    it('should return kernel matrix', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = { data: [[1, 2], [3, 4], [5, 6]] };
      const result = await controller.getKernelMatrix(body, req);

      expect(result).toHaveProperty('size');
      expect(result.size).toEqual([3, 3]);
      expect(result).toHaveProperty('matrix');
      expect(result.matrix).toBeInstanceOf(Array);
      expect(result.matrix).toHaveLength(3);
    });

    it('should use custom gamma parameter', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = { data: [[1, 2]], gamma: 2.0 };
      const result = await controller.getKernelMatrix(body, req);

      expect(result.gamma).toBe(2.0);
    });
  });

  // === Multi-Circuit Execution Tests ===

  describe('batchExecute', () => {
    it('should queue batch execution', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = {
        circuitIds: ['circuit-1', 'circuit-2', 'circuit-3'],
        shots: 1024,
      };
      const result = await controller.batchExecute(body, req);

      expect(result).toHaveProperty('batchId');
      expect(result).toHaveProperty('circuits', 3);
      expect(result).toHaveProperty('status', 'queued');
    });

    it('should calculate estimated time based on circuit count', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = {
        circuitIds: ['circuit-1', 'circuit-2'],
      };
      const result = await controller.batchExecute(body, req);

      expect(result.estimatedTime).toBe(2000);
    });
  });

  describe('getBatchResults', () => {
    it('should return batch results', async () => {
      const req = { user: { userId: 'user-1' } };
      const result = await controller.getBatchResults('batch-123', req);

      expect(result).toHaveProperty('batchId', 'batch-123');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('results');
    });
  });

  describe('createPipeline', () => {
    it('should create pipeline', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = {
        name: 'Test Pipeline',
        stages: [
          { type: 'compile', config: {} },
          { type: 'execute', config: { shots: 1024 } },
        ],
      };
      const result = await controller.createPipeline(body, req);

      expect(result).toHaveProperty('pipelineId');
      expect(result).toHaveProperty('name', 'Test Pipeline');
      expect(result).toHaveProperty('stages', 2);
      expect(result).toHaveProperty('status', 'created');
    });
  });

  describe('runPipeline', () => {
    it('should run pipeline', async () => {
      const req = { user: { userId: 'user-1' } };
      const body = { input: { circuitId: 'circuit-123' } };
      const result = await controller.runPipeline('pipeline-123', body, req);

      expect(result).toHaveProperty('pipelineId', 'pipeline-123');
      expect(result).toHaveProperty('runId');
      expect(result).toHaveProperty('status', 'running');
      expect(result).toHaveProperty('input');
    });
  });
});
