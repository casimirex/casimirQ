import { Test, TestingModule } from '@nestjs/testing';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';
import { PhaseEstimation } from './phase-estimation';

describe('PhaseEstimation', () => {
  let qpe: PhaseEstimation;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();
    qpe = new PhaseEstimation(module.get<SimulationEnginesService>(SimulationEnginesService));
  });

  it('recovers exactly-representable phases k/2^t exactly', () => {
    const t = 4;
    for (let k = 0; k < 1 << t; k++) {
      const out = qpe.execute(k / Math.pow(2, t), t).output as {
        measuredInteger: number;
        estimatedPhase: number;
        bestProbability: number;
      };
      expect(out.measuredInteger).toBe(k);
      expect(out.estimatedPhase).toBeCloseTo(k / Math.pow(2, t), 9);
      expect(out.bestProbability).toBeCloseTo(1, 9);
    }
  });

  it('estimates a non-dyadic phase to within one LSB with high probability', () => {
    const t = 6;
    const out = qpe.execute(0.3, t).output as { error: number; bestProbability: number };
    expect(out.error).toBeLessThanOrEqual(1 / Math.pow(2, t) + 1e-9);
    expect(out.bestProbability).toBeGreaterThan(0.6);
  });

  it('rejects out-of-range phases and precisions', () => {
    expect(() => qpe.buildCircuit(1.0, 3)).toThrow();
    expect(() => qpe.buildCircuit(-0.1, 3)).toThrow();
    expect(() => qpe.buildCircuit(0.25, 0)).toThrow();
  });
});
