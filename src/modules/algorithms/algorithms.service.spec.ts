import { Test, TestingModule } from '@nestjs/testing';
import { AlgorithmsService } from './algorithms.service';
import { SimulationEnginesModule } from '../simulation-engines/simulation-engines.module';

describe('AlgorithmsService', () => {
  let service: AlgorithmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
      providers: [AlgorithmsService],
    }).compile();

    service = module.get<AlgorithmsService>(AlgorithmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailableAlgorithms', () => {
    it('should return list of algorithms', () => {
      const algorithms = service.getAvailableAlgorithms();
      expect(algorithms.length).toBeGreaterThan(0);
      expect(algorithms.some((a) => a.name === 'Quantum Fourier Transform')).toBe(true);
      expect(algorithms.some((a) => a.name === "Grover's Search")).toBe(true);
      expect(algorithms.some((a) => a.name === 'Variational Quantum Eigensolver')).toBe(true);
    });
  });

  describe('executeQFT', () => {
    it('should execute QFT algorithm', () => {
      const result = service.executeQFT(3);
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.output).toBeDefined();
    });
  });

  describe('executeGrover', () => {
    it('should execute Grover search', () => {
      const result = service.executeGrover(3, 5);
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.output).toBeDefined();
    });
  });

  describe('executeVQE', () => {
    it('should execute VQE algorithm', () => {
      const hamiltonian = [{ coefficient: 1.0, paulis: ['Z' as const], qubits: [0] }];
      const result = service.executeVQE(1, hamiltonian, 10);
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
    });
  });

  describe('executeQAOA', () => {
    it('should execute QAOA algorithm', () => {
      const edges: [number, number][] = [
        [0, 1],
        [1, 2],
      ];
      const result = service.executeQAOA(3, edges, 1);
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.output).toBeDefined();
    });
  });

  describe('executeTeleport', () => {
    it('should execute quantum teleportation', () => {
      const result = service.executeTeleport([1, 0]); // |0⟩ state
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      const output = result.output as { fidelity: number; verified: boolean };
      expect(output.verified).toBe(true);
    });

    it('should teleport superposition state', () => {
      const result = service.executeTeleport([1 / Math.sqrt(2), 1 / Math.sqrt(2)]); // |+⟩ state
      expect(result).toBeDefined();
    });
  });

  describe('executeShor', () => {
    it('should execute Shor algorithm', () => {
      const result = service.executeShor(15);
      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
      const output = result.output as { factors: number[] };
      expect(output.factors.length).toBeGreaterThan(0);
    });
  });

  describe('getExampleHamiltonians', () => {
    it('should return example Hamiltonians', () => {
      const examples = service.getExampleHamiltonians();
      expect(examples).toBeDefined();
      expect(Object.keys(examples).length).toBeGreaterThan(0);
    });
  });

  describe('getExampleGraphs', () => {
    it('should return example graphs', () => {
      const examples = service.getExampleGraphs();
      expect(examples).toBeDefined();
      expect(Object.keys(examples).length).toBeGreaterThan(0);
    });
  });
});
