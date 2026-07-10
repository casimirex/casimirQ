/**
 * Advanced Orchestration Controller Tests — batch execution + pipelines.
 */

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdvancedOrchestrationController } from '../advanced-orchestration.controller';
import { SimulationRunnerService } from '../../services/simulation-runner.service';
import { SimulationEnginesService } from '../../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../../simulation-engines/engines/clifford-engine/clifford-engine';
import { CircuitDiagramService } from '../../../visualization/services/circuit-diagram.service';
import { CircuitOptimizerService } from '../../../performance/services/circuit-optimizer.service';
import { InMemoryCircuitsRepository } from '../../repositories/in-memory-circuits.repository';
import { InMemorySimulationsRepository } from '../../repositories/in-memory-simulations.repository';
import { InMemoryBatchesRepository } from '../../repositories/in-memory-batches.repository';

const req = { user: { userId: 'user-1' } };
const otherReq = { user: { userId: 'user-2' } };
const bellOps = [
  { gate: 'h', targets: [0] },
  { gate: 'cnot', targets: [0, 1] },
];

describe('AdvancedOrchestrationController', () => {
  let controller: AdvancedOrchestrationController;
  let circuits: InMemoryCircuitsRepository;
  let simulations: InMemorySimulationsRepository;
  let batches: InMemoryBatchesRepository;

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    circuits = new InMemoryCircuitsRepository();
    simulations = new InMemorySimulationsRepository();
    batches = new InMemoryBatchesRepository();
    controller = new AdvancedOrchestrationController(
      batches,
      circuits,
      simulations,
      new SimulationRunnerService(engines),
      new CircuitDiagramService(),
      new CircuitOptimizerService(),
    );
  });

  async function makeCircuit(name: string) {
    return circuits.create('user-1', { name, numQubits: 2, operations: bellOps });
  }

  describe('batch execute', () => {
    it('runs each stored circuit, records simulations, and persists the batch', async () => {
      const a = await makeCircuit('A');
      const b = await makeCircuit('B');

      const batch = await controller.batchExecute(
        { circuitIds: [a.id, b.id], shots: 100, seed: 1 },
        req,
      );
      expect(batch.status).toBe('completed');
      expect(batch.total).toBe(2);
      expect(batch.succeeded).toBe(2);

      // Each circuit produced a simulation.
      const sims = await simulations.findAll('user-1', { page: 1, limit: 20 });
      expect(sims.total).toBe(2);

      // Results resolve the recorded runs.
      const results = await controller.getBatchResults(batch.batchId, req);
      expect(results.results).toHaveLength(2);
      expect(results.results[0].probabilities).not.toBeNull();
    });

    it('marks missing circuits as failed (partial batch)', async () => {
      const a = await makeCircuit('A');
      const batch = await controller.batchExecute({ circuitIds: [a.id, 'ghost'] }, req);
      expect(batch.status).toBe('partial');
      expect(batch.succeeded).toBe(1);
      expect(batch.failed).toBe(1);
    });

    it('rejects an empty circuit list', async () => {
      await expect(controller.batchExecute({ circuitIds: [] }, req)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('404s batch results for another user', async () => {
      const a = await makeCircuit('A');
      const batch = await controller.batchExecute({ circuitIds: [a.id] }, req);
      await expect(controller.getBatchResults(batch.batchId, otherReq)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('pipeline run', () => {
    it('runs validate/optimize/diagram/simulate stages over a circuit', async () => {
      const c = await makeCircuit('P');
      const result = await controller.runPipeline(
        {
          circuitId: c.id,
          stages: [
            { type: 'validate' },
            { type: 'optimize' },
            { type: 'diagram' },
            { type: 'simulate' },
          ],
          shots: 0,
        },
        req,
      );
      expect(result.stages).toHaveLength(4);
      expect(result.stages.every((s) => s.success)).toBe(true);
      const simulate = result.stages.find((s) => s.stage === 'simulate')! as any;
      expect(simulate.result.probabilities['00']).toBeCloseTo(0.5, 6);
    });

    it('rejects an unknown stage', async () => {
      const c = await makeCircuit('P');
      await expect(
        controller.runPipeline({ circuitId: c.id, stages: [{ type: 'bogus' }] }, req),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404s for a missing circuit', async () => {
      await expect(
        controller.runPipeline({ circuitId: 'nope', stages: [{ type: 'validate' }] }, req),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
