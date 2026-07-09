/**
 * Simulation Controller Tests
 *
 * Tests the repository-backed simulation history endpoints.
 */

import { NotFoundException } from '@nestjs/common';
import { SimulationController } from '../simulation.controller';
import { SimulationRunnerService } from '../../services/simulation-runner.service';
import { SimulationEnginesService } from '../../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../../simulation-engines/engines/clifford-engine/clifford-engine';
import { InMemoryCircuitsRepository } from '../../repositories/in-memory-circuits.repository';
import { InMemorySimulationsRepository } from '../../repositories/in-memory-simulations.repository';

describe('SimulationController', () => {
  let controller: SimulationController;
  let circuits: InMemoryCircuitsRepository;
  let simulations: InMemorySimulationsRepository;
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
    circuits = new InMemoryCircuitsRepository();
    simulations = new InMemorySimulationsRepository();
    controller = new SimulationController(
      simulations,
      circuits,
      new SimulationRunnerService(engines),
    );
  });

  describe('runSimulation', () => {
    it('runs a stored circuit, records it, and returns results', async () => {
      const circuit = await circuits.create('user-1', {
        name: 'Bell',
        numQubits: 2,
        operations: bellOps,
      });

      const result = await controller.runSimulation(
        { circuitId: circuit.id, shots: 1000, seed: 1 },
        req,
      );

      expect(result.id).toMatch(/^sim-/);
      expect(result.circuitName).toBe('Bell');
      expect(result.status).toBe('completed');
      expect(result.results.probabilities['00']).toBeCloseTo(0.5, 6);

      // It is now persisted in history.
      const list = await controller.listSimulations(req, 1, 20);
      expect(list.simulations).toHaveLength(1);
      expect(list.pagination.total).toBe(1);
    });

    it('throws 404 for a circuit the user does not own', async () => {
      const circuit = await circuits.create('user-1', { name: 'A', numQubits: 1 });
      await expect(
        controller.runSimulation({ circuitId: circuit.id }, otherReq),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listSimulations', () => {
    it('returns only the caller’s runs', async () => {
      const c1 = await circuits.create('user-1', { name: 'A', numQubits: 1 });
      const c2 = await circuits.create('user-2', { name: 'B', numQubits: 1 });
      await controller.runSimulation({ circuitId: c1.id }, req);
      await controller.runSimulation({ circuitId: c2.id }, otherReq);

      const list = await controller.listSimulations(req, 1, 20);
      expect(list.simulations).toHaveLength(1);
      expect(list.simulations[0].circuitName).toBe('A');
      // Summary should not include the full results payload.
      expect((list.simulations[0] as any).results).toBeUndefined();
    });
  });

  describe('getSimulation / getResults', () => {
    it('returns a stored run with results', async () => {
      const circuit = await circuits.create('user-1', {
        name: 'Bell',
        numQubits: 2,
        operations: bellOps,
      });
      const run = await controller.runSimulation({ circuitId: circuit.id }, req);

      const detail = await controller.getSimulation(run.id, req);
      expect(detail.id).toBe(run.id);
      expect(detail.results.probabilities['11']).toBeCloseTo(0.5, 6);

      const results = await controller.getResults(run.id, req);
      expect(results.results.counts).toBeDefined();
    });

    it('throws 404 for a missing simulation', async () => {
      await expect(controller.getSimulation('nope', req)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('does not leak another user’s run', async () => {
      const circuit = await circuits.create('user-1', { name: 'A', numQubits: 1 });
      const run = await controller.runSimulation({ circuitId: circuit.id }, req);
      await expect(controller.getSimulation(run.id, otherReq)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
