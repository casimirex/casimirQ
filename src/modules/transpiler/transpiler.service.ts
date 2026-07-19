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
import {
  buildLinearCoupling,
  chooseInitialLayout,
  CouplingMap,
  routeCircuit,
  routeCircuitSabre,
} from './routing';
import { controlledUOps, cx, multiControlledUOps, singleQubitOps, toMatrix2 } from './controlled';

/** The native basis this transpiler targets. */
export const NATIVE_BASIS = ['id', 'rz', 'ry', 'cx'];

/** Initial-placement strategy used before routing. */
export type LayoutStrategy =
  /** Start from the identity placement (logical i on physical i). */
  | 'trivial'
  /** Place interacting qubits near each other to cut SWAPs (greedy heuristic). */
  | 'greedy';

/** SWAP-insertion strategy used during routing. */
export type RouterStrategy =
  /** Per-gate greedy: walk one operand along a shortest path. */
  | 'greedy'
  /** SABRE-style lookahead over a front layer + window (usually fewer SWAPs). */
  | 'sabre';

/** Optional hardware constraints to transpile against. */
export interface TranspileOptions {
  /** Qubit connectivity to route onto (mirrors a backend's capability). */
  connectivity?: 'all-to-all' | 'linear';
  /** An explicit coupling map, taking precedence over `connectivity`. */
  coupling?: CouplingMap;
  /** Initial-placement strategy when routing (default `'trivial'`). */
  layout?: LayoutStrategy;
  /** SWAP-insertion strategy when routing (default `'greedy'`). */
  router?: RouterStrategy;
}

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
  /**
   * Present when the circuit was routed onto a coupling graph.
   * `finalPermutation[logical] = physical` qubit that holds it afterwards; read
   * a measurement of logical qubit `l` from physical `finalPermutation[l]`.
   */
  finalPermutation?: number[];
  /**
   * The chosen initial placement, `initialLayout[logical] = physical` qubit it
   * started on. Prepare an input for logical qubit `l` on physical
   * `initialLayout[l]`.
   */
  initialLayout?: number[];
  /** Number of SWAPs inserted by routing (each is `3×cx`). */
  swapCount?: number;
}

const T = Math.PI / 4;

@Injectable()
export class TranspilerService {
  constructor(private readonly runner: SimulationRunnerService) {}

  transpile(spec: CircuitSpec, options: TranspileOptions = {}): TranspileResult {
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
      } else if (controls.length === 1 && type === 'swap' && targets.length === 2) {
        // Controlled-SWAP (Fredkin): CX·CCX·CX.
        out.push(...this.decomposeCswap(controls[0], targets[0], targets[1]));
      } else if (controls.length === 1 && type === 'x') {
        out.push(cx(controls[0], targets[0])); // cx is native
      } else if (controls.length === 1 && type === 'z') {
        out.push(...this.decomposeCz(controls[0], targets[0])); // cz = H·CX·H
      } else if (controls.length === 1 && targets.length === 1) {
        // Any other singly-controlled single-qubit gate: cy, ch, cp, crx/cry/crz,
        // or an arbitrary controlled-U — one general identity covers them all.
        out.push(...this.decomposeControlledU(op.gate.matrix, controls[0], targets[0]));
      } else if (controls.length === 2 && type === 'x') {
        out.push(...this.decomposeToffoli(controls[0], controls[1], targets[0])); // optimized CCX
      } else if (controls.length >= 2 && targets.length === 1) {
        // Any other multi-controlled single-qubit gate (ccz, cccx, …): general
        // recursive decomposition. Not currently reachable via the API gate set,
        // but keeps the transpiler total over any number of controls.
        out.push(...multiControlledUOps(controls, toMatrix2(op.gate.matrix), targets[0]));
      } else {
        // Unsupported: keep the original operation and flag it.
        unsupported.add(controls.length > 0 ? `c${type}` : type);
        out.push(specOps[i]);
      }
    });

    // Optionally route onto a coupling graph so every two-qubit gate acts on
    // physically-coupled qubits (see routing.ts).
    const coupling = this.resolveCoupling(spec.numQubits, options);
    if (coupling) {
      const initialLayout =
        options.layout === 'greedy'
          ? chooseInitialLayout(spec.numQubits, coupling, out)
          : undefined;
      const route = options.router === 'sabre' ? routeCircuitSabre : routeCircuit;
      const routed = route(out, spec.numQubits, coupling, initialLayout);
      return {
        operations: routed.operations,
        basis: NATIVE_BASIS,
        originalGateCount: circuit.operations.length,
        transpiledGateCount: routed.operations.length,
        fullyNative: unsupported.size === 0,
        unsupported: [...unsupported],
        finalPermutation: routed.finalPermutation,
        initialLayout: routed.initialLayout,
        swapCount: routed.swapCount,
      };
    }

    return {
      operations: out,
      basis: NATIVE_BASIS,
      originalGateCount: circuit.operations.length,
      transpiledGateCount: out.length,
      fullyNative: unsupported.size === 0,
      unsupported: [...unsupported],
    };
  }

  /**
   * Resolve the coupling map to route against, or `null` for no routing
   * (all-to-all connectivity). An explicit `coupling` wins; otherwise
   * `connectivity: 'linear'` builds the line graph for the circuit's width.
   */
  private resolveCoupling(numQubits: number, options: TranspileOptions): CouplingMap | null {
    if (options.coupling && options.coupling.length > 0) return options.coupling;
    if (options.connectivity === 'linear') return buildLinearCoupling(numQubits);
    return null;
  }

  /** Decompose a single-qubit unitary (as a matrix) into rz/ry via ZYZ. */
  private decomposeSingleQubit(
    matrix: { get(r: number, c: number): { re: number; im: number } },
    q: number,
  ): CircuitOperationSpec[] {
    return singleQubitOps(toMatrix2(matrix), q);
  }

  /**
   * Decompose a singly-controlled single-qubit gate `controlled-U` into native
   * gates via the standard ABC identity (Nielsen & Chuang §4.3). See
   * `controlledUOps` in controlled.ts for the derivation; the φ (global-phase)
   * term is what carries the relative phase that makes `cp` — and thus QFT —
   * work.
   */
  private decomposeControlledU(
    matrix: { get(r: number, c: number): { re: number; im: number } },
    control: number,
    target: number,
  ): CircuitOperationSpec[] {
    return controlledUOps(toMatrix2(matrix), control, target);
  }

  /**
   * Controlled-SWAP (Fredkin): `CSWAP(c,a,b) = CX(a,b)·CCX(c,b,a)·CX(a,b)`. The
   * outer CX turns the swap into a controlled-parity that the Toffoli conditions
   * on the control, so a,b are exchanged exactly when the control is |1⟩.
   */
  private decomposeCswap(control: number, a: number, b: number): CircuitOperationSpec[] {
    return [cx(a, b), ...this.decomposeToffoli(control, b, a), cx(a, b)];
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
