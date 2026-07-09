/**
 * Clifford Engine (Stabilizer Simulator)
 *
 * Simulates Clifford circuits (circuits with only H, S, CNOT, and Pauli gates)
 * using the CHP (CNOT-Hadamard-Phase) algorithm.
 *
 * Performance: O(n²) per gate, O(n) per measurement
 * Supports 1000+ qubits for stabilizer circuits.
 *
 * Reference: Aaronson & Gottesman (2004)
 * "Improved simulation of stabilizer circuits"
 */

import { Injectable } from '@nestjs/common';
import {
  ISimulationEngine,
  ISimulationResult,
  ISimulationOptions,
  IResourceEstimate,
  IMeasurementOutcome,
} from '../../interfaces/simulation-engine.interface';
import { Circuit, IGateOperation } from '../../../circuit-engine/circuit';
import { Complex } from '../../../../common/utils/complex';

/**
 * Pauli operator: X^a * Z^b * phase
 * where a, b ∈ {0, 1} and phase ∈ {1, i, -1, -i}
 */
interface PauliOp {
  x: boolean;
  z: boolean;
  phase: number; // 0: 1, 1: i, 2: -1, 3: -i
}

/**
 * A whole-register Pauli: (i^g) · ⊗_j X^{a_j} Z^{b_j}.
 * The X and Z parts are packed as bitmasks (bit j = qubit j) so the
 * representation scales to many qubits.
 */
interface PackedPauli {
  a: bigint; // X part
  b: bigint; // Z part
  g: number; // global phase exponent of i (mod 4)
}

/** Largest support (2^r) toStatevector will materialize. */
const MAX_STATEVECTOR_QUBITS = 16;

function popcountBig(x: bigint): number {
  let count = 0;
  let v = x;
  while (v > 0n) {
    count += Number(v & 1n);
    v >>= 1n;
  }
  return count;
}

function parityBig(x: bigint): number {
  return popcountBig(x) & 1;
}

function lowestSetBit(x: bigint): number {
  let i = 0;
  while (((x >> BigInt(i)) & 1n) === 0n) {
    i++;
  }
  return i;
}

