/**
 * Density-matrix simulation engine.
 *
 * Unlike the statevector engine, which tracks a pure state |ψ⟩, this engine
 * evolves the full density matrix ρ (a 2ⁿ×2ⁿ complex matrix). That lets it model
 * *mixed* states produced by noise:
 *
 *   - unitary gates act as   ρ → U ρ U†
 *   - noise channels act as  ρ → Σ_i K_i ρ K_i†   (Kraus operators)
 *
 * Memory scales as 4ⁿ, so it is intended for small, noise-focused circuits
 * (default cap: 10 qubits). ρ is stored as two Float64Arrays (real/imag),
 * row-major with index = row·dim + col.
 */

import { Circuit } from '../../../circuit-engine/circuit';
import { ChannelParams, NoiseChannelType, Op2, krausOperators } from './kraus';

/** One noise channel to apply after every gate touches a qubit. */
export interface NoiseSpec {
  type: NoiseChannelType;
  params: ChannelParams;
}

export interface DensityMatrixOptions {
  /** Channels applied to each qubit a gate acts on, after that gate. */
  noise?: NoiseSpec[];
  /** Measurement shots to sample from the final distribution. */
  shots?: number;
  /** Seed for reproducible sampling. */
  seed?: number;
  /** Also compute fidelity against the noiseless pure state. */
  computeFidelity?: boolean;
}

export interface DensityMatrixResult {
  numQubits: number;
  /** Diagonal of ρ: P(measuring each basis state). */
  probabilities: Record<string, number>;
  /** Sampled measurement counts. */
  counts: Record<string, number>;
  /** Tr(ρ²) ∈ [1/2ⁿ, 1]; 1 means a pure state, lower means more mixed. */
  purity: number;
  /** ⟨ψ_ideal| ρ |ψ_ideal⟩, if requested. */
  fidelity?: number;
  executionTimeMs: number;
}

/** Dense 2ⁿ×2ⁿ complex matrix as parallel real/imag arrays (row-major). */
interface Dense {
  dim: number;
  re: Float64Array;
  im: Float64Array;
}

/** Deterministic PRNG (mulberry32) for reproducible sampling. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DensityMatrixEngine {
  readonly name = 'density-matrix';
  readonly maxQubits: number;

  constructor(maxQubits = 10) {
    this.maxQubits = maxQubits;
  }

  simulate(circuit: Circuit, options: DensityMatrixOptions = {}): DensityMatrixResult {
    const start = performance.now();
    const n = circuit.getMetadata().qubitCount;
    if (n > this.maxQubits) {
      throw new Error(`density-matrix engine supports up to ${this.maxQubits} qubits (got ${n})`);
    }
    const dim = 1 << n;
    const noise = options.noise ?? [];

    // ρ = |0…0⟩⟨0…0|
    const rho: Dense = { dim, re: new Float64Array(dim * dim), im: new Float64Array(dim * dim) };
    rho.re[0] = 1;

    // Optional noiseless pure state, evolved in parallel for fidelity.
    const psi = options.computeFidelity
      ? { re: new Float64Array(dim), im: new Float64Array(dim) }
      : null;
    if (psi) psi.re[0] = 1;

    for (const op of circuit.operations) {
      const type = op.gate.type;
      if (type === 'measure' || type === 'barrier') continue;

      const { matRe, matIm, d } = gateMatrix(op.gate.matrix, op.targets.length);
      const controls = op.controls ?? [];

      applyUnitaryToDensity(rho, matRe, matIm, d, op.targets, controls);
      if (psi) applyUnitaryToVector(psi.re, psi.im, dim, matRe, matIm, d, op.targets, controls);

      // Gate noise: apply each configured channel to every qubit the gate touched.
      if (noise.length > 0) {
        const touched = [...op.targets, ...controls];
        for (const q of touched) {
          for (const channel of noise) {
            applyChannel(rho, krausOperators(channel.type, channel.params), q);
          }
        }
      }
    }

    const probabilities = readProbabilities(rho, n);
    const purity = tracePurity(rho);
    const shots = options.shots && options.shots > 0 ? options.shots : 1000;
    const counts = sample(probabilities, shots, options.seed);
    const fidelity = psi ? computeFidelity(rho, psi.re, psi.im) : undefined;

    return {
      numQubits: n,
      probabilities,
      counts,
      purity,
      fidelity,
      executionTimeMs: performance.now() - start,
    };
  }
}

/** Extract a gate's matrix into flat real/imag arrays of size d×d (d = 2^k). */
function gateMatrix(
  matrix: { get(r: number, c: number): { re: number; im: number } },
  targetCount: number,
): { matRe: Float64Array; matIm: Float64Array; d: number } {
  const d = 1 << targetCount;
  const matRe = new Float64Array(d * d);
  const matIm = new Float64Array(d * d);
  for (let r = 0; r < d; r++) {
    for (let c = 0; c < d; c++) {
      const e = matrix.get(r, c);
      matRe[r * d + c] = e.re;
      matIm[r * d + c] = e.im;
    }
  }
  return { matRe, matIm, d };
}

