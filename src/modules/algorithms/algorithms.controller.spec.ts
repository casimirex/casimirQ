import { Test, TestingModule } from '@nestjs/testing';
import { AlgorithmsController } from './algorithms.controller';
import { AlgorithmsService } from './algorithms.service';
import { SimulationEnginesModule } from '../simulation-engines/simulation-engines.module';

describe('AlgorithmsController', () => {
  let controller: AlgorithmsController;
  let service: AlgorithmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
      controllers: [AlgorithmsController],
      providers: [AlgorithmsService],
    }).compile();

    controller = module.get<AlgorithmsController>(AlgorithmsController);
    service = module.get<AlgorithmsService>(AlgorithmsService);
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
        edges: [[0, 1], [1, 2]] as [number, number][],
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
      const numbers = [15, 21, 35];
      for (const N of numbers) {
        const result = await controller.executeShor({ N });
        expect(result.result.factors).toBeInstanceOf(Array);
      }
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