/** Seeded mulberry32 PRNG (deterministic when a seed is given). */
function makeRng(seed?: number): () => number {
  if (seed === undefined) {
    return Math.random;
  }
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Product of two Paulis in (i^g · X^a Z^b) form. */
function mulPauli(p: PackedPauli, q: PackedPauli): PackedPauli {
  // Z^{p.b} X^{q.a} = (-1)^{p.b · q.a} X^{q.a} Z^{p.b}
  const sign = 2 * (popcountBig(p.b & q.a) & 1);
  return {
    a: p.a ^ q.a,
    b: p.b ^ q.b,
    g: (p.g + q.g + sign) & 3,
  };
}

/**
 * Stabilizer Tableau
 *
 * Represents n qubits using 2n generators:
 * - n stabilizer generators (rows 0 to n-1)
 * - n destabilizer generators (rows n to 2n-1)
 *
 * Each generator is a Pauli operator on n qubits
 * plus a phase (±1).
 */
class StabilizerTableau {
  // x[k][j] = whether operator k has X on qubit j
  x: Uint8Array[];
  // z[k][j] = whether operator k has Z on qubit j
  z: Uint8Array[];
  // phase[k] = phase (0: +1, 1: +i, 2: -1, 3: -i)
  phase: Uint8Array;

  numQubits: number;

  constructor(n: number) {
    this.numQubits = n;
    const size = 2 * n;

    this.x = Array(size)
      .fill(null)
      .map(() => new Uint8Array(n));
    this.z = Array(size)
      .fill(null)
      .map(() => new Uint8Array(n));
    this.phase = new Uint8Array(size);

    // Initialize to |0...0⟩ state
    // Stabilizers: Z on each qubit
    // Destabilizers: X on each qubit
    for (let i = 0; i < n; i++) {
      // Destabilizer X_i
      this.x[n + i][i] = 1;
      // Stabilizer Z_i
      this.z[i][i] = 1;
    }
  }

  /**
   * Apply H gate to qubit j
   * H: X ↔ Z
   */
  applyH(j: number): void {
    const n = this.numQubits;

    for (let k = 0; k < 2 * n; k++) {
      // Swap x[k][j] and z[k][j]
      const temp = this.x[k][j];
      this.x[k][j] = this.z[k][j];
      this.z[k][j] = temp;

      // Update phase if both X and Z were present (Y → -Y)
      if (this.x[k][j] && this.z[k][j]) {
        this.phase[k] = (this.phase[k] + 2) % 4;
      }
    }
  }

  /**
   * Apply S gate to qubit j
   * S: X → Y, Z → Z
   */
  applyS(j: number): void {
    const n = this.numQubits;

    // S X S† = Y = i·XZ, S Z S† = Z. So when X is present, add a Z and an
    // overall factor of i (phase += 1).
    for (let k = 0; k < 2 * n; k++) {
      if (this.x[k][j]) {
        this.phase[k] = (this.phase[k] + 1) % 4;
        this.z[k][j] ^= 1;
      }
    }
  }

  /**
   * Apply CNOT from control c to target t
   * CNOT: Xc → XcXt, Zt → ZcZt
   */
  applyCNOT(c: number, t: number): void {
    const n = this.numQubits;

    for (let k = 0; k < 2 * n; k++) {
      // X on control → X on both
      if (this.x[k][c]) {
        this.x[k][t] ^= 1;
      }

      // Z on target → Z on both
      if (this.z[k][t]) {
        this.z[k][c] ^= 1;
      }

      // Update phase for Y ⊗ Y
      if (this.x[k][c] && this.z[k][c] && this.x[k][t] && this.z[k][t]) {
        this.phase[k] = (this.phase[k] + 2) % 4;
      }
    }
  }

  /**
   * Apply Pauli X to qubit j.
   * Conjugation by X flips the sign of any generator that anticommutes with
   * X on qubit j — i.e. those with a Z component (z = 1).
   */
  applyX(j: number): void {
    const n = this.numQubits;
    for (let k = 0; k < 2 * n; k++) {
      if (this.z[k][j]) {
        this.phase[k] = (this.phase[k] + 2) % 4;
      }
    }
  }

  /**
   * Apply Pauli Z to qubit j.
   * Flips the sign of generators that anticommute with Z (those with x = 1).
   */
  applyZ(j: number): void {
    const n = this.numQubits;
    for (let k = 0; k < 2 * n; k++) {
      if (this.x[k][j]) {
        this.phase[k] = (this.phase[k] + 2) % 4;
      }
    }
  }

  /**
   * Apply Pauli Y to qubit j.
   * Flips the sign of generators that anticommute with Y (those with exactly
   * one of X, Z on qubit j, i.e. x XOR z).
   */
  applyY(j: number): void {
    const n = this.numQubits;
    for (let k = 0; k < 2 * n; k++) {
      if (this.x[k][j] ^ this.z[k][j]) {
        this.phase[k] = (this.phase[k] + 2) % 4;
      }
    }
  }

  /** Read row k as a packed Pauli (i^g · X^a Z^b). */
  private rowPauli(k: number): PackedPauli {
    let a = 0n;
    let b = 0n;
    for (let j = 0; j < this.numQubits; j++) {
      if (this.x[k][j]) a |= 1n << BigInt(j);
      if (this.z[k][j]) b |= 1n << BigInt(j);
    }
    return { a, b, g: this.phase[k] };
  }

  /** Write a packed Pauli back into row k. */
  private writeRow(k: number, p: PackedPauli): void {
    for (let j = 0; j < this.numQubits; j++) {
      this.x[k][j] = (p.a >> BigInt(j)) & 1n ? 1 : 0;
      this.z[k][j] = (p.b >> BigInt(j)) & 1n ? 1 : 0;
    }
    this.phase[k] = p.g & 3;
  }

  /** Left-multiply row h by row i (row_h ← row_i · row_h). */
  private rowsum(h: number, i: number): void {
    this.writeRow(h, mulPauli(this.rowPauli(i), this.rowPauli(h)));
  }

  /**
   * Projectively measure qubit `a` in the computational basis (observable Z_a).
   *
   * Follows the Aaronson–Gottesman algorithm: if a stabilizer generator
   * anticommutes with Z_a the outcome is random and the tableau collapses; if
   * Z_a commutes with every stabilizer the outcome is determined by the product
   * of the stabilizers that equals ±Z_a. `random` supplies the coin flip.
   *
   * Rows [0, n) are stabilizers, [n, 2n) the paired destabilizers.
   */
  measure(a: number, random: () => number): { value: 0 | 1; probability: number } {
    const n = this.numQubits;

    // A generator anticommutes with Z_a iff it has an X component on qubit a.
    let p = -1;
    for (let k = 0; k < n; k++) {
      if (this.x[k][a]) {
        p = k;
        break;
      }
    }

    if (p !== -1) {
      // --- Random outcome: collapse onto the ±Z_a eigenspace. ---
      const outcome: 0 | 1 = random() < 0.5 ? 0 : 1;

      // Make every other generator commute with Z_a by multiplying in row p.
      for (let k = 0; k < 2 * n; k++) {
        if (k !== p && this.x[k][a]) {
          this.rowsum(k, p);
        }
      }

      // The old stabilizer p becomes the new destabilizer; the new stabilizer
      // is (-1)^outcome · Z_a.
      this.writeRow(p + n, this.rowPauli(p));
      for (let j = 0; j < n; j++) {
        this.x[p][j] = 0;
        this.z[p][j] = 0;
      }
      this.z[p][a] = 1;
      this.phase[p] = outcome ? 2 : 0;

      return { value: outcome, probability: 0.5 };
    }

    // --- Deterministic outcome: no state change. ---
    // Z_a equals ± the product of the stabilizers whose destabilizer
    // anticommutes with Z_a; that product's sign is the outcome.
    let acc: PackedPauli = { a: 0n, b: 0n, g: 0 };
    for (let d = n; d < 2 * n; d++) {
      if (this.x[d][a]) {
        acc = mulPauli(acc, this.rowPauli(d - n));
      }
    }
    const value: 0 | 1 = (acc.g & 3) === 2 ? 1 : 0;
    return { value, probability: 1 };
  }

  /**
   * Get current state as Pauli stabilizers
   */
  getStabilizers(): PauliOp[][] {
    const n = this.numQubits;
    const stabilizers: PauliOp[][] = [];

    for (let k = 0; k < n; k++) {
      const stabilizer: PauliOp[] = [];
      for (let j = 0; j < n; j++) {
        stabilizer.push({
          x: this.x[k][j] === 1,
          z: this.z[k][j] === 1,
          phase: this.phase[k],
        });
      }
      stabilizers.push(stabilizer);
    }

    return stabilizers;
  }

  /**
   * Convert the stabilizer state to a (sparse) statevector.
   *
   * Reconstructs the true amplitudes of the state stabilized by the tableau's
   * generators, rather than assuming |0…0⟩. Only the non-zero amplitudes are
   * returned. Practical only when the support (2^r, r = number of independent
   * X-type generators) is small — states with support larger than
   * 2^MAX_STATEVECTOR_QUBITS return an empty map since a dense statevector
   * would be infeasible.
   *
   * Algorithm: the state is the +1 eigenstate of the n stabilizer generators
   * g_k = i^{phase_k} · ⊗_j X^{x_kj} Z^{z_kj}. We
   *   1. Gaussian-eliminate the generators by their X-parts, splitting them
   *      into r "pivot" generators (non-trivial X) and diagonal (pure-Z) ones;
   *   2. solve the diagonal constraints for a reference basis state |x0⟩ in
   *      the support;
   *   3. expand the projector ∏(I+g_pivot)/2 |x0⟩ over the 2^r pivot subgroup,
   *      giving amplitude i^g(-1)^{b·x0}/√(2^r) at |x0 ⊕ a⟩ for each element.
   */
  toStatevector(): Map<bigint, Complex> {
    const n = this.numQubits;
    const statevector = new Map<bigint, Complex>();
    if (n === 0) {
      statevector.set(0n, new Complex(1, 0));
      return statevector;
    }

    // Extract the n stabilizer generators as packed Paulis.
    const generators: PackedPauli[] = [];
    for (let k = 0; k < n; k++) {
      let a = 0n;
      let b = 0n;
      for (let j = 0; j < n; j++) {
        if (this.x[k][j]) a |= 1n << BigInt(j);
        if (this.z[k][j]) b |= 1n << BigInt(j);
      }
      generators.push({ a, b, g: this.phase[k] });
    }

    // 1. Row-reduce by X-part → pivot generators (distinct X pivot bits) and
    //    diagonal generators (pure Z).
    const pivots: PackedPauli[] = [];
    const pivotBits: number[] = [];
    const diagonals: PackedPauli[] = [];

    for (const gen of generators) {
      let cur = gen;
      for (let i = 0; i < pivots.length; i++) {
        if ((cur.a >> BigInt(pivotBits[i])) & 1n) {
          cur = mulPauli(cur, pivots[i]);
        }
      }
      if (cur.a === 0n) {
        diagonals.push(cur);
      } else {
        const bit = lowestSetBit(cur.a);
        for (let i = 0; i < pivots.length; i++) {
          if ((pivots[i].a >> BigInt(bit)) & 1n) {
            pivots[i] = mulPauli(pivots[i], cur);
          }
        }
        pivots.push(cur);
        pivotBits.push(bit);
      }
    }

    const r = pivots.length;
    if (r > MAX_STATEVECTOR_QUBITS) {
      // Support too large to materialize a dense statevector.
      return statevector;
    }

    // 2. Solve diagonal constraints b·x = s (s from the ±1 sign) for a
    //    reference state |x0⟩, via GF(2) elimination on the Z-parts.
    const rowMasks: bigint[] = [];
    const rowSigns: number[] = [];
    const rowPivots: number[] = [];
    for (const d of diagonals) {
      let mask = d.b;
      // Diagonal generator is i^g Z-string; Hermitian ⇒ g ∈ {0, 2}.
      let sign = (d.g & 2) === 2 ? 1 : 0;
      for (let i = 0; i < rowMasks.length; i++) {
        if ((mask >> BigInt(rowPivots[i])) & 1n) {
          mask ^= rowMasks[i];
          sign ^= rowSigns[i];
        }
      }
      if (mask === 0n) continue; // dependent constraint
      rowMasks.push(mask);
      rowSigns.push(sign);
      rowPivots.push(lowestSetBit(mask));
    }

    let x0 = 0n;
    for (let i = rowMasks.length - 1; i >= 0; i--) {
      const bit = rowPivots[i];
      const rest = rowMasks[i] & ~(1n << BigInt(bit));
      const value = rowSigns[i] ^ parityBig(rest & x0);
      if (value) x0 |= 1n << BigInt(bit);
    }

    // 3. Enumerate the 2^r pivot subgroup via Gray code (generators commute,
    //    so each step multiplies the running product by one generator).
    const support = 1 << r;
    const norm = 1 / Math.sqrt(support);

    const setAmplitude = (p: PackedPauli): void => {
      const target = x0 ^ p.a;
      const magnitude = norm * (parityBig(p.b & x0) ? -1 : 1);
      let re = 0;
      let im = 0;
      switch (p.g & 3) {
        case 0:
          re = magnitude;
          break;
        case 1:
          im = magnitude;
          break;
        case 2:
          re = -magnitude;
          break;
        default:
          im = -magnitude;
          break;
      }
      statevector.set(target, new Complex(re, im));
    };

    let product: PackedPauli = { a: 0n, b: 0n, g: 0 };
    let gray = 0;
    setAmplitude(product);
    for (let i = 1; i < support; i++) {
      const nextGray = i ^ (i >> 1);
      const flipped = 31 - Math.clz32(gray ^ nextGray);
      product = mulPauli(product, pivots[flipped]);
      gray = nextGray;
      setAmplitude(product);
    }

    return statevector;
  }
}

@Injectable()
export class CliffordEngine implements ISimulationEngine {
  readonly name = 'Clifford';
  readonly maxQubits = 2000;

  /**
   * Check if circuit can be simulated
   * Only Clifford circuits are supported
   */
  supports(circuit: Circuit): boolean {
    if (circuit.numQubits > this.maxQubits) {
      return false;
    }

    // Check if all gates are Clifford
    const cliffordGates = new Set([
      'i',
      'id',
      'x',
      'y',
      'z',
      'h',
      's',
      'sdg',
      'cx',
      'cnot',
      'cz',
      'swap',
      'measure',
      'barrier',
    ]);

    for (const op of circuit.operations) {
      if (!cliffordGates.has(op.gate.type.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Estimate resources
   */
  estimateResources(circuit: Circuit): IResourceEstimate {
    const n = circuit.numQubits;

    // Memory: O(n²) for tableau
    const memoryBytes = 2 * n * 2 * n * 4; // 2n rows, n cols, 2 arrays, 4 bytes each

    // Time: O(n²) per gate, O(n) per measurement
    const numGates = circuit.gateCount();
    const timePerGate = n * n * 0.001; // very fast
    const timeMs = numGates * timePerGate;

    let canSimulate = true;
    let reason: string | undefined;

    if (n > this.maxQubits) {
      canSimulate = false;
      reason = `Too many qubits: ${n} > max ${this.maxQubits}`;
    }

    return { memoryBytes, timeMs, canSimulate, reason };
  }

  /**
   * Simulate Clifford circuit
   */
  simulate(circuit: Circuit, options: ISimulationOptions = {}): ISimulationResult {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const numQubits = circuit.numQubits;
    const tableau = new StabilizerTableau(numQubits);
    const measurements: IMeasurementOutcome[] = [];
    const random = makeRng(options.seed);

    for (const op of circuit.operations) {
      this.applyOperation(tableau, op, random, measurements);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    // Convert to statevector (for compatibility)
    // Note: This is only practical for small n
    const statevector = tableau.toStatevector();

    return {
      statevector,
      numQubits,
      measurements: measurements.length > 0 ? measurements : undefined,
      executionTimeMs: endTime - startTime,
      memoryUsageBytes: Math.max(0, endMemory - startMemory),
    };
  }

  /**
   * Apply a single circuit operation to the tableau.
   *
   * Controlled gates are stored as a base gate (e.g. XGate) plus a `controls`
   * array — cx(c,t) is XGate on target t controlled by c — so control/target
   * are read from `controls`/`targets`, not two entries of `targets`.
   */
  private applyOperation(
    tableau: StabilizerTableau,
    op: IGateOperation,
    random: () => number,
    measurements: IMeasurementOutcome[],
  ): void {
    const type = op.gate.type.toLowerCase();
    const controls = op.controls ?? [];
    const targets = op.targets;

    if (controls.length > 0) {
      const control = controls[0];
      const target = targets[0];
      switch (type) {
        case 'x': // controlled-X = CNOT
          tableau.applyCNOT(control, target);
          return;
        case 'z': // controlled-Z = H(t) · CNOT · H(t)
          tableau.applyH(target);
          tableau.applyCNOT(control, target);
          tableau.applyH(target);
          return;
        default:
          throw new Error(`Unsupported controlled gate in Clifford simulator: ${type}`);
      }
    }

    switch (type) {
      case 'i':
      case 'id':
      case 'barrier':
        break;
      case 'x':
        tableau.applyX(targets[0]);
        break;
      case 'y':
        tableau.applyY(targets[0]);
        break;
      case 'z':
        tableau.applyZ(targets[0]);
        break;
      case 'h':
        tableau.applyH(targets[0]);
        break;
      case 's':
        tableau.applyS(targets[0]);
        break;
      case 'sdg':
        tableau.applyS(targets[0]);
        tableau.applyS(targets[0]);
        tableau.applyS(targets[0]);
        break;
      case 'cx':
      case 'cnot':
        // Fallback: an explicit two-target CNOT representation.
        tableau.applyCNOT(targets[0], targets[1]);
        break;
      case 'cz':
        tableau.applyH(targets[1]);
        tableau.applyCNOT(targets[0], targets[1]);
        tableau.applyH(targets[1]);
        break;
      case 'swap':
        tableau.applyCNOT(targets[0], targets[1]);
        tableau.applyCNOT(targets[1], targets[0]);
        tableau.applyCNOT(targets[0], targets[1]);
        break;
      case 'measure':
        for (const qubit of targets) {
          const result = tableau.measure(qubit, random);
          measurements.push({
            qubit,
            value: result.value,
            probability: result.probability,
          });
        }
        break;
      default:
        throw new Error(`Unsupported gate in Clifford simulator: ${op.gate.type}`);
    }
  }

  /**
   * Get stabilizer generators
   */
  getStabilizers(circuit: Circuit): PauliOp[][] {
    const tableau = new StabilizerTableau(circuit.numQubits);
    for (const op of circuit.operations) {
      this.applyOperation(tableau, op, Math.random, []);
    }
    return tableau.getStabilizers();
  }

  /**
   * Check if state is stabilizer state
   */
  isStabilizerState(circuit: Circuit): boolean {
    return this.supports(circuit);
  }

  /**
   * Run simulation (alias for simulate)
   */
  run(circuit: Circuit, options?: ISimulationOptions): ISimulationResult {
    return this.simulate(circuit, options);
  }
}
