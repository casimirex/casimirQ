/**
 * TranspilerService.
 *
 * Rewrites a circuit into a target *native* gate basis — the job every real
 * quantum device requires, since hardware only executes a fixed set of gates.
 *
 * Strategy:
 *   - Any single-qubit gate is decomposed via the general ZYZ Euler routine into
 *     `rz` / `ry` (correct-by-construction; see zyz.ts).
 *   - Any *singly-controlled* single-qubit gate (cx, cy, cz, ch, cp, crx, cry,
 *     crz, or any controlled-U) is decomposed via the general ABC identity into
 *     two `cx` plus single-qubit rotations. `cx` and `cz` keep hand-optimized
 *     fast paths since they are so common.
 *   - `swap` and `ccx` (Toffoli) use standard, verified identities that bottom
 *     out in `cx` + single-qubit gates.
 *   - Anything else (multi-controlled gates beyond Toffoli) is passed through
 *     unchanged and reported as unsupported.
 *
 * Correctness is verified by simulation equivalence: a transpiled circuit yields
 * the same measurement distribution as the original (see the spec).
 */

import { Injectable } from '@nestjs/common';
import {
  CircuitOperationSpec,
  CircuitSpec,
  SimulationRunnerService,
} from '../api/services/simulation-runner.service';
import { Matrix2, normalizeAngle, zyzAngles } from './zyz';

/** The native basis this transpiler targets. */
export const NATIVE_BASIS = ['id', 'rz', 'ry', 'cx'];

export interface TranspileResult {
  /** The circuit rewritten into (mostly) native gates. */
  operations: CircuitOperationSpec[];
  /** The native basis targeted. */
  basis: string[];
  /** Operation count before / after. */
  originalGateCount: number;
  transpiledGateCount: number;
  /** Whether every operation is now in the native basis. */
  fullyNative: boolean;
  /** Gate types that could not be decomposed (passed through unchanged). */
  unsupported: string[];
}

const T = Math.PI / 4;

@Injectable()
export class TranspilerService {
  constructor(private readonly runner: SimulationRunnerService) {}

  transpile(spec: CircuitSpec): TranspileResult {
    // Build the circuit so we have each gate's matrix, type, and controls. The
    // built operations correspond 1:1 to the spec operations, in order.
    const circuit = this.runner.buildCircuit(spec);
    const specOps = spec.operations ?? [];

    const out: CircuitOperationSpec[] = [];
    const unsupported = new Set<string>();

    circuit.operations.forEach((op, i) => {
      const type = op.gate.type.toLowerCase();
      const controls = op.controls ?? [];
      const targets = op.targets;

      // Structural ops pass through.
      if (type === 'measure' || type === 'barrier') {
        out.push(specOps[i]);
        return;
      }

      if (controls.length === 0 && targets.length === 1) {
        out.push(...this.decomposeSingleQubit(op.gate.matrix, targets[0]));
      } else if (controls.length === 0 && targets.length === 2 && type === 'swap') {
        out.push(...this.decomposeSwap(targets[0], targets[1]));
      } else if (controls.length === 1 && type === 'x') {
        out.push(cx(controls[0], targets[0])); // cx is native
      } else if (controls.length === 1 && type === 'z') {
        out.push(...this.decomposeCz(controls[0], targets[0])); // cz = H·CX·H
      } else if (controls.length === 1 && targets.length === 1) {
        // Any other singly-controlled single-qubit gate: cy, ch, cp, crx/cry/crz,
        // or an arbitrary controlled-U — one general identity covers them all.
        out.push(...this.decomposeControlledU(op.gate.matrix, controls[0], targets[0]));
      } else if (controls.length === 2 && type === 'x') {
        out.push(...this.decomposeToffoli(controls[0], controls[1], targets[0]));
      } else {
        // Unsupported: keep the original operation and flag it.
        unsupported.add(controls.length > 0 ? `c${type}` : type);
        out.push(specOps[i]);
      }
    });

    return {
      operations: out,
      basis: NATIVE_BASIS,
      originalGateCount: circuit.operations.length,
      transpiledGateCount: out.length,
      fullyNative: unsupported.size === 0,
      unsupported: [...unsupported],
    };
  }

  /** Decompose a single-qubit unitary (as a matrix) into rz/ry via ZYZ. */
  private decomposeSingleQubit(
    matrix: { get(r: number, c: number): { re: number; im: number } },
    q: number,
  ): CircuitOperationSpec[] {
    const m: Matrix2 = [
      [entry(matrix, 0, 0), entry(matrix, 0, 1)],
      [entry(matrix, 1, 0), entry(matrix, 1, 1)],
    ];
    const { alpha, beta, gamma } = zyzAngles(m);
    // U ∝ Rz(alpha) Ry(beta) Rz(gamma); applied order is gamma, beta, alpha.
    const ops: CircuitOperationSpec[] = [];
    pushRotation(ops, 'rz', gamma, q);
    pushRotation(ops, 'ry', beta, q);
    pushRotation(ops, 'rz', alpha, q);
    return ops;
  }

