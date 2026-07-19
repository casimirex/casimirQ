/**
 * Controlled-gate decompositions into the native basis.
 *
 * These are pure functions over 2×2 matrices (see zyz.ts for the single-qubit
 * Euler engine). They cover, in one place:
 *   - `singleQubitOps`     — U → rz/ry
 *   - `controlledUOps`     — controlled-U → 2×cx + rotations (ABC identity)
 *   - `multiControlledUOps`— C^n(U) → recursive Barenco decomposition
 *
 * The multi-controlled routine bottoms out in `controlledUOps`, so any
 * multi-controlled single-qubit gate — for any number of controls — reduces to
 * native gates without ancillas. Correctness is verified by simulation
 * equivalence (see controlled.spec.ts).
 */

import { CircuitOperationSpec } from '../api/services/simulation-runner.service';
import { Complex2, Matrix2, normalizeAngle, zyzAngles } from './zyz';

/** A native CX on (control, target). */
export function cx(control: number, target: number): CircuitOperationSpec {
  return { gate: 'cx', targets: [control, target] };
}

/** Append a rotation op, skipping angles that are effectively zero. */
function pushRotation(
  ops: CircuitOperationSpec[],
  gate: 'rz' | 'ry',
  angle: number,
  q: number,
): void {
  const a = normalizeAngle(angle);
  if (Math.abs(a) < 1e-12) return;
  ops.push({ gate, targets: [q], params: [a] });
}

/** Decompose a single-qubit unitary into rz/ry via ZYZ. */
export function singleQubitOps(m: Matrix2, q: number): CircuitOperationSpec[] {
  const { alpha, beta, gamma } = zyzAngles(m);
  const ops: CircuitOperationSpec[] = [];
  pushRotation(ops, 'rz', gamma, q);
  pushRotation(ops, 'ry', beta, q);
  pushRotation(ops, 'rz', alpha, q);
  return ops;
}

/**
 * Decompose a singly-controlled single-qubit gate via the ABC identity
 * (Nielsen & Chuang §4.3). `U = e^{iφ}·Rz(α)Ry(β)Rz(γ)`, then
 *   A = Rz(α)Ry(β/2), B = Ry(−β/2)Rz(−(γ+α)/2), C = Rz((γ−α)/2),
 * and controlled-U = [phase(φ) on control]·A(t)·CX·B(t)·CX·C(t).
 */
export function controlledUOps(m: Matrix2, control: number, target: number): CircuitOperationSpec[] {
  const { alpha, beta, gamma, phase } = zyzAngles(m);
  const ops: CircuitOperationSpec[] = [];
  pushRotation(ops, 'rz', (gamma - alpha) / 2, target); // C
  ops.push(cx(control, target));
  pushRotation(ops, 'rz', -(gamma + alpha) / 2, target); // B
  pushRotation(ops, 'ry', -beta / 2, target);
  ops.push(cx(control, target));
  pushRotation(ops, 'ry', beta / 2, target); // A
  pushRotation(ops, 'rz', alpha, target);
  pushRotation(ops, 'rz', phase, control); // phase(φ) on the control
  return ops;
}

/**
 * Decompose a multi-controlled single-qubit gate `C^n(U)` recursively (Barenco
 * et al. 1995): with `V` a square root of `U`,
 *   C^n(U) = C(cₙ, V)·C^{n−1}(c₁..cₙ₋₁, X on cₙ)·C(cₙ, V†)
 *            ·C^{n−1}(c₁..cₙ₋₁, X on cₙ)·C^{n−1}(c₁..cₙ₋₁, V).
 * Each level halves the "strength" of the gate and drops one control, so the
 * recursion terminates in singly-controlled gates. Ancilla-free; exact.
 */
export function multiControlledUOps(
  controls: number[],
  m: Matrix2,
  target: number,
): CircuitOperationSpec[] {
  if (controls.length === 0) return singleQubitOps(m, target);
  if (controls.length === 1) return controlledUOps(m, controls[0], target);

  const v = sqrtMatrix2(m);
  const vdag = dagger(v);
  const last = controls[controls.length - 1];
  const rest = controls.slice(0, -1);

  return [
    ...controlledUOps(v, last, target),
    ...multiControlledUOps(rest, PAULI_X, last),
    ...controlledUOps(vdag, last, target),
    ...multiControlledUOps(rest, PAULI_X, last),
    ...multiControlledUOps(rest, v, target),
  ];
}

// --- 2×2 complex-matrix helpers ---

const PAULI_X: Matrix2 = [
  [
    { re: 0, im: 0 },
    { re: 1, im: 0 },
  ],
  [
    { re: 1, im: 0 },
    { re: 0, im: 0 },
  ],
];

function cMul(a: Complex2, b: Complex2): Complex2 {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function cAdd(a: Complex2, b: Complex2): Complex2 {
  return { re: a.re + b.re, im: a.im + b.im };
}

/** Principal square root of a complex number. */
function cSqrt(z: Complex2): Complex2 {
  const r = Math.hypot(z.re, z.im);
  const theta = Math.atan2(z.im, z.re);
  const sr = Math.sqrt(r);
  return { re: sr * Math.cos(theta / 2), im: sr * Math.sin(theta / 2) };
}

/** Complex division a / b. */
function cDiv(a: Complex2, b: Complex2): Complex2 {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}

/** Conjugate transpose of a 2×2 matrix. */
function dagger(m: Matrix2): Matrix2 {
  const conj = (z: Complex2): Complex2 => ({ re: z.re, im: -z.im });
  return [
    [conj(m[0][0]), conj(m[1][0])],
    [conj(m[0][1]), conj(m[1][1])],
  ];
}

/**
 * Principal square root of a 2×2 matrix via the closed form
 * `√M = (M + s·I) / t`, with `s = √det(M)` and `t = √(tr(M) + 2s)`. If the
 * primary branch degenerates (`t ≈ 0`), the other branch of `s` is used.
 */
export function sqrtMatrix2(m: Matrix2): Matrix2 {
  const det = cAdd(cMul(m[0][0], m[1][1]), {
    re: -(m[0][1].re * m[1][0].re - m[0][1].im * m[1][0].im),
    im: -(m[0][1].re * m[1][0].im + m[0][1].im * m[1][0].re),
  });
  const tr = cAdd(m[0][0], m[1][1]);

  let s = cSqrt(det);
  let t = cSqrt(cAdd(tr, { re: 2 * s.re, im: 2 * s.im }));
  if (Math.hypot(t.re, t.im) < 1e-9) {
    s = { re: -s.re, im: -s.im };
    t = cSqrt(cAdd(tr, { re: 2 * s.re, im: 2 * s.im }));
  }

  const withS: Matrix2 = [
    [cAdd(m[0][0], s), m[0][1]],
    [m[1][0], cAdd(m[1][1], s)],
  ];
  return [
    [cDiv(withS[0][0], t), cDiv(withS[0][1], t)],
    [cDiv(withS[1][0], t), cDiv(withS[1][1], t)],
  ];
}

/** Extract a plain [[..],[..]] Matrix2 from a circuit gate's matrix object. */
export function toMatrix2(matrix: {
  get(r: number, c: number): { re: number; im: number };
}): Matrix2 {
  const e = (r: number, c: number): Complex2 => {
    const v = matrix.get(r, c);
    return { re: v.re, im: v.im };
  };
  return [
    [e(0, 0), e(0, 1)],
    [e(1, 0), e(1, 1)],
  ];
}
