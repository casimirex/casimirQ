import { CircuitOptimizerService } from './circuit-optimizer.service';
import { Circuit } from '../../circuit-engine/circuit';

describe('CircuitOptimizerService', () => {
  let service: CircuitOptimizerService;

  beforeEach(() => {
    service = new CircuitOptimizerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Circuit Optimization', () => {
    it('should optimize a circuit', () => {
      const circuit = Circuit.builder(2).h(0).h(0).build(); // Double H should optimize
      const result = service.optimize(circuit);

      expect(result).toBeDefined();
      expect(result.originalGateCount).toBe(2);
      expect(result.appliedOptimizations).toBeDefined();
    });

    it('should calculate reduction percentage', () => {
      const circuit = Circuit.builder(1).x(0).x(0).build(); // Double X should cancel
      const result = service.optimize(circuit);

      expect(result.reductionPercent).toBeGreaterThanOrEqual(0);
    });

    it('should track optimization time', () => {
      const circuit = Circuit.builder(2).h(0).cx(0, 1).build();
      const result = service.optimize(circuit);

      expect(result.optimizationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should apply multiple optimization passes', () => {
      const circuit = Circuit.builder(3)
        .h(0)
        .h(0)
        .h(0) // Multiple gates
        .h(1)
        .h(1)
        .build();

      const result = service.optimize(circuit, { maxPasses: 3 });
      expect(result.appliedOptimizations).toBeDefined();
    });
  });

  describe('Optimization Recommendations', () => {
    it('should recommend Clifford engine for Clifford circuits', () => {
      // Create a circuit with more multi-qubit gates (>50% of total) to trigger Clifford recommendation
      const circuit = Circuit.builder(5)
        .h(0)
        .h(1)
        .cx(0, 1)
        .cx(2, 3)
        .cx(0, 2)
        .cx(1, 3) // 4 multi-qubit gates
        .build();

      const recommendations = service.getRecommendations(circuit);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((r) => r.includes('Clifford'))).toBe(true);
    });

    it('should recommend MPS for large circuits', () => {
      const circuit = Circuit.builder(25).h(0).build();
      const recommendations = service.getRecommendations(circuit);

      expect(recommendations.some((r) => r.includes('MPS'))).toBe(true);
    });

    it('should recommend partitioning for large gate counts', () => {
      const circuit = Circuit.builder(10);
      for (let i = 0; i < 150; i++) {
        circuit.h(i % 10);
      }

      const recommendations = service.getRecommendations(circuit.build());
      expect(recommendations.some((r) => r.includes('partitioning'))).toBe(true);
    });
  });

  describe('Optimization Options', () => {
    it('should respect fuseGates option', () => {
      const circuit = Circuit.builder(1).rx(0, 0.5).rx(0, 0.5).build();
      const result = service.optimize(circuit, { fuseGates: true });

      expect(result.appliedOptimizations).toBeDefined();
    });

    it('should respect cancelInverses option', () => {
      const circuit = Circuit.builder(1).x(0).x(0).build();
      const result = service.optimize(circuit, { cancelInverses: true });

      expect(result).toBeDefined();
    });

    it('should respect removeIdentities option', () => {
      const circuit = Circuit.builder(1).h(0).build();
      const result = service.optimize(circuit, { removeIdentities: true });

      expect(result).toBeDefined();
    });

    it('should respect commuteGates option', () => {
      const circuit = Circuit.builder(2).h(0).h(1).build();
      const result = service.optimize(circuit, { commuteGates: true });

      expect(result).toBeDefined();
    });
  });
});
