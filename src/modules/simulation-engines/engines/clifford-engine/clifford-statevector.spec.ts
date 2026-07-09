/**
 * Correctness tests for CliffordEngine.toStatevector()
 *
 * Verifies the stabilizer→statevector reconstruction against the dense
 * StatevectorEngine (source of truth) for a range of Clifford circuits.
 */

import { CliffordEngine } from './clifford-engine';
import { StatevectorEngine } from '../statevector-engine/statevector-engine';
import { Circuit } from '../../../circuit-engine/circuit';
import { Complex } from '../../../../common/utils/complex';

const clifford = new CliffordEngine();
const dense = new StatevectorEngine();

/** Collect a statevector map into a normalized {bitstring: {re,im}} object. */
function toMap(sv: Map<bigint, Complex>, n: number): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const [state, amp] of sv) {
    if (amp.magnitudeSquared() < 1e-9) continue;
    out[state.toString(2).padStart(n, '0')] = [amp.real, amp.imag];
  }
  return out;
}

/**
 * Two statevectors are equal up to a global phase. Compare probabilities and
 * phase-aligned amplitudes.
 */
function expectSameState(a: Map<bigint, Complex>, b: Map<bigint, Complex>, n: number) {
  const ma = toMap(a, n);
  const mb = toMap(b, n);
  expect(Object.keys(ma).sort()).toEqual(Object.keys(mb).sort());

  // Determine the global phase from the first shared basis state.
  const keys = Object.keys(ma);
  const k0 = keys[0];
  // phase = b0 / a0  (both unit-ish); use complex division
  const [ar, ai] = ma[k0];
  const [br, bi] = mb[k0];
  const denom = ar * ar + ai * ai;
  const pr = (br * ar + bi * ai) / denom;
  const pi = (bi * ar - br * ai) / denom;

  for (const k of keys) {
    const [xr, xi] = ma[k];
    // apply global phase (pr, pi) to a's amplitude
    const rr = xr * pr - xi * pi;
    const ri = xr * pi + xi * pr;
    expect(rr).toBeCloseTo(mb[k][0], 5);
    expect(ri).toBeCloseTo(mb[k][1], 5);
  }
}

describe('CliffordEngine.toStatevector (correctness)', () => {
  const cases: Array<{ name: string; build: () => Circuit }> = [
    { name: '|0> (identity)', build: () => Circuit.create(1) },
    { name: 'X|0> = |1>', build: () => Circuit.create(1).x(0) },
    { name: 'H|0> = |+>', build: () => Circuit.create(1).h(0) },
    { name: 'HS|0> = |+i>', build: () => Circuit.create(1).h(0).s(0) },
    { name: 'Bell', build: () => Circuit.create(2).h(0).cx(0, 1) },
    { name: 'Bell (reversed cnot)', build: () => Circuit.create(2).h(1).cx(1, 0) },
    { name: 'GHZ-3', build: () => Circuit.create(3).h(0).cx(0, 1).cx(1, 2) },
    { name: 'GHZ-4', build: () => Circuit.create(4).h(0).cx(0, 1).cx(1, 2).cx(2, 3) },
    { name: 'all H (3q)', build: () => Circuit.create(3).h(0).h(1).h(2) },
    {
      name: 'mixed cliffords',
      build: () => Circuit.create(2).h(0).s(0).cx(0, 1).x(1).z(0).cz(0, 1),
    },
    { name: 'CZ phase', build: () => Circuit.create(2).h(0).h(1).cz(0, 1) },
    { name: 'SWAP', build: () => Circuit.create(2).x(0).swap(0, 1) },
  ];

  for (const { name, build } of cases) {
    it(`matches the dense statevector: ${name}`, () => {
      const circuit = build();
      const cliffordSv = clifford.simulate(circuit).statevector;
      const denseSv = dense.simulate(circuit).statevector;
      expectSameState(cliffordSv, denseSv, circuit.numQubits);
    });
  }

  it('is no longer the |0…0> stub for a Bell state', () => {
    const sv = clifford.simulate(Circuit.create(2).h(0).cx(0, 1)).statevector;
    const nonZero = [...sv.values()].filter((a) => a.magnitudeSquared() > 1e-9);
    expect(nonZero).toHaveLength(2); // |00> and |11>, not just |00>
  });

  it('returns only the support for a large GHZ (100 qubits) quickly', () => {
    let circuit = Circuit.create(100).h(0);
    for (let i = 1; i < 100; i++) circuit = circuit.cx(0, i);
    const start = Date.now();
    const sv = clifford.simulate(circuit).statevector;
    expect(Date.now() - start).toBeLessThan(1000);
    const nonZero = [...sv.values()].filter((a) => a.magnitudeSquared() > 1e-9);
    expect(nonZero).toHaveLength(2); // |0..0> and |1..1>
  });

  it('does not blow up on a high-support circuit (returns empty map)', () => {
    const circuit = Circuit.builder(40);
    for (let i = 0; i < 30; i++) circuit.h(i); // support 2^30
    const sv = clifford.simulate(circuit.build()).statevector;
    expect(sv.size).toBe(0); // capped, not materialized
  });
});
