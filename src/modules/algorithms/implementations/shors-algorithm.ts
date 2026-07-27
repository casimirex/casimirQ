import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Largest circuit (counting + work qubits) we will build for genuine quantum
 * order finding on the statevector simulator. 16 qubits ⇒ 65 536 amplitudes.
 */
const MAX_TOTAL_QUBITS = 16;

/**
 * Shor's Algorithm — genuine quantum period (order) finding.
 *
 * Factors an odd composite N by finding the multiplicative order r of a random
 * base a (the smallest r with a^r ≡ 1 mod N), then extracting a factor from
 * gcd(a^{r/2} ± 1, N). The order is found **quantumly** via phase estimation of
 * the modular-multiplication unitary U_a: |y⟩ → |a·y mod N⟩, whose eigenvalues
 * are e^{2πi s/r}. Running QPE on the eigenstate-superposition |1⟩ yields a
 * phase s/r, and continued fractions recover r.
 *
 * The controlled modular multiplications — the only non-trivial part — are built
 * as real gates: each U_a^{2^j} = "multiply by a^{2^j} mod N" is a permutation
 * of the computational basis, decomposed into its cycle transpositions, and
 * every transposition is compiled to a controlled multi-controlled-X gadget. So
 * the whole order-finding routine is an honest gate circuit run on the
 * statevector engine; nothing about the period is computed classically.
 *
 * Because the simulator returns the exact output distribution, the continued-
 * fraction post-processing inspects every measurement peak rather than a single
 * shot, so one circuit evaluation suffices to recover r.
 *
 * References:
 * - Shor, "Algorithms for quantum computation: discrete logarithms and factoring", FOCS 1994
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 5.3
 */