  /**
   * Decompose a singly-controlled single-qubit gate `controlled-U` into native
   * gates via the standard ABC identity (Nielsen & Chuang §4.3).
   *
   * Write the target unitary — *including its global phase* — as
   *   U = e^{iφ}·Rz(α)·Ry(β)·Rz(γ).
   * Then define
   *   A = Rz(α)·Ry(β/2),  B = Ry(−β/2)·Rz(−(γ+α)/2),  C = Rz((γ−α)/2),
   * so that A·B·C = I and A·X·B·X·C = Rz(α)Ry(β)Rz(γ). The controlled gate is
   *   [phase(φ) on control] · A(t) · CX · B(t) · CX · C(t),
   * which fires U on the target exactly when the control is |1⟩. For a plain
   * `cp(θ)` this reduces to the textbook controlled-phase; the φ term is what
   * carries the phase that makes `cp` (and thus QFT) work.
   */
  private decomposeControlledU(
    matrix: { get(r: number, c: number): { re: number; im: number } },
    control: number,
    target: number,
  ): CircuitOperationSpec[] {
    const m: Matrix2 = [
      [entry(matrix, 0, 0), entry(matrix, 0, 1)],
      [entry(matrix, 1, 0), entry(matrix, 1, 1)],
    ];
    const { alpha, beta, gamma, phase } = zyzAngles(m);

    const ops: CircuitOperationSpec[] = [];
    // C = Rz((γ−α)/2)
    pushRotation(ops, 'rz', (gamma - alpha) / 2, target);
    ops.push(cx(control, target));
    // B = Ry(−β/2)·Rz(−(γ+α)/2)  → apply Rz first, then Ry.
    pushRotation(ops, 'rz', -(gamma + alpha) / 2, target);
    pushRotation(ops, 'ry', -beta / 2, target);
    ops.push(cx(control, target));
    // A = Rz(α)·Ry(β/2)  → apply Ry first, then Rz.
    pushRotation(ops, 'ry', beta / 2, target);
    pushRotation(ops, 'rz', alpha, target);
    // phase(φ) on the control ≡ Rz(φ) up to a (global, invisible) phase.
    pushRotation(ops, 'rz', phase, control);
    return ops;
  }

  /** Native operations equivalent to a Hadamard on `q`. */
  private hadamard(q: number): CircuitOperationSpec[] {
    const inv = 1 / Math.SQRT2;
    const h: Matrix2 = [
      [
        { re: inv, im: 0 },
        { re: inv, im: 0 },
      ],
      [
        { re: inv, im: 0 },
        { re: -inv, im: 0 },
      ],
    ];
    const { alpha, beta, gamma } = zyzAngles(h);
    const ops: CircuitOperationSpec[] = [];
    pushRotation(ops, 'rz', gamma, q);
    pushRotation(ops, 'ry', beta, q);
    pushRotation(ops, 'rz', alpha, q);
    return ops;
  }

  /** SWAP = CX·CX·CX. */
  private decomposeSwap(a: number, b: number): CircuitOperationSpec[] {
    return [cx(a, b), cx(b, a), cx(a, b)];
  }

  /** CZ = H(t)·CX·H(t). */
  private decomposeCz(control: number, target: number): CircuitOperationSpec[] {
    return [...this.hadamard(target), cx(control, target), ...this.hadamard(target)];
  }

  /** Standard Toffoli (CCX) decomposition into H, T, T†, CX. */
  private decomposeToffoli(c1: number, c2: number, t: number): CircuitOperationSpec[] {
    const ops: CircuitOperationSpec[] = [];
    const rz = (angle: number, q: number) => pushRotation(ops, 'rz', angle, q);

    ops.push(...this.hadamard(t));
    ops.push(cx(c2, t));
    rz(-T, t);
    ops.push(cx(c1, t));
    rz(T, t);
    ops.push(cx(c2, t));
    rz(-T, t);
    ops.push(cx(c1, t));
    rz(T, c2);
    rz(T, t);
    ops.push(...this.hadamard(t));
    ops.push(cx(c1, c2));
    rz(T, c1);
    rz(-T, c2);
    ops.push(cx(c1, c2));
    return ops;
  }
}

function entry(
  matrix: { get(r: number, c: number): { re: number; im: number } },
  r: number,
  c: number,
): { re: number; im: number } {
  const e = matrix.get(r, c);
  return { re: e.re, im: e.im };
}

function cx(control: number, target: number): CircuitOperationSpec {
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
