import { Test, TestingModule } from '@nestjs/testing';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';
import { AmplitudeAmplification } from './amplitude-amplification';

describe('AmplitudeAmplification', () => {
  let qaa: AmplitudeAmplification;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();
    qaa = new AmplitudeAmplification(
      module.get<SimulationEnginesService>(SimulationEnginesService),
    );
  });

  it('reduces to Grover for a uniform preparation (single target)', () => {
    const n = 3;
    const uniform = new Array(n).fill(Math.PI / 2);
    const out = qaa.execute(uniform, [5]).output as {
      initialProbability: number;
      finalProbability: number;
      iterations: number;
    };
    expect(out.initialProbability).toBeCloseTo(1 / 8, 9);
    expect(out.iterations).toBe(2);
    expect(out.finalProbability).toBeGreaterThan(0.9);
  });

  it('amplifies a non-uniform preparation and matches sin²((2k+1)θ)', () => {
    const angles = [Math.PI / 2, Math.PI / 3, (2 * Math.PI) / 5];
    const out = qaa.execute(angles, [7]).output as {
      initialProbability: number;
      finalProbability: number;
      theoreticalProbability: number;
    };
    expect(out.finalProbability).toBeGreaterThan(out.initialProbability);
    expect(out.finalProbability).toBeCloseTo(out.theoreticalProbability, 6);
  });

  it('amplifies multiple good states', () => {
    const n = 4;
    const uniform = new Array(n).fill(Math.PI / 2);
    const out = qaa.execute(uniform, [3, 10]).output as {
      initialProbability: number;
      finalProbability: number;
    };
    expect(out.initialProbability).toBeCloseTo(2 / 16, 9);
    expect(out.finalProbability).toBeGreaterThan(0.9);
  });

  it('rejects empty good sets and out-of-range states', () => {
    expect(() => qaa.buildCircuit([Math.PI / 2], [])).toThrow();
    expect(() => qaa.buildCircuit([Math.PI / 2, Math.PI / 2], [4])).toThrow();
  });
});
