/**
 * Jobs Controller Tests
 *
 * Jobs are backed by the SimulationsRepository (a job == a simulation run).
 */

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { JobsController } from '../jobs.controller';
import { SimulationRunnerService } from '../../services/simulation-runner.service';
import { SimulationEnginesService } from '../../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../../simulation-engines/engines/clifford-engine/clifford-engine';
import { InMemoryCircuitsRepository } from '../../repositories/in-memory-circuits.repository';
import { InMemorySimulationsRepository } from '../../repositories/in-memory-simulations.repository';
import { CreateSimulationInput } from '../../repositories/simulations.repository';

const req = { user: { userId: 'user-1' } };
const otherReq = { user: { userId: 'user-2' } };

const simInput = (over: Partial<CreateSimulationInput> = {}): CreateSimulationInput => ({
  circuitId: 'circuit-1',
  circuitName: 'Bell',
  engine: 'statevector',
  shots: 1024,
  numQubits: 2,
  status: 'completed',
  results: { statevector: [], probabilities: { '00': 0.5, '11': 0.5 }, counts: {} },
  executionTimeMs: 1.2,
  ...over,
});

describe('JobsController', () => {
  let controller: JobsController;
  let circuits: InMemoryCircuitsRepository;
  let simulations: InMemorySimulationsRepository;

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    circuits = new InMemoryCircuitsRepository();
    simulations = new InMemorySimulationsRepository();
    controller = new JobsController(simulations, circuits, new SimulationRunnerService(engines));
  });

  describe('listJobs', () => {
    it('lists the caller’s runs as jobs', async () => {
      await simulations.create('user-1', simInput({ circuitName: 'A' }));
      await simulations.create('user-2', simInput({ circuitName: 'Other' }));

      const result = await controller.listJobs(req, undefined, 1, 20);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0]).toMatchObject({
        type: 'simulation',
        status: 'completed',
        progress: 100,
      });
      expect(result.pagination.total).toBe(1);
    });

    it('filters by status', async () => {
      await simulations.create('user-1', simInput());
      expect((await controller.listJobs(req, 'completed', 1, 20)).jobs).toHaveLength(1);
      expect((await controller.listJobs(req, 'failed', 1, 20)).jobs).toHaveLength(0);
    });
  });

  describe('getJob / status / logs', () => {
    it('returns job details, status, and synthesized logs', async () => {
      const sim = await simulations.create('user-1', simInput());
      expect((await controller.getJob(sim.id, req)).id).toBe(sim.id);
      expect(await controller.getJobStatus(sim.id, req)).toEqual({
        id: sim.id,
        status: 'completed',
        progress: 100,
      });
      const logs = await controller.getJobLogs(sim.id, req, 100);
      expect(logs.logs.length).toBeGreaterThan(0);
      expect(logs.logs.join(' ')).toContain('Bell');
    });

    it('throws 404 for a missing or unowned job', async () => {
      const sim = await simulations.create('user-1', simInput());
      await expect(controller.getJob('nope', req)).rejects.toBeInstanceOf(NotFoundException);
      await expect(controller.getJob(sim.id, otherReq)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('cancelJob (delete)', () => {
    it('deletes a job', async () => {
      const sim = await simulations.create('user-1', simInput());
      expect(await controller.cancelJob(sim.id, req)).toEqual({ id: sim.id, deleted: true });
      await expect(controller.getJob(sim.id, req)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws 404 when deleting a missing job', async () => {
      await expect(controller.cancelJob('nope', req)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('retryJob', () => {
    it('re-runs the original stored circuit and records a new job', async () => {
      const circuit = await circuits.create('user-1', {
        name: 'Bell',
        numQubits: 2,
        operations: [
          { gate: 'h', targets: [0] },
          { gate: 'cnot', targets: [0, 1] },
        ],
      });
      const sim = await simulations.create('user-1', simInput({ circuitId: circuit.id }));

      const result = await controller.retryJob(sim.id, req);
      expect(result.newJobId).toMatch(/^sim-/);
      expect(result.newJobId).not.toBe(sim.id);
      expect(result.status).toBe('completed');

      // A new run now exists in history.
      const list = await controller.listJobs(req, undefined, 1, 20);
      expect(list.jobs).toHaveLength(2);
    });

    it('rejects retry when the circuit no longer exists', async () => {
      const sim = await simulations.create('user-1', simInput({ circuitId: 'gone' }));
      await expect(controller.retryJob(sim.id, req)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects retry for an ad-hoc job with no circuit', async () => {
      const sim = await simulations.create('user-1', simInput({ circuitId: null }));
      await expect(controller.retryJob(sim.id, req)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
