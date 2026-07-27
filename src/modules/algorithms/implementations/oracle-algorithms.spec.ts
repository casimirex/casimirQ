import { Test, TestingModule } from '@nestjs/testing';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';
import { DeutschJozsa } from './deutsch-jozsa';
import { BernsteinVazirani } from './bernstein-vazirani';
import { SimonsAlgorithm } from './simons-algorithm';

describe('Oracle algorithms (Deutsch-Jozsa, Bernstein-Vazirani, Simon)', () => {
  let engines: SimulationEnginesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();
    engines = module.get<SimulationEnginesService>(SimulationEnginesService);
  });

  describe('Deutsch-Jozsa', () => {
    it('decides a constant oracle as constant (all-zero with certainty)', () => {
      const dj = new DeutschJozsa(engines);
      for (const value of [0, 1] as const) {
        const out = dj.execute(3, { kind: 'constant', value }).output as {
          decision: string;
          correct: boolean;
          allZeroProbability: number;
        };
        expect(out.decision).toBe('constant');
        expect(out.correct).toBe(true);
        expect(out.allZeroProbability).toBeCloseTo(1, 9);
      }
    });

    it('decides a balanced oracle as balanced (zero all-zero probability)', () => {
      const dj = new DeutschJozsa(engines);
      for (let n = 1; n <= 4; n++) {
        const out = dj.execute(n, { kind: 'balanced', mask: (1 << n) - 1 }).output as {
          decision: string;
          correct: boolean;
          allZeroProbability: number;
        };
        expect(out.decision).toBe('balanced');
        expect(out.correct).toBe(true);
        expect(out.allZeroProbability).toBeCloseTo(0, 9);
      }
    });

    it('rejects an out-of-range balanced mask', () => {
      const dj = new DeutschJozsa(engines);
      expect(() => dj.buildCircuit(2, { kind: 'balanced', mask: 4 })).toThrow();
    });
  });

  describe('Bernstein-Vazirani', () => {
    it('recovers every hidden string for n=4 with certainty', () => {
      const bv = new BernsteinVazirani(engines);
      const n = 4;
      for (let secret = 0; secret < 1 << n; secret++) {
        const res = bv.execute(n, secret);
        const out = res.output as { recovered: number; correct: boolean };
        expect(out.recovered).toBe(secret);
        expect(out.correct).toBe(true);
        expect(res.metrics.successProbability).toBeCloseTo(1, 9);
      }
    });
  });

  describe("Simon's Algorithm", () => {
    it('recovers the hidden period for every non-zero s (n=3)', () => {
      const simon = new SimonsAlgorithm(engines);
      const n = 3;
      for (let secret = 1; secret < 1 << n; secret++) {
        const out = simon.execute(n, secret).output as {
          recovered: number;
          correct: boolean;
          equationCount: number;
        };
        expect(out.recovered).toBe(secret);
        expect(out.correct).toBe(true);
        // 2^{n-1} distinct y satisfy y·s = 0 (including 0); non-trivial ones span sᵀ.
        expect(out.equationCount).toBeGreaterThanOrEqual(n - 1);
      }
    });

    it('reports s=0 for the 1-to-1 (period-free) oracle', () => {
      const simon = new SimonsAlgorithm(engines);
      const out = simon.execute(3, 0).output as { recovered: number };
      expect(out.recovered).toBe(0);
    });
  });
});
