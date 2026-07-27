import { Test, TestingModule } from '@nestjs/testing';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';
import { HHL } from './hhl';

describe('HHL', () => {
  let hhl: HHL;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();
    hhl = new HHL(module.get<SimulationEnginesService>(SimulationEnginesService));
  });

  it('prepares A⁻¹b with fidelity ≈ 1 for b = |0⟩', () => {
    const out = hhl.execute(1, 0).output as {
      fidelity: number;
      classicalSolution: number[];
      successProbability: number;
    };
    expect(out.fidelity).toBeGreaterThan(0.999);
    // A⁻¹|0⟩ ∝ [0.75, −0.25] → normalised [0.9487, −0.3162].
    expect(out.classicalSolution[0]).toBeCloseTo(0.9486833, 5);
    expect(out.classicalSolution[1]).toBeCloseTo(-0.3162278, 5);
    expect(out.successProbability).toBeGreaterThan(0);
  });

  it('prepares A⁻¹b with fidelity ≈ 1 across right-hand sides', () => {
    for (const [b0, b1] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
      [2, 1],
    ] as [number, number][]) {
      const out = hhl.execute(b0, b1).output as { fidelity: number };
      expect(out.fidelity).toBeGreaterThan(0.99);
    }
  });

  it('returns an eigenvector of A unchanged (|−⟩, eigenvalue 1)', () => {
    // b = |−⟩ ∝ (1, −1) is an eigenvector, so x ∝ b and fidelity = 1.
    const out = hhl.execute(1, -1).output as {
      fidelity: number;
      quantumSolution: { re: number; im: number }[];
    };
    expect(out.fidelity).toBeGreaterThan(0.999);
  });

  it('rejects a zero right-hand side', () => {
    expect(() => hhl.buildCircuit(0, 0)).toThrow();
  });

  it('verify() passes for all standard right-hand sides', () => {
    const results = hhl.verify();
    for (const r of results) {
      expect(r.passed).toBe(true);
    }
  });
});