/**
 * Apply a d×d matrix to a state vector: v → M v, restricted to `targets` and
 * conditioned on all `controls` being |1⟩. Used both for gates (unitary) and,
 * via the density routines, for Kraus operators.
 */
function applyUnitaryToVector(
  re: Float64Array,
  im: Float64Array,
  dim: number,
  matRe: Float64Array,
  matIm: Float64Array,
  d: number,
  targets: number[],
  controls: number[],
): void {
  const k = targets.length;
  const outRe = Float64Array.from(re);
  const outIm = Float64Array.from(im);

  for (let base = 0; base < dim; base++) {
    // All controls set?
    let ok = true;
    for (const c of controls) {
      if (((base >> c) & 1) === 0) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    // Only process each target-group once, at its base (all target bits 0).
    let isBase = true;
    for (const t of targets) {
      if (((base >> t) & 1) !== 0) {
        isBase = false;
        break;
      }
    }
    if (!isBase) continue;

    // Gather the d basis indices of this group.
    const idx = new Array<number>(d);
    for (let m = 0; m < d; m++) {
      let j = base;
      for (let b = 0; b < k; b++) {
        if ((m >> b) & 1) j |= 1 << targets[b];
      }
      idx[m] = j;
    }

    // out[idx[a]] = Σ_b M[a][b] · v[idx[b]]
    for (let a = 0; a < d; a++) {
      let sr = 0;
      let si = 0;
      for (let b = 0; b < d; b++) {
        const ur = matRe[a * d + b];
        const ui = matIm[a * d + b];
        const vr = re[idx[b]];
        const vi = im[idx[b]];
        sr += ur * vr - ui * vi;
        si += ur * vi + ui * vr;
      }
      outRe[idx[a]] = sr;
      outIm[idx[a]] = si;
    }
  }

  re.set(outRe);
  im.set(outIm);
}

/** Apply M to each column of ρ: ρ → M ρ (left multiply). */
function leftApply(
  rho: Dense,
  matRe: Float64Array,
  matIm: Float64Array,
  d: number,
  targets: number[],
  controls: number[],
): void {
  const { dim, re, im } = rho;
  const colRe = new Float64Array(dim);
  const colIm = new Float64Array(dim);
  for (let c = 0; c < dim; c++) {
    for (let r = 0; r < dim; r++) {
      colRe[r] = re[r * dim + c];
      colIm[r] = im[r * dim + c];
    }
    applyUnitaryToVector(colRe, colIm, dim, matRe, matIm, d, targets, controls);
    for (let r = 0; r < dim; r++) {
      re[r * dim + c] = colRe[r];
      im[r * dim + c] = colIm[r];
    }
  }
}

/** In-place conjugate transpose: A → A†. */
function conjTranspose(rho: Dense): void {
  const { dim, re, im } = rho;
  for (let r = 0; r < dim; r++) {
    for (let c = r; c < dim; c++) {
      const i1 = r * dim + c;
      const i2 = c * dim + r;
      const r1 = re[i1];
      const m1 = im[i1];
      re[i1] = re[i2];
      im[i1] = -im[i2];
      re[i2] = r1;
      im[i2] = -m1;
    }
  }
}

/** ρ → M ρ M†. */
function applyUnitaryToDensity(
  rho: Dense,
  matRe: Float64Array,
  matIm: Float64Array,
  d: number,
  targets: number[],
  controls: number[],
): void {
  // M ρ M† = ((M (M ρ)†)† — apply M on the left twice around a conjugate transpose.
  leftApply(rho, matRe, matIm, d, targets, controls); // ρ ← M ρ
  conjTranspose(rho); // ρ ← (M ρ)†
  leftApply(rho, matRe, matIm, d, targets, controls); // ρ ← M (M ρ)†
  conjTranspose(rho); // ρ ← (M (M ρ)†)† = M ρ M†
}

/** ρ → Σ_i K_i ρ K_i† for a single-qubit channel on qubit q. */
function applyChannel(rho: Dense, kraus: Op2[], q: number): void {
  const { dim, re, im } = rho;
  const accRe = new Float64Array(dim * dim);
  const accIm = new Float64Array(dim * dim);

  for (const k of kraus) {
    const term: Dense = { dim, re: Float64Array.from(re), im: Float64Array.from(im) };
    applyUnitaryToDensity(term, Float64Array.from(k.re), Float64Array.from(k.im), 2, [q], []);
    for (let idx = 0; idx < dim * dim; idx++) {
      accRe[idx] += term.re[idx];
      accIm[idx] += term.im[idx];
    }
  }

  re.set(accRe);
  im.set(accIm);
}

/** Read the diagonal of ρ as a probability distribution over basis states. */
function readProbabilities(rho: Dense, n: number): Record<string, number> {
  const { dim, re } = rho;
  const probs: Record<string, number> = {};
  for (let i = 0; i < dim; i++) {
    const p = re[i * dim + i];
    if (p > 1e-12) {
      probs[i.toString(2).padStart(n, '0')] = p;
    }
  }
  return probs;
}

/** Tr(ρ²) = Σ_ij |ρ_ij|² for a Hermitian ρ. */
function tracePurity(rho: Dense): number {
  const { re, im } = rho;
  let sum = 0;
  for (let i = 0; i < re.length; i++) {
    sum += re[i] * re[i] + im[i] * im[i];
  }
  return sum;
}

/** F = ⟨ψ| ρ |ψ⟩ for a pure reference state ψ. */
function computeFidelity(rho: Dense, psiRe: Float64Array, psiIm: Float64Array): number {
  const { dim, re, im } = rho;
  // ρ|ψ⟩
  const outRe = new Float64Array(dim);
  const outIm = new Float64Array(dim);
  for (let r = 0; r < dim; r++) {
    let sr = 0;
    let si = 0;
    for (let c = 0; c < dim; c++) {
      const ar = re[r * dim + c];
      const ai = im[r * dim + c];
      sr += ar * psiRe[c] - ai * psiIm[c];
      si += ar * psiIm[c] + ai * psiRe[c];
    }
    outRe[r] = sr;
    outIm[r] = si;
  }
  // ⟨ψ|(ρ|ψ⟩) — the real part (imag cancels for Hermitian ρ).
  let f = 0;
  for (let i = 0; i < dim; i++) {
    f += psiRe[i] * outRe[i] + psiIm[i] * outIm[i];
  }
  return f;
}

/** Sample `shots` measurements from a probability distribution. */
function sample(
  probabilities: Record<string, number>,
  shots: number,
  seed?: number,
): Record<string, number> {
  const states = Object.keys(probabilities);
  const cumulative: number[] = [];
  let acc = 0;
  for (const s of states) {
    acc += probabilities[s];
    cumulative.push(acc);
  }
  const total = acc || 1;
  const rand = mulberry32(seed ?? 0x9e3779b9);
  const counts: Record<string, number> = {};
  for (let i = 0; i < shots; i++) {
    const r = rand() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (r <= cumulative[mid]) hi = mid;
      else lo = mid + 1;
    }
    const state = states[lo];
    counts[state] = (counts[state] ?? 0) + 1;
  }
  return counts;
}
