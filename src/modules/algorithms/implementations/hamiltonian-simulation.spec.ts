import { Test, TestingModule } from '@nestjs/testing';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { SimulationEnginesModule } from '../../simulation-engines/simulation-engines.module';
import { HamiltonianSimulation } from './hamiltonian-simulation';
import { PauliTerm } from './vqe';

describe('HamiltonianSimulation', () => {
  let sim: HamiltonianSimulation;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [SimulationEnginesModule],
    }).compile();
    sim = new HamiltonianSimulation(module.get<SimulationEnginesService>(SimulationEnginesService));
  });

  const amp = (res: ReturnType<HamiltonianSimulation['execute']>, state: bigint) =>
    res.measurements.get(state) ?? { re: 0, im: 0 };

  it('e^{-iXt}|0⟩ = cos(t)|0⟩ − i·sin(t)|1⟩ (single term, exact)', () => {
    const t = 0.7;
    const res = sim.execute(1, [{ coefficient: 1, paulis: ['X'], qubits: [0] }], t, 1);
    const a0 = amp(res, 0n);
    const a1 = amp(res, 1n);
    expect(a0.re).toBeCloseTo(Math.cos(t), 9);
    expect(a0.im).toBeCloseTo(0, 9);
    expect(a1.re).toBeCloseTo(0, 9);
    expect(a1.im).toBeCloseTo(-Math.sin(t), 9);
  });

  it('e^{-iYt}|0⟩ = cos(t)|0⟩ + sin(t)|1⟩ (fixes the Y basis-change sign)', () => {
    const t = 0.6;
    const res = sim.execute(1, [{ coefficient: 1, paulis: ['Y'], qubits: [0] }], t, 1);
    const a0 = amp(res, 0n);
    const a1 = amp(res, 1n);
    expect(a0.re).toBeCloseTo(Math.cos(t), 9);
    expect(a0.im).toBeCloseTo(0, 9);
    expect(a1.re).toBeCloseTo(Math.sin(t), 9);
    expect(a1.im).toBeCloseTo(0, 9);
  });

  it('e^{-iZt}|0⟩ = e^{-it}|0⟩ (eigenstate, phase only)', () => {
    const t = 0.9;
    const res = sim.execute(1, [{ coefficient: 1, paulis: ['Z'], qubits: [0] }], t, 1);
    const a0 = amp(res, 0n);
    expect(a0.re).toBeCloseTo(Math.cos(t), 9);
    expect(a0.im).toBeCloseTo(-Math.sin(t), 9);
    expect((res.measurements.get(1n) ?? { re: 0, im: 0 }).re).toBeCloseTo(0, 9);
  });

  it('Trotter error for H = X + Z shrinks as steps increase', () => {
    const H: PauliTerm[] = [
      { coefficient: 1, paulis: ['X'], qubits: [0] },
      { coefficient: 1, paulis: ['Z'], qubits: [0] },
    ];
    const t = 1.0;
    // Exact e^{-i(X+Z)t}|0⟩ via r=|(1,0,1)|=√2.
    const r = Math.SQRT2;
    const s = Math.sin(r * t) / r;
    const exact0 = { re: Math.cos(r * t), im: -s * 1 };
    const exact1 = { re: 0, im: -s * 1 };
    const infidelity = (steps: number, order: 1 | 2) => {
      const res = sim.execute(1, H, t, steps, order);
      const a0 = amp(res, 0n);
      const a1 = amp(res, 1n);
      const re = exact0.re * a0.re + exact0.im * a0.im + exact1.re * a1.re + exact1.im * a1.im;
      const im = exact0.re * a0.im - exact0.im * a0.re + exact1.re * a1.im - exact1.im * a1.re;
      return 1 - (re * re + im * im);
    };
    expect(infidelity(50, 1)).toBeLessThan(infidelity(2, 1));
    expect(infidelity(100, 1)).toBeLessThan(1e-3);
    // Second-order is more accurate at equal step count.
    expect(infidelity(4, 2)).toBeLessThan(infidelity(4, 1));
  });

  it('evolves a two-qubit ZZ interaction', () => {
    // H = ZZ commutes with itself; e^{-i ZZ t}|11⟩ = e^{-it}|11⟩ (ZZ|11⟩=+1).
    const t = 0.5;
    const res = sim.execute(
      2,
      [{ coefficient: 1, paulis: ['Z', 'Z'], qubits: [0, 1] }],
      t,
      3,
      1,
      [0, 1],
    );
    const a = amp(res, 3n); // |11⟩
    expect(a.re).toBeCloseTo(Math.cos(t), 9);
    expect(a.im).toBeCloseTo(-Math.sin(t), 9);
  });

  it('rejects invalid terms and step counts', () => {
    expect(() =>
      sim.buildCircuit(1, [{ coefficient: 1, paulis: ['X'], qubits: [0] }], 1, 0),
    ).toThrow();
    expect(() =>
      sim.buildCircuit(1, [{ coefficient: 1, paulis: ['X', 'Z'], qubits: [0] }], 1, 1),
    ).toThrow();
    expect(() =>
      sim.buildCircuit(1, [{ coefficient: 1, paulis: ['X'], qubits: [5] }], 1, 1),
    ).toThrow();
  });
});