export class ShorsAlgorithm implements IQuantumAlgorithm {
  readonly name = "Shor's Algorithm";
  readonly description = 'Factors integers via genuine quantum order finding (QPE)';
  readonly category = 'cryptography' as const;
  readonly references = [
    'Shor, "Algorithms for quantum computation: discrete logarithms and factoring", FOCS 1994',
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 5.3',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /** Register sizes: m work qubits (hold 0..N-1), t = 2m counting qubits. */
  private registerSizes(N: number): { m: number; t: number } {
    const m = Math.max(1, Math.ceil(Math.log2(N)));
    return { m, t: 2 * m };
  }

  /**
   * Build the quantum order-finding circuit for base `a` modulo `N`.
   *
   * Layout: counting qubits 0..t-1 (qubit 0 = LSB), work qubits t..t+m-1.
   *
   * @param N Modulus (odd composite for a meaningful run)
   * @param a Base, coprime to N
   */
  buildCircuit(N: number, a: number): Circuit {
    if (N <= 1) {
      throw new Error('N must be greater than 1');
    }
    if (this.gcd(a, N) !== 1) {
      throw new Error('a must be coprime to N');
    }
    const { m, t } = this.registerSizes(N);
    if (t + m > MAX_TOTAL_QUBITS) {
      throw new Error(
        `N=${N} needs ${t + m} qubits for genuine quantum order finding; ` +
          `the simulator caps at ${MAX_TOTAL_QUBITS} (N up to ~21).`,
      );
    }

    const workBase = t;
    let builder = Circuit.builder(t + m);

    // Work register initialised to |1⟩ (a superposition of all r eigenstates).
    builder = builder.x(workBase);

    // Counting register into uniform superposition.
    for (let j = 0; j < t; j++) {
      builder = builder.h(j);
    }

    // Controlled-U_a^{2^j}: multiply by c_j = a^{2^j} mod N, controlled on qubit j.
    let c = a % N;
    for (let j = 0; j < t; j++) {
      builder = this.controlledModularMultiply(builder, j, workBase, m, c, N);
      c = (c * c) % N;
    }

    // Inverse QFT on the counting register maps the phase into a readable integer.
    builder = this.applyInverseQFT(builder, 0, t);

    return builder.build();
  }

  /**
   * Apply controlled "multiply by c mod N" on the m-qubit work register,
   * controlled by `control`. The map y → c·y mod N (identity for y ≥ N) is a
   * basis permutation; we realise it as its cycle transpositions.
   */
  private controlledModularMultiply(
    builder: CircuitBuilder,
    control: number,
    workBase: number,
    m: number,
    c: number,
    N: number,
  ): CircuitBuilder {
    for (const [u, v] of this.modularMultiplyTranspositions(c, N, m)) {
      builder = this.controlledTransposition(builder, control, workBase, m, u, v);
    }
    return builder;
  }

  /**
   * Decompose the permutation y → c·y mod N (identity for y ≥ N) on m qubits
   * into transpositions via its cycle structure.
   */
  private modularMultiplyTranspositions(c: number, N: number, m: number): [number, number][] {
    const size = 1 << m;
    const perm = new Array<number>(size);
    for (let y = 0; y < size; y++) {
      perm[y] = y < N ? (c * y) % N : y;
    }

    const visited = new Array<boolean>(size).fill(false);
    const transpositions: [number, number][] = [];
    for (let start = 0; start < size; start++) {
      if (visited[start] || perm[start] === start) {
        visited[start] = true;
        continue;
      }
      const cycle: number[] = [];
      let x = start;
      while (!visited[x]) {
        visited[x] = true;
        cycle.push(x);
        x = perm[x];
      }
      // (x0 x1 … xk): emit (x0 x1),(x0 x2),…,(x0 xk); applied in circuit order
      // this composes to the cycle.
      for (let i = 1; i < cycle.length; i++) {
        transpositions.push([cycle[0], cycle[i]]);
      }
    }
    return transpositions;
  }

  /**
   * Controlled transposition |u⟩ ↔ |v⟩ on the work register.
   *
   * Conjugate by CNOTs so the pair differs only in a single bit t, then flip t
   * for exactly that pair with a multi-controlled-X that also takes `control` as
   * a control. The conjugation and X-masking are self-inverse and applied
   * unconditionally, so when `control` = 0 the whole gadget is the identity.
   */
  private controlledTransposition(
    builder: CircuitBuilder,
    control: number,
    workBase: number,
    m: number,
    u: number,
    v: number,
  ): CircuitBuilder {
    const w = u ^ v;
    // Pivot: lowest differing bit.
    let tbit = 0;
    while (((w >> tbit) & 1) === 0) {
      tbit++;
    }
    // Partner whose pivot bit is 0 supplies the control pattern on the other bits.
    const z = ((u >> tbit) & 1) === 0 ? u : v;

    // C: fan the pivot onto the other differing bits.
    for (let i = 0; i < m; i++) {
      if (i !== tbit && ((w >> i) & 1) === 1) {
        builder = builder.cx(workBase + tbit, workBase + i);
      }
    }

    // Central controlled multi-controlled-X isolating the pair (bits ≠ pivot).
    const controls: number[] = [control];
    for (let i = 0; i < m; i++) {
      if (i !== tbit) {
        if (((z >> i) & 1) === 0) {
          builder = builder.x(workBase + i);
        }
        controls.push(workBase + i);
      }
    }
    builder = builder.mcx(controls, workBase + tbit);
    for (let i = 0; i < m; i++) {
      if (i !== tbit && ((z >> i) & 1) === 0) {
        builder = builder.x(workBase + i);
      }
    }

    // Undo C.
    for (let i = 0; i < m; i++) {
      if (i !== tbit && ((w >> i) & 1) === 1) {
        builder = builder.cx(workBase + tbit, workBase + i);
      }
    }
    return builder;
  }

  /** Inverse QFT over counting qubits [base, base+n), LSB = base. */
  private applyInverseQFT(builder: CircuitBuilder, base: number, n: number): CircuitBuilder {
    for (let i = 0; i < Math.floor(n / 2); i++) {
      builder = builder.swap(base + i, base + n - 1 - i);
    }
    for (let j = 0; j < n; j++) {
      for (let k = j - 1; k >= 0; k--) {
        const angle = -(2 * Math.PI) / Math.pow(2, j - k + 1);
        builder = builder.cp(base + k, base + j, angle);
      }
      builder = builder.h(base + j);
    }
    return builder;
  }

  /**
   * Quantum order finding: run QPE and recover r from the phase distribution.
   * Returns the multiplicative order of `a` mod `N`, or -1 if not found.
   */
  quantumOrder(N: number, a: number): number {
    const { t } = this.registerSizes(N);
    const circuit = this.buildCircuit(N, a);
    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);

    // Marginalise over the counting register.
    const countMask = (1 << t) - 1;
    const probByPhase = new Map<number, number>();
    for (const [state, amp] of result.statevector) {
      const y = Number(state) & countMask;
      const p = amp.re * amp.re + amp.im * amp.im;
      probByPhase.set(y, (probByPhase.get(y) ?? 0) + p);
    }

    const Q = 1 << t;
    const candidates = new Set<number>();
    for (const [y, p] of probByPhase) {
      if (p < 1e-6 || y === 0) {
        continue;
      }
      for (const q of this.convergentDenominators(y, Q, N)) {
        if (q > 1 && this.modPow(a, q, N) === 1) {
          candidates.add(q);
        }
      }
    }
    if (candidates.size === 0) {
      return -1;
    }
    // The smallest q with a^q ≡ 1 is exactly the order.
    return Math.min(...candidates);
  }

