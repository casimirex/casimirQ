import { Test, TestingModule } from '@nestjs/testing';
import { QuantumFourierTransform } from './quantum-fourier-transform';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';

describe('QuantumFourierTransform', () => {
  let algorithm: QuantumFourierTransform;
  let enginesService: SimulationEnginesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();

    enginesService = module.get<SimulationEnginesService>(SimulationEnginesService);
    algorithm = new QuantumFourierTransform(enginesService);
  });

  describe('buildCircuit', () => {
    it('should build QFT circuit for n qubits', () => {
      const circuit = algorithm.buildCircuit(3);
      expect(circuit).toBeDefined();
      expect(circuit.getMetadata().qubitCount).toBe(3);
    });

    it('should throw for invalid qubit count', () => {
      expect(() => algorithm.buildCircuit(0)).toThrow();
      expect(() => algorithm.buildCircuit(-1)).toThrow();
    });
  });

  describe('buildInverseCircuit', () => {
    it('should build inverse QFT circuit', () => {
      const circuit = algorithm.buildInverseCircuit(3);
      expect(circuit).toBeDefined();
      expect(circuit.getMetadata().qubitCount).toBe(3);
    });
  });

  describe('analyzeCircuit', () => {
    it('should analyze QFT circuit', () => {
      const circuit = algorithm.buildCircuit(3);
      const analysis = algorithm.analyzeCircuit(circuit);
      expect(analysis).toBeDefined();
      expect(analysis.qubitCount).toBe(3);
      expect(analysis.complexity).toContain('O(n²)');
    });
  });

  describe('verify', () => {
    it('should verify QFT properties', () => {
      const results = algorithm.verify(3);
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      // QFT† × QFT = Identity should pass
      expect(results[0].passed).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute QFT', () => {
      const result = algorithm.execute(3);
      expect(result).toBeDefined();
      expect(result.metrics.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.output).toBeDefined();
    });
  });
});
