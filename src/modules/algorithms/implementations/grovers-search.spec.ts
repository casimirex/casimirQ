import { Test, TestingModule } from '@nestjs/testing';
import { GroversSearch } from './grovers-search';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';

describe('GroversSearch', () => {
  let algorithm: GroversSearch;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();

    const enginesService = module.get<SimulationEnginesService>(SimulationEnginesService);
    algorithm = new GroversSearch(enginesService);
  });

  describe('buildCircuit', () => {
    it('builds a circuit for n qubits', () => {
      const circuit = algorithm.buildCircuit(3, 5);
      expect(circuit.getMetadata().qubitCount).toBe(3);
    });

    it('rejects an out-of-range marked item', () => {
      expect(() => algorithm.buildCircuit(3, 8)).toThrow();
      expect(() => algorithm.buildCircuit(0, 0)).toThrow();
    });
  });

  describe('amplitude amplification', () => {
    // Regression: a multi-controlled Z (the oracle/diffusion phase flip for
    // n >= 3) must be simulated on a universal engine, not the Clifford engine,
    // and must be implemented correctly. A broken decomposition leaves the
    // state uniform (success probability ~ 1/2^n).
    it.each([
      [2, 3],
      [3, 5],
      [4, 9],
      [5, 21],
    ])('amplifies the marked item for n=%i (marked=%i)', (n, marked) => {
      const result = algorithm.execute(n, marked);
      const successProbability = (result.output as { successProbability: number })
        .successProbability;

      // Uniform would be 1/2^n; correct Grover pushes this well above 0.9.
      expect(successProbability).toBeGreaterThan(0.9);
    });

    it('makes the marked item by far the most probable outcome', () => {
      const n = 4;
      const marked = 11;
      const result = algorithm.execute(n, marked);

      let bestIdx = -1n;
      let bestProb = -1;
      for (const [idx, amp] of result.measurements.entries()) {
        const prob = amp.re * amp.re + amp.im * amp.im;
        if (prob > bestProb) {
          bestProb = prob;
          bestIdx = idx;
        }
      }

      expect(Number(bestIdx)).toBe(marked);
      expect(bestProb).toBeGreaterThan(0.9);
    });
  });
});
