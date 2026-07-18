/**
 * Kraus operators for single-qubit noise channels.
 *
 * A quantum channel acts on a density matrix as ρ → Σ_i K_i ρ K_i†, where the
 * Kraus operators satisfy the completeness relation Σ_i K_i† K_i = I. Each
 * operator here is a 2×2 complex matrix, returned as a flat `[re, im]` pair of
 * 4-element arrays in row-major order (m00, m01, m10, m11) for fast application.
 */

export type NoiseChannelType =
  | 'depolarizing'
  | 'amplitude_damping'
  | 'phase_damping'
  | 'bit_flip'
  | 'phase_flip'
  | 'bit_phase_flip';

/** A 2×2 operator: real and imaginary parts, row-major (m00, m01, m10, m11). */
export interface Op2 {
  re: [number, number, number, number];
  im: [number, number, number, number];
}

/** Parameters accepted for a channel (only the relevant one is used). */
export interface ChannelParams {
  /** Probability, for depolarizing / bit-flip / phase-flip / bit-phase-flip. */
  p?: number;
  /** Amplitude-damping rate. */
  gamma?: number;
  /** Phase-damping rate. */
  lambda?: number;
}

const I: Op2 = { re: [1, 0, 0, 1], im: [0, 0, 0, 0] };
const X: Op2 = { re: [0, 1, 1, 0], im: [0, 0, 0, 0] };
const Y: Op2 = { re: [0, 0, 0, 0], im: [0, -1, 1, 0] };
const Z: Op2 = { re: [1, 0, 0, -1], im: [0, 0, 0, 0] };

function scaled(op: Op2, s: number): Op2 {
  return {
    re: [op.re[0] * s, op.re[1] * s, op.re[2] * s, op.re[3] * s],
    im: [op.im[0] * s, op.im[1] * s, op.im[2] * s, op.im[3] * s],
  };
}

function clampProb(x: number | undefined): number {
  const v = x ?? 0;
  if (v < 0 || v > 1) {
    throw new Error(`channel parameter ${v} out of range [0, 1]`);
  }
  return v;
}

/**
 * Build the Kraus operators for a single-qubit channel of the given type.
 */
export function krausOperators(type: NoiseChannelType, params: ChannelParams): Op2[] {
  switch (type) {
    case 'depolarizing': {
      // ρ → (1 - 3p/4)ρ + (p/4)(XρX + YρY + ZρZ)  (Nielsen & Chuang convention:
      // reaches the maximally mixed state I/2 at p = 1).
      const p = clampProb(params.p);
      return [
        scaled(I, Math.sqrt(1 - (3 * p) / 4)),
        scaled(X, Math.sqrt(p / 4)),
        scaled(Y, Math.sqrt(p / 4)),
        scaled(Z, Math.sqrt(p / 4)),
      ];
    }
    case 'bit_flip': {
      const p = clampProb(params.p);
      return [scaled(I, Math.sqrt(1 - p)), scaled(X, Math.sqrt(p))];
    }
    case 'phase_flip': {
      const p = clampProb(params.p);
      return [scaled(I, Math.sqrt(1 - p)), scaled(Z, Math.sqrt(p))];
    }
    case 'bit_phase_flip': {
      const p = clampProb(params.p);
      return [scaled(I, Math.sqrt(1 - p)), scaled(Y, Math.sqrt(p))];
    }
    case 'amplitude_damping': {
      // Relaxation |1> → |0> with probability gamma (T1 process).
      const g = clampProb(params.gamma);
      const k0: Op2 = { re: [1, 0, 0, Math.sqrt(1 - g)], im: [0, 0, 0, 0] };
      const k1: Op2 = { re: [0, Math.sqrt(g), 0, 0], im: [0, 0, 0, 0] };
      return [k0, k1];
    }
    case 'phase_damping': {
      // Loss of phase coherence without energy loss (T2 process).
      const l = clampProb(params.lambda);
      const k0: Op2 = { re: [1, 0, 0, Math.sqrt(1 - l)], im: [0, 0, 0, 0] };
      const k1: Op2 = { re: [0, 0, 0, Math.sqrt(l)], im: [0, 0, 0, 0] };
      return [k0, k1];
    }
    default:
      throw new Error(`Unknown noise channel "${type as string}"`);
  }
}
