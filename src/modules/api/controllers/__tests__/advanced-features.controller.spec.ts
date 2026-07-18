/**
 * Advanced Features Controller Tests
 *
 * Verifies the QEC / noise / ML endpoints are backed by the real services.
 */

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdvancedFeaturesController } from '../advanced-features.controller';
import {
  ErrorCorrectionService,
  NoiseModelingService,
  QuantumMLService,
} from '../../../advanced-features/services';
import { NoiseSimulationService } from '../../services/noise-simulation.service';

describe('AdvancedFeaturesController', () => {
  let controller: AdvancedFeaturesController;
  let ec: ErrorCorrectionService;
  let ml: QuantumMLService;
  let noiseSimRun: jest.Mock;

  beforeEach(() => {
    ec = new ErrorCorrectionService();
    ml = new QuantumMLService();
    noiseSimRun = jest.fn().mockReturnValue({
      numQubits: 1,
      probabilities: { '0': 0.5, '1': 0.5 },
      counts: { '0': 500, '1': 500 },
      purity: 0.5,
      executionTimeMs: 0.1,
    });
    const noiseSim = { run: noiseSimRun } as unknown as NoiseSimulationService;
    controller = new AdvancedFeaturesController(ec, new NoiseModelingService(), ml, noiseSim);
  });

  describe('error correction', () => {
    it('lists real QEC codes with properties', async () => {
      const { codes } = await controller.getQECCodes();
      expect(codes.length).toBeGreaterThan(0);
      expect(codes[0]).toHaveProperty('nPhysical');
      expect(codes[0]).toHaveProperty('distance');
    });

    it('encodes a logical state with a real code', async () => {
      const codeId = ec.getAvailableCodes()[0];
      const result = await controller.encodeCircuit(codeId, {});
      expect(result.code).toBe(codeId);
      expect(result.nPhysical).toBeGreaterThan(result.nLogical);
    });

    it('throws 404 for an unknown code', async () => {
      await expect(controller.encodeCircuit('bogus', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('measures a syndrome for an error-free encoded state (all zeros)', async () => {
      const codeId = ec.getAvailableCodes()[0];
      const result = await controller.measureSyndrome({ code: codeId });
      expect(Array.isArray(result.syndrome)).toBe(true);
      expect(result.syndrome.every((s) => s === 0)).toBe(true);
    });
  });

  describe('noise modeling', () => {
    it('lists channels and real device models', async () => {
      const result = await controller.getNoiseChannels();
      expect(result.channels.map((c) => c.id)).toContain('depolarizing');
      expect(Array.isArray(result.models)).toBe(true);
    });

    it('validates noise channel params', async () => {
      const result = await controller.applyNoise({
        channels: [
          { type: 'depolarizing', params: { pDepolarizing: 0.1 }, targets: [0] },
          { type: 'depolarizing', params: { pDepolarizing: 5 }, targets: [0] }, // invalid
        ],
      });
      expect(result.channels[0].valid).toBe(true);
      expect(result.channels[1].valid).toBe(false);
      expect(result.allValid).toBe(false);
    });

    it('delegates density-matrix noise simulation to the service', async () => {
      const res = await controller.simulateNoise({
        numQubits: 1,
        operations: [{ gate: 'x', targets: [0] }],
        noise: [{ type: 'depolarizing', params: { p: 1 } }],
        shots: 1000,
      });
      expect(noiseSimRun).toHaveBeenCalledTimes(1);
      expect(res.engine).toBe('density-matrix');
      expect(res.purity).toBe(0.5);
      expect(res.probabilities).toEqual({ '0': 0.5, '1': 0.5 });
    });

    it('characterizes a real device model', async () => {
      const model = new NoiseModelingService().getAvailableModels()[0];
      const result = await controller.characterizeNoise({ model });
      expect(result.model).toBe(model);
      expect(result.characteristics).toBeDefined();
    });

    it('throws 404 for an unknown model', async () => {
      await expect(controller.characterizeNoise({ model: 'nope' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('quantum ML', () => {
    it('lists ansatze and feature maps', async () => {
      const result = await controller.getVQEAnsatzTypes();
      expect(result.ansatze.length).toBeGreaterThan(0);
      expect(result.featureMaps.length).toBeGreaterThan(0);
    });

    it('runs a real VQE optimization', async () => {
      const ansatz = ml.getAvailableAnsatze()[0];
      const result = await controller.runVQE({
        hamiltonian: [
          { pauli: 'ZZ', coefficient: 1 },
          { pauli: 'XI', coefficient: 0.5 },
        ],
        ansatz,
        maxIterations: 20,
      });
      expect(typeof result.minEnergy).toBe('number');
      expect(Array.isArray(result.optimalParams)).toBe(true);
      expect(result.iterations).toBeGreaterThan(0);
    });

    it('rejects an unknown ansatz', async () => {
      await expect(
        controller.runVQE({ hamiltonian: [{ pauli: 'Z', coefficient: 1 }], ansatz: 'nope' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('computes a real symmetric kernel matrix', async () => {
      const data = [
        [0, 1],
        [1, 0],
        [1, 1],
      ];
      const result = await controller.getKernelMatrix({ data });
      expect(result.size).toEqual([3, 3]);
      expect(result.matrix).toHaveLength(3);
      // Kernel matrices are symmetric with a unit diagonal.
      expect(result.matrix[0][0]).toBeCloseTo(1, 5);
      expect(result.matrix[0][1]).toBeCloseTo(result.matrix[1][0], 5);
    });

    it('rejects empty kernel data', async () => {
      await expect(controller.getKernelMatrix({ data: [] })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