  /** Denominators of the continued-fraction convergents of num/den (≤ maxDen). */
  private convergentDenominators(num: number, den: number, maxDen: number): number[] {
    const terms: number[] = [];
    let x = num;
    let y = den;
    while (y !== 0 && terms.length < 64) {
      const ai = Math.floor(x / y);
      terms.push(ai);
      [x, y] = [y, x - ai * y];
    }
    // Convergent denominators via k_n = a_n·k_{n-1} + k_{n-2}, k_{-1}=0, k_{-2}=1.
    const denoms: number[] = [];
    let qPrev = 0;
    let qPrev2 = 1;
    for (const ai of terms) {
      const q = ai * qPrev + qPrev2;
      if (q > maxDen) {
        break;
      }
      denoms.push(q);
      qPrev2 = qPrev;
      qPrev = q;
    }
    return denoms;
  }

  /**
   * Factor N using Shor's algorithm with genuine quantum order finding.
   * Iterates bases deterministically for reproducibility.
   */
  factor(N: number): { factors: number[]; period: number; attempts: number; base?: number } {
    if (N <= 1 || this.isPrime(N)) {
      return { factors: [N], period: -1, attempts: 0 };
    }
    if (N % 2 === 0) {
      return { factors: [2, N / 2], period: -1, attempts: 0 };
    }

    let attempts = 0;
    for (let a = 2; a < N; a++) {
      attempts++;

      const g = this.gcd(a, N);
      if (g > 1) {
        // Lucky guess: a shares a factor with N (classical GCD step of Shor).
        return { factors: [g, N / g].sort((x, y) => x - y), period: -1, attempts, base: a };
      }

      const r = this.quantumOrder(N, a);
      if (r <= 0 || r % 2 !== 0) {
        continue;
      }

      const x = this.modPow(a, r / 2, N);
      if (x === N - 1) {
        continue; // a^{r/2} ≡ -1 ⇒ trivial factors.
      }
      const f1 = this.gcd(x + 1, N);
      const f2 = this.gcd(x - 1, N);
      for (const f of [f1, f2]) {
        if (f > 1 && f < N) {
          return { factors: [f, N / f].sort((p, q) => p - q), period: r, attempts, base: a };
        }
      }
    }
    return { factors: [], period: -1, attempts };
  }

  /** Modular exponentiation a^b mod m. */
  private modPow(a: number, b: number, m: number): number {
    let result = 1;
    a = a % m;
    while (b > 0) {
      if (b % 2 === 1) {
        result = (result * a) % m;
      }
      b = Math.floor(b / 2);
      a = (a * a) % m;
    }
    return result;
  }

  /** Greatest common divisor. */
  private gcd(a: number, b: number): number {
    while (b !== 0) {
      [a, b] = [b, a % b];
    }
    return a;
  }

  /** Primality test (trial division). */
  private isPrime(n: number): boolean {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis {
    const n = circuit.getMetadata().qubitCount;
    return {
      qubitCount: n,
      gateCount: circuit.getMetadata().gateCount ?? 0,
      gateCounts: {},
      depth: 0,
      operationCount: circuit.getMetadata().gateCount ?? 0,
      tCount: 0,
      multiQubitGateCount: 0,
      topology: {
        interactionDistance: n,
        estimatedSwapCount: 0,
        compatibleArchitectures: ['full'],
      },
      complexity: 'O(n³) gates — polynomial in the input size',
      classicalCost: 'Exponential: best classical is sub-exponential (GNFS)',
    };
  }

  /**
   * Execute Shor's algorithm on N.
   */
  execute(N: number): AlgorithmResult {
    const startTime = performance.now();
    const result = this.factor(N);
    const endTime = performance.now();

    return {
      measurements: new Map(),
      metrics: {
        executionTimeMs: endTime - startTime,
        iterations: result.attempts,
      },
      output: result,
    };
  }

  /**
   * Verify factoring on the instances that fit the simulator's qubit budget.
   */
  verify(): { test: number; expected: number[]; actual: number[]; passed: boolean }[] {
    const testCases = [
      { N: 15, expected: [3, 5] },
      { N: 21, expected: [3, 7] },
    ];
    return testCases.map((tc) => {
      const result = this.factor(tc.N);
      const actual = [...result.factors].sort((a, b) => a - b);
      const expected = [...tc.expected].sort((a, b) => a - b);
      return {
        test: tc.N,
        expected,
        actual,
        passed: actual.length === expected.length && actual.every((v, i) => v === expected[i]),
      };
    });
  }
}
