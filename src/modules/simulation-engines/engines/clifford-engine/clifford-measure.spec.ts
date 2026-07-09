/**
 * Tests for projective measurement in the Clifford engine (collapse + correct
 * deterministic / random outcomes and correlations).
 */

import { CliffordEngine } from './clifford-engine';
import { Circuit } from '../../../circuit-engine/circuit';
import { Complex } from '../../../../common/utils/complex';

const engine = new CliffordEngine();

/** The single non-zero basis state of a collapsed (product) statevector. */
function soleState(sv: Map<bigint, Complex>, n: number): string | null {
  const nonZero = [...sv.entries()].filter(([, a]) => a.magnitudeSquared() > 1e-9);
  if (nonZero.length !== 1) return null;
  return nonZero[0][0].toString(2).padStart(n, '0');
}

describe('CliffordEngine measurement', () => {
  it('measures |0> deterministically as 0 (probability 1)', () => {
    const result = engine.simulate(Circuit.create(1).measure(0));
    expect(result.measurements).toHaveLength(1);
    expect(result.measurements![0].value).toBe(0);
    expect(result.measurements![0].probability).toBe(1);
  });

  it('measures X|0> = |1> deterministically as 1', () => {
    const result = engine.simulate(Circuit.create(1).x(0).measure(0));
    expect(result.measurements![0].value).toBe(1);
    expect(result.measurements![0].probability).toBe(1);
  });

  it('measures |+> randomly (probability 0.5) and collapses the state', () => {
    // With a fixed seed the outcome is deterministic across runs.
    const a = engine.simulate(Circuit.create(1).h(0).measure(0), { seed: 5 });
    const b = engine.simulate(Circuit.create(1).h(0).measure(0), { seed: 5 });
    expect(a.measurements![0].probability).toBe(0.5);
    expect(a.measurements![0].value).toBe(b.measurements![0].value);

    // After collapse the statevector is the measured basis state.
    const outcome = a.measurements![0].value;
    expect(soleState(a.statevector, 1)).toBe(String(outcome));
  });

  it('re-measuring a collapsed qubit is deterministic and consistent', () => {
    const result = engine.simulate(Circuit.create(1).h(0).measure(0).measure(0), { seed: 9 });
    const [first, second] = result.measurements!;
    expect(second.value).toBe(first.value);
    expect(second.probability).toBe(1); // deterministic after collapse
  });

  it('produces perfectly correlated Bell measurements', () => {
    // Measure q0 then q1: q1 must match q0, and be deterministic once q0 collapsed.
    for (let seed = 0; seed < 20; seed++) {
      const result = engine.simulate(Circuit.create(2).h(0).cx(0, 1).measure(0).measure(1), {
        seed,
      });
      const [m0, m1] = result.measurements!;
      expect(m1.value).toBe(m0.value);
      expect(m1.probability).toBe(1);
    }
  });

  it('produces a GHZ that measures all-equal', () => {
    let circuit = Circuit.create(4).h(0).cx(0, 1).cx(1, 2).cx(2, 3);
    circuit = circuit.measure(0).measure(1).measure(2).measure(3);
    const result = engine.simulate(circuit, { seed: 3 });
    const values = result.measurements!.map((m) => m.value);
    expect(new Set(values).size).toBe(1); // all 0 or all 1
    // First is random, the rest are forced.
    expect(result.measurements![1].probability).toBe(1);
  });

  it('gives ~50/50 statistics for a Bell state across seeds', () => {
    let zeros = 0;
    const runs = 200;
    for (let seed = 0; seed < runs; seed++) {
      const result = engine.simulate(Circuit.create(2).h(0).cx(0, 1).measure(0), { seed });
      if (result.measurements![0].value === 0) zeros++;
    }
    expect(zeros).toBeGreaterThan(runs * 0.35);
    expect(zeros).toBeLessThan(runs * 0.65);
  });
});
