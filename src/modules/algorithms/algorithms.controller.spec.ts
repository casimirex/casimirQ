import { Test, TestingModule } from '@nestjs/testing';
import { AlgorithmsController } from './algorithms.controller';
import { AlgorithmsService } from './algorithms.service';
import { SimulationEnginesModule } from '../simulation-engines/simulation-engines.module';
import { JwtAuthGuard } from '../api/guards/jwt-auth.guard';
import { RateLimitGuard } from '../api/guards/rate-limit.guard';

describe('AlgorithmsController', () => {
  let controller: AlgorithmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
      controllers: [AlgorithmsController],
      providers: [AlgorithmsService],
    })
      // The controller is guarded; stub the guards for these unit tests.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AlgorithmsController>(AlgorithmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /algorithms', () => {
    it('should return list of algorithms', () => {
      const result = controller.getAlgorithms();
      expect(result.count).toBeGreaterThan(0);
      expect(result.algorithms).toBeInstanceOf(Array);
      expect(result.algorithms[0]).toHaveProperty('name');
      expect(result.algorithms[0]).toHaveProperty('description');
      expect(result.algorithms[0]).toHaveProperty('category');
    });
  });

  describe('POST /algorithms/qft', () => {
    it('should execute QFT', async () => {
      const dto = { n: 3 };
      const result = await controller.executeQFT(dto);
      expect(result.algorithm).toBe('Quantum Fourier Transform');
      expect(result.parameters.n).toBe(3);
      expect(result.result).toHaveProperty('executionTime');
    });

    it('should execute QFT with different sizes', async () => {
      const sizes = [2, 3, 4, 5];
      for (const n of sizes) {
        const result = await controller.executeQFT({ n });
        expect(result.parameters.n).toBe(n);
      }
    });
  });

  describe('POST /algorithms/grover', () => {
    it('should execute Grover search', async () => {
      const dto = { n: 3, markedItem: 5 };
      const result = await controller.executeGrover(dto);
      expect(result.algorithm).toBe("Grover's Search");
      expect(result.parameters.n).toBe(3);
      expect(result.parameters.markedItem).toBe(5);
      expect(result.result).toHaveProperty('executionTime');
      expect(result.result).toHaveProperty('successProbability');
    });

    it('should execute Grover with custom iterations', async () => {
      const dto = { n: 3, markedItem: 5, iterations: 2 };
      const result = await controller.executeGrover(dto);
      expect(result.parameters.iterations).toBe(2);
    });
  });

  describe('POST /algorithms/vqe', () => {
    it('should execute VQE', async () => {
      const dto = {
        n: 1,
        hamiltonian: [{ coefficient: 1.0, paulis: ['Z' as const], qubits: [0] }],
        maxIterations: 10,
      };
      const result = await controller.executeVQE(dto);
      expect(result.algorithm).toBe('Variational Quantum Eigensolver');
      expect(result.result).toHaveProperty('optimalEnergy');
      expect(result.result).toHaveProperty('iterations');
    });
  });

  describe('GET /algorithms/vqe/examples', () => {
    it('should return example Hamiltonians', () => {
      const result = controller.getVQEEExamples();
      expect(result.examples).toBeDefined();
      expect(Object.keys(result.examples).length).toBeGreaterThan(0);
    });
  });

  describe('POST /algorithms/qaoa', () => {
    it('should execute QAOA', async () => {
      const dto = {
        n: 3,
        edges: [
          [0, 1],
          [1, 2],
        ] as [number, number][],
        p: 1,
      };
      const result = await controller.executeQAOA(dto);
      expect(result.algorithm).toBe('Quantum Approximate Optimization Algorithm');
      expect(result.result).toHaveProperty('maxExpectation');
      expect(result.result).toHaveProperty('bestCutValue');
    });
  });

  describe('GET /algorithms/qaoa/examples', () => {
    it('should return example graphs', () => {
      const result = controller.getQAOAExamples();
      expect(result.examples).toBeDefined();
      expect(Object.keys(result.examples).length).toBeGreaterThan(0);
    });
  });

  describe('POST /algorithms/teleport', () => {
    it('should execute teleportation for |0⟩', async () => {
      const dto = { alpha: 1, beta: 0 };
      const result = await controller.executeTeleport(dto);
      expect(result.algorithm).toBe('Quantum Teleportation');
      expect(result.result).toHaveProperty('fidelity');
      expect(result.result.verified).toBe(true);
    });

    it('should execute teleportation for superposition', async () => {
      const dto = { alpha: 1 / Math.sqrt(2), beta: 1 / Math.sqrt(2) };
      const result = await controller.executeTeleport(dto);
      expect(result.result.verified).toBe(true);
    });
  });

  describe('POST /algorithms/shor', () => {
    it('should execute Shor algorithm', async () => {
      const dto = { N: 15 };
      const result = await controller.executeShor(dto);
      expect(result.algorithm).toBe("Shor's Algorithm");
      expect(result.result).toHaveProperty('factors');
      expect(result.result.factors.length).toBeGreaterThan(0);
    });

    it('should factor different numbers', async () => {
      // Genuine quantum order finding runs on the statevector simulator, so N is
      // bounded by the qubit budget (≤ ~32); these both factor cleanly.
      const numbers = [15, 21];
      for (const N of numbers) {
        const result = await controller.executeShor({ N });
        expect(result.result.factors).toBeInstanceOf(Array);
        expect(result.result.factors.length).toBe(2);
      }
    });
  });

  describe('POST /algorithms/deutsch-jozsa', () => {
    it('decides a constant oracle', async () => {
      const result = await controller.executeDeutschJozsa({ n: 3, oracle: 'constant', value: 1 });
      expect(result.algorithm).toBe('Deutsch-Jozsa');
      expect(result.result.decision).toBe('constant');
      expect(result.result.correct).toBe(true);
    });

    it('decides a balanced oracle (default full mask)', async () => {
      const result = await controller.executeDeutschJozsa({ n: 3, oracle: 'balanced' });
      expect(result.result.decision).toBe('balanced');
      expect(result.result.correct).toBe(true);
    });
  });

  describe('POST /algorithms/bernstein-vazirani', () => {
    it('recovers the hidden string', async () => {
      const result = await controller.executeBernsteinVazirani({ n: 4, secret: 11 });
      expect(result.algorithm).toBe('Bernstein-Vazirani');
      expect(result.result.recovered).toBe(11);
      expect(result.result.correct).toBe(true);
    });
  });

  describe('POST /algorithms/simon', () => {
    it('recovers the hidden period', async () => {
      const result = await controller.executeSimon({ n: 3, secret: 5 });
      expect(result.algorithm).toBe("Simon's Algorithm");
      expect(result.result.recovered).toBe(5);
      expect(result.result.correct).toBe(true);
    });
  });

  describe('POST /algorithms/phase-estimation', () => {
    it('estimates an exactly-representable eigenphase', async () => {
      const result = await controller.executePhaseEstimation({ phi: 0.375, precision: 4 });
      expect(result.algorithm).toBe('Quantum Phase Estimation');
      expect(result.result.estimatedPhase).toBeCloseTo(0.375, 9);
      expect(result.result.measuredInteger).toBe(6);
      expect(result.result.error).toBeLessThan(1e-9);
    });
  });

  describe('POST /algorithms/amplitude-amplification', () => {
    it('amplifies a good state under a non-uniform preparation', async () => {
      const result = await controller.executeAmplitudeAmplification({
        angles: [Math.PI / 2, Math.PI / 3, (2 * Math.PI) / 5],
        goodStates: [7],
      });
      expect(result.algorithm).toBe('Quantum Amplitude Amplification');
      expect(result.result.finalProbability).toBeGreaterThan(result.result.initialProbability);
      expect(result.result.finalProbability).toBeCloseTo(result.result.theoreticalProbability, 6);
    });
  });

  describe('POST /algorithms/quantum-walk', () => {
    it('runs a walk and reports ballistic spreading', async () => {
      const result = await controller.executeQuantumWalk({ n: 5, steps: 8 });
      expect(result.algorithm).toBe('Quantum Walk');
      expect(result.result.stdDev).toBeGreaterThan(result.result.classicalStdDev);
      expect(result.result.distribution.length).toBeGreaterThan(0);
    });
  });

  describe('POST /algorithms/hamiltonian-simulation', () => {
    it('evolves |0⟩ under H=X and matches sin²(t)', async () => {
      const t = 0.7;
      const result = await controller.executeHamiltonianSimulation({
        n: 1,
        terms: [{ coefficient: 1, paulis: ['X'], qubits: [0] }],
        time: t,
      });
      expect(result.algorithm).toBe('Hamiltonian Simulation');
      const p1 = result.result.probabilities.find((e) => e.state === 1)?.probability ?? 0;
      expect(p1).toBeCloseTo(Math.pow(Math.sin(t), 2), 9);
    });
  });

  describe('POST /algorithms/hhl', () => {
    it('solves A x = b with high fidelity to the classical solution', async () => {
      const result = await controller.executeHHL({ b0: 1, b1: 0 });
      expect(result.algorithm).toBe('HHL Algorithm');
      expect(result.result.fidelity).toBeGreaterThan(0.99);
      expect(result.result.classicalSolution[0]).toBeCloseTo(0.9486833, 5);
    });
  });

  describe('GET /algorithms/:name/verify', () => {
    it('should verify QFT', () => {
      const result = controller.verifyAlgorithm('qft');
      expect(result.algorithm).toBe('qft');
      expect(result.verificationResults).toBeInstanceOf(Array);
    });

    it('should verify Grover', () => {
      const result = controller.verifyAlgorithm('grover');
      expect(result.algorithm).toBe('grover');
      expect(result.verificationResults).toBeInstanceOf(Array);
    });

    it('should verify teleportation', () => {
      const result = controller.verifyAlgorithm('teleport');
      expect(result.algorithm).toBe('teleport');
      expect(result.verificationResults).toBeInstanceOf(Array);
    });

    it('should verify Shor', () => {
      const result = controller.verifyAlgorithm('shor');
      expect(result.algorithm).toBe('shor');
      expect(result.verificationResults).toBeInstanceOf(Array);
    });

    it('should throw for unknown algorithm', () => {
      expect(() => controller.verifyAlgorithm('unknown')).toThrow();
    });
  });
});
