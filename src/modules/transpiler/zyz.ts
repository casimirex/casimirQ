/**
 * Single-qubit ZYZ Euler decomposition.
 *
 * Any single-qubit unitary equals, up to a global phase (which is invisible to
 * measurement), a product of three rotations:
 *
 *     U ∝ Rz(alpha) · Ry(beta) · Rz(gamma)
 *
 * Applied to a state, `Rz(gamma)` acts first, then `Ry(beta)`, then `Rz(alpha)`.
 * This is the general, correct-by-construction engine of the transpiler: every
 * single-qubit gate — H, X, Y, Z, S, T, Rx, Ry, Rz, phase, ... — decomposes to
 * `{rz, ry}` through this one routine.
 */

/** A 2×2 complex matrix, row-major: [[m00, m01], [m10, m11]]. */
export type Matrix2 = [[Complex2, Complex2], [Complex2, Complex2]];

export interface Complex2 {
  re: number;
  im: number;
}

export interface ZyzAngles {
  alpha: number;
  beta: number;
  gamma: number;
  /**
   * The discarded global phase φ, such that `U = e^{iφ}·Rz(alpha)Ry(beta)Rz(gamma)`.
   * Invisible to measurement for a plain single-qubit gate, but for a *controlled*
   * gate it becomes a real relative phase on the control, so callers that build
   * controlled-U decompositions need it.
   */
  phase: number;
}

function mag(z: Complex2): number {
  return Math.hypot(z.re, z.im);
}

function arg(z: Complex2): number {
  return Math.atan2(z.im, z.re);
}

/** Multiply a complex number by e^{i·phase}. */
function rotate(z: Complex2, phase: number): Complex2 {
  const c = Math.cos(phase);
  const s = Math.sin(phase);
  return { re: z.re * c - z.im * s, im: z.re * s + z.im * c };
}

/**
 * Compute the ZYZ Euler angles of a 2×2 unitary, discarding the global phase.
 */
export function zyzAngles(m: Matrix2): ZyzAngles {
  const [[a, b], [c, d]] = m;

  // Global phase from the determinant: reduce U to SU(2) so the angle formulas
  // are unambiguous. det = a·d − b·c.
  const detRe = a.re * d.re - a.im * d.im - (b.re * c.re - b.im * c.im);
  const detIm = a.re * d.im + a.im * d.re - (b.re * c.im + b.im * c.re);
  const halfPhase = Math.atan2(detIm, detRe) / 2;

  const a2 = rotate(a, -halfPhase);
  const c2 = rotate(c, -halfPhase);

  const beta = 2 * Math.atan2(mag(rotate(b, -halfPhase)), mag(a2));
  const argA = arg(a2);
  const argC = arg(c2);

  return {
    alpha: argC - argA,
    beta,
    gamma: -argC - argA,
    phase: halfPhase,
  };
}

/** Normalize an angle to (−π, π]; treats tiny angles as zero. */
export function normalizeAngle(theta: number): number {
  const twoPi = 2 * Math.PI;
  let t = theta % twoPi;
  if (t <= -Math.PI) t += twoPi;
  if (t > Math.PI) t -= twoPi;
  return t;
}
