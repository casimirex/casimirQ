/**
 * Visualization Controller Tests
 *
 * Verifies the endpoints are backed by real stored data: reduced-density-matrix
 * Bloch vectors, real SVG diagrams, and histograms/3D state from run results.
 */

import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VisualizationController } from '../visualization.controller';
import { SimulationRunnerService } from '../../services/simulation-runner.service';
import { SimulationEnginesService } from '../../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../../simulation-engines/engines/clifford-engine/clifford-engine';
import { CircuitDiagramService } from '../../../visualization/services/circuit-diagram.service';
import { InMemoryCircuitsRepository } from '../../repositories/in-memory-circuits.repository';
import { InMemorySimulationsRepository } from '../../repositories/in-memory-simulations.repository';

const req = { user: { userId: 'user-1' } };

function mockRes() {
  const res: any = { headers: {} as Record<string, string>, body: undefined };
  res.setHeader = (k: string, v: string) => {
    res.headers[k] = v;
  };
  res.send = (b: unknown) => {
    res.body = b;
  };
  res.json = (b: unknown) => {
    res.body = b;
  };
  return res;
}

describe('VisualizationController', () => {
  let controller: VisualizationController;
  let circuits: InMemoryCircuitsRepository;
  let simulations: InMemorySimulationsRepository;
  let runner: SimulationRunnerService;

  const bellOps = [
    { gate: 'h', targets: [0] },
    { gate: 'cnot', targets: [0, 1] },
  ];

  // Run a spec and persist it as a simulation; returns its id.
  async function storeRun(
    numQubits: number,
    operations: { gate: string; targets: number[] }[],
    shots = 0,
  ): Promise<string> {
    const run = runner.run({ numQubits, operations }, { shots });
    const sim = await simulations.create('user-1', {
      circuitId: null,
      circuitName: 'test',
      engine: run.requestedEngine,
      shots: run.shots,
      numQubits: run.numQubits,
      status: run.status,
      results: run.results,
      executionTimeMs: run.metadata.executionTimeMs,
    });
    return sim.id;
  }

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    runner = new SimulationRunnerService(engines);
    circuits = new InMemoryCircuitsRepository();
    simulations = new InMemorySimulationsRepository();
    controller = new VisualizationController(
      circuits,
      simulations,
      runner,
      new CircuitDiagramService(),
    );
  });

  describe('bloch-sphere', () => {
    it('gives a pure +X vector for |+>', async () => {
      const id = await storeRun(1, [{ gate: 'h', targets: [0] }]);
      const b = await controller.getBlochSphereData('0', id, req);
      expect(b.coordinates.x).toBeCloseTo(1, 5);
      expect(b.coordinates.z).toBeCloseTo(0, 5);
      expect(b.purity).toBeCloseTo(1, 5);
    });

    it('gives +Z for |0>', async () => {
      const id = await storeRun(1, []);
      const b = await controller.getBlochSphereData('0', id, req);
      expect(b.coordinates.z).toBeCloseTo(1, 5);
    });

    it('gives a maximally-mixed (zero) vector for an entangled Bell qubit', async () => {
      const id = await storeRun(2, bellOps);
      const b = await controller.getBlochSphereData('0', id, req);
      expect(b.purity).toBeCloseTo(0, 5); // entangled → shrunk to the centre
    });

    it('requires simulationId and validates the qubit index', async () => {
      const id = await storeRun(2, bellOps);
      await expect(controller.getBlochSphereData('0', '', req)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(controller.getBlochSphereData('5', id, req)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(controller.getBlochSphereData('0', 'nope', req)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('circuit diagram', () => {
    it('renders a real SVG for a stored circuit', async () => {
      const circuit = await circuits.create('user-1', {
        name: 'Bell',
        numQubits: 2,
        operations: bellOps,
      });
      const res = mockRes();
      await controller.getCircuitDiagram(circuit.id, 'svg', res, req);
      expect(res.headers['Content-Type']).toBe('image/svg+xml');
      expect(String(res.body)).toContain('<svg');
    });

    it('renders structured JSON when format=json', async () => {
      const circuit = await circuits.create('user-1', {
        name: 'Bell',
        numQubits: 2,
        operations: bellOps,
      });
      const res = mockRes();
      await controller.getCircuitDiagram(circuit.id, 'json', res, req);
      expect(typeof res.body).toBe('object');
    });

    it('throws 404 for a missing circuit', async () => {
      const res = mockRes();
      await expect(controller.getCircuitDiagram('nope', 'svg', res, req)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('histogram', () => {
    it('returns per-basis-state counts for a Bell run', async () => {
      const id = await storeRun(2, bellOps, 1000);
      const h = await controller.getHistogram(id, req);
      expect(h.type).toBe('counts');
      expect(h.labels.sort()).toEqual(['|00⟩', '|11⟩']);
      expect(h.data.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it('falls back to probabilities when shots=0', async () => {
      const id = await storeRun(2, bellOps, 0);
      const h = await controller.getHistogram(id, req);
      expect(h.type).toBe('probabilities');
    });

    it('throws 404 for a missing simulation', async () => {
      await expect(controller.getHistogram('nope', req)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('3D state', () => {
    it('returns amplitude magnitude + phase per basis state', async () => {
      const id = await storeRun(1, [
        { gate: 'h', targets: [0] },
        { gate: 's', targets: [0] },
      ]);
      const s = await controller.get3DState(id, 'amplitude', req);
      expect(s.states).toHaveLength(2);
      const one = s.states.find((x) => x.state === '1')!;
      expect(one.amplitude).toBeCloseTo(0.7071, 3);
      expect(one.phase).toBeCloseTo(Math.PI / 2, 3); // S adds an i phase
    });
  });

  describe('export', () => {
    it('exports posted data as a JSON attachment', async () => {
      const res = mockRes();
      await controller.exportVisualization(
        { type: 'histogram', data: { a: 1 }, format: 'json' },
        res,
      );
      expect(res.headers['Content-Disposition']).toContain('export.json');
      expect(res.body).toMatchObject({ type: 'histogram', data: { a: 1 } });
    });
  });
});
