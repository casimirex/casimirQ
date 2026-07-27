import { Test, TestingModule } from '@nestjs/testing';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';
import { QuantumWalk } from './quantum-walk';

describe('QuantumWalk', () => {
  let walk: QuantumWalk;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();
    walk = new QuantumWalk(module.get<SimulationEnginesService>(SimulationEnginesService));
  });

  it('conserves probability across the walk', () => {
    const out = walk.execute(5, 8).output as { totalProbability: number };
    expect(out.totalProbability).toBeCloseTo(1, 9);
  });

  it('spreads ballistically — quantum σ well above classical √T', () => {
    const steps = 8;
    const out = walk.execute(5, steps).output as {
      stdDev: number;
      classicalStdDev: number;
      spreadRatio: number;
    };
    expect(out.classicalStdDev).toBeCloseTo(Math.sqrt(steps), 9);
    // Ballistic spreading: σ ≈ O(T) ≫ √T.
    expect(out.stdDev).toBeGreaterThan(out.classicalStdDev);
    expect(out.spreadRatio).toBeGreaterThan(1.3);
  });

  it('a single step moves the walker exactly ±1 from the start', () => {
    // One step with the plain |0⟩ coin: H splits into +1 and −1 branches only.
    const out = walk.execute(4, 1, { symmetricCoin: false }).output as {
      distribution: { position: number; probability: number }[];
      start: number;
    };
    const occupied = out.distribution.filter((d) => d.probability > 1e-9);
    const positions = occupied.map((d) => d.position).sort((a, b) => a - b);
    expect(positions).toEqual([out.start - 1, out.start + 1]);
    for (const d of occupied) {
      expect(d.probability).toBeCloseTo(0.5, 9);
    }
  });

  it('wraps correctly around the cycle (mod N shift)', () => {
    // Start at node 0 with plain coin, one step → nodes N-1 and 1.
    const out = walk.execute(3, 1, { start: 0, symmetricCoin: false }).output as {
      distribution: { position: number; probability: number }[];
    };
    const positions = out.distribution
      .filter((d) => d.probability > 1e-9)
      .map((d) => d.position)
      .sort((a, b) => a - b);
    expect(positions).toEqual([1, 7]); // N = 8: −1 wraps to 7
  });

  it('rejects invalid parameters', () => {
    expect(() => walk.buildCircuit(0, 3)).toThrow();
    expect(() => walk.buildCircuit(3, -1)).toThrow();
    expect(() => walk.buildCircuit(3, 2, { start: 8 })).toThrow();
  });
});
