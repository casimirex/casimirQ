/**
 * Circuits Controller Tests
 *
 * Tests for circuits REST API endpoints, backed by the in-memory repository.
 */

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CircuitsController } from '../circuits.controller';
import { SimulationRunnerService } from '../../services/simulation-runner.service';
import { SimulationEnginesService } from '../../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../../simulation-engines/engines/clifford-engine/clifford-engine';
import { InMemoryCircuitsRepository } from '../../repositories/in-memory-circuits.repository';

describe('CircuitsController', () => {
  let controller: CircuitsController;
  const req = { user: { userId: 'user-1' } };
  const otherReq = { user: { userId: 'user-2' } };

  const bellOps = [
    { gate: 'h', targets: [0] },
    { gate: 'cnot', targets: [0, 1] },
  ];

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    controller = new CircuitsController(
      new SimulationRunnerService(engines),
      new InMemoryCircuitsRepository(),
    );
  });

  describe('createCircuit', () => {
    it('persists a new circuit and returns it', async () => {
      const result = await controller.createCircuit(
        { name: 'Bell', numQubits: 2, operations: bellOps },
        req,
      );
      expect(result.id).toMatch(/^circuit-/);
      expect(result).toMatchObject({ name: 'Bell', numQubits: 2, operationCount: 2 });
    });

    it('rejects a circuit with no name', async () => {
      await expect(controller.createCircuit({ numQubits: 2 } as any, req)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a circuit with an invalid gate', async () => {
      await expect(
        controller.createCircuit(
          { name: 'bad', numQubits: 1, operations: [{ gate: 'nope', targets: [0] }] },
          req,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('listCircuits', () => {
    it('returns only the caller’s circuits', async () => {
      await controller.createCircuit({ name: 'A', numQubits: 1 }, req);
      await controller.createCircuit({ name: 'B', numQubits: 1 }, req);
      await controller.createCircuit({ name: 'Other', numQubits: 1 }, otherReq);

      const result = await controller.listCircuits(req, 1, 20);
      expect(result.circuits).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.circuits.map((c) => c.name).sort()).toEqual(['A', 'B']);
    });

    it('paginates results', async () => {
      for (let i = 0; i < 5; i++) {
        await controller.createCircuit({ name: `C${i}`, numQubits: 1 }, req);
      }
      const page1 = await controller.listCircuits(req, 1, 2);
      expect(page1.circuits).toHaveLength(2);
      expect(page1.pagination.totalPages).toBe(3);
    });
  });

  describe('getCircuit', () => {
    it('returns a stored circuit', async () => {
      const created = await controller.createCircuit(
        { name: 'Bell', numQubits: 2, operations: bellOps },
        req,
      );
      const fetched = await controller.getCircuit(created.id, req);
      expect(fetched.id).toBe(created.id);
      expect(fetched.operations).toHaveLength(2);
    });

    it('throws 404 for a missing circuit', async () => {
      await expect(controller.getCircuit('nope', req)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not leak another user’s circuit', async () => {
      const created = await controller.createCircuit({ name: 'A', numQubits: 1 }, req);
      await expect(controller.getCircuit(created.id, otherReq)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateCircuit', () => {
    it('updates name and operations', async () => {
      const created = await controller.createCircuit({ name: 'A', numQubits: 2 }, req);
      const updated = await controller.updateCircuit(
        created.id,
        { name: 'Renamed', operations: bellOps },
        req,
      );
      expect(updated.name).toBe('Renamed');
      expect(updated.operationCount).toBe(2);
    });

    it('rejects invalid operations on update', async () => {
      const created = await controller.createCircuit({ name: 'A', numQubits: 2 }, req);
      await expect(
        controller.updateCircuit(created.id, { operations: [{ gate: 'x', targets: [9] }] }, req),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws 404 for a missing circuit', async () => {
      await expect(controller.updateCircuit('nope', { name: 'x' }, req)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('deleteCircuit', () => {
    it('deletes a stored circuit', async () => {
      const created = await controller.createCircuit({ name: 'A', numQubits: 1 }, req);
      await controller.deleteCircuit(created.id, req);
      await expect(controller.getCircuit(created.id, req)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws 404 when deleting a missing circuit', async () => {
      await expect(controller.deleteCircuit('nope', req)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('simulateCircuit', () => {
    it('simulates a stored circuit by id', async () => {
      const created = await controller.createCircuit(
        { name: 'Bell', numQubits: 2, operations: bellOps },
        req,
      );
      const result = await controller.simulateCircuit(created.id, { shots: 1000, seed: 1 }, req);
      expect(result).toHaveProperty('status', 'completed');
      expect(result.results.probabilities['00']).toBeCloseTo(0.5, 6);
      expect(result.results.probabilities['11']).toBeCloseTo(0.5, 6);
    });

    it('throws 404 when simulating a missing stored circuit', async () => {
      await expect(controller.simulateCircuit('nope', { shots: 10 }, req)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('still supports an inline circuit spec', async () => {
      const result = await controller.simulateCircuit(
        'ad-hoc',
        { numQubits: 2, operations: bellOps, shots: 512, seed: 2 },
        req,
      );
      expect(result.status).toBe('completed');
      const total = Object.values(result.results.counts).reduce((a, b) => a + b, 0);
      expect(total).toBe(512);
    });
  });
});
