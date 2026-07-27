import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * HHL Algorithm (Harrow-Hassidim-Lloyd) for linear systems A x = b.
 *
 * HHL prepares a quantum state |x⟩ ∝ A⁻¹|b⟩ for a Hermitian A, in time
 * polylogarithmic in the system size (under the usual sparsity/conditioning
 * caveats) — an exponential speedup over classical solvers for the task of
 * sampling observables of the solution. It is the flagship quantum
 * linear-algebra primitive underlying quantum machine-learning proposals.
 *
 * The pipeline is:
 * 1. Prepare |b⟩ in the system register.
 * 2. Quantum Phase Estimation with U = e^{iAt} writes each eigenvalue λ_j of A
 *    into a clock register (as an integer m_j = λ_j when t = 2π/2^{n_clock}).
 * 3. An ancilla rotation R_y(2·arcsin(C/m)) conditioned on the clock value m
 *    puts amplitude ∝ 1/λ_j on the |1⟩ ancilla branch (the "eigenvalue
 *    inversion").
 * 4. Inverse QPE uncomputes the clock.
 * 5. Post-selecting the ancilla on |1⟩ leaves |x⟩ ∝ A⁻¹|b⟩ in the system.
 *
 * This is a faithful, fully-gate-based implementation for the canonical 2×2
 * Hermitian family A = a·I + b·X (eigenvalues a±b in the |±⟩ basis, chosen
 * positive integers so the phase estimation is exact). The right-hand side |b⟩
 * is an arbitrary real single-qubit vector. Controlled-e^{iAt} is compiled from
 * a controlled phase (the a·I part) and a controlled-R_x (the b·X part); the
 * clock-conditioned ancilla rotation uses a scratch qubit to AND the clock bits.
 *
 * References:
 * - Harrow, Hassidim & Lloyd, "Quantum Algorithm for Linear Systems of
 *   Equations", Phys. Rev. Lett. 103, 150502 (2009)
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 5.2 (QPE)
 */
export class HHL implements IQuantumAlgorithm {
  readonly name = 'HHL Algorithm';
  readonly description = 'Solves a Hermitian linear system A x = b, preparing |x⟩ ∝ A⁻¹|b⟩';
  readonly category = 'fundamental' as const;
  readonly references = [
    'Harrow, Hassidim & Lloyd, "Quantum Algorithm for Linear Systems of Equations", PRL 103, 150502 (2009)',
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 5.2',
  ];

  // Canonical well-conditioned instance: A = a·I + b·X, eigenvalues a±b = 2, 1.
  private readonly a = 1.5;
  private readonly b = 0.5;
  private readonly nClock = 2; // 2^2 = 4 > max eigenvalue (2); exact QPE.

  // Qubit layout.
  private readonly sys = 0;
  private readonly clockBase = 1;
  private get ancilla(): number {
    return this.clockBase + this.nClock;
  }
  private get work(): number {
    return this.ancilla + 1;
  }
  private get totalQubits(): number {
    return this.work + 1;
  }

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build the HHL circuit solving A x = b for the right-hand side (b0, b1).
   *
   * @param b0 Amplitude of |0⟩ in the (normalised) right-hand side
   * @param b1 Amplitude of |1⟩ in the (normalised) right-hand side
   */
  buildCircuit(b0: number, b1: number): Circuit {
    const norm = Math.hypot(b0, b1);
    if (norm === 0) {
      throw new Error('Right-hand side b must be non-zero');
    }
    const phi = Math.atan2(b1 / norm, b0 / norm);
    const t = (2 * Math.PI) / Math.pow(2, this.nClock);

    let builder = Circuit.builder(this.totalQubits);

    // 1. Prepare |b⟩ on the system qubit.
    builder = builder.ry(this.sys, 2 * phi);

    // 2. QPE: eigenvalues → clock.
    builder = this.applyQPE(builder, t);

    // 3. Eigenvalue inversion: ancilla rotation conditioned on the clock value.
    for (let m = 1; m < Math.pow(2, this.nClock); m++) {
      builder = this.applyReciprocalRotation(builder, m);
    }

    // 4. Inverse QPE: uncompute the clock.
    builder = this.applyInverseQPE(builder, t);

    return builder.build();
  }

  /** QPE = H^⊗clock · controlled-e^{iAt·2^j} · inverse-QFT(clock). */
  private applyQPE(builder: CircuitBuilder, t: number): CircuitBuilder {
    for (let j = 0; j < this.nClock; j++) {
      builder = builder.h(this.clockBase + j);
    }
    for (let j = 0; j < this.nClock; j++) {
      builder = this.controlledEvolution(builder, this.clockBase + j, t * Math.pow(2, j), false);
    }
    builder = this.applyInverseQFT(builder);
    return builder;
  }

  /** Inverse QPE = QFT(clock) · controlled-e^{-iAt·2^j} · H^⊗clock. */
  private applyInverseQPE(builder: CircuitBuilder, t: number): CircuitBuilder {
    builder = this.applyQFT(builder);
    for (let j = 0; j < this.nClock; j++) {
      builder = this.controlledEvolution(builder, this.clockBase + j, t * Math.pow(2, j), true);
    }
    for (let j = 0; j < this.nClock; j++) {
      builder = builder.h(this.clockBase + j);
    }
    return builder;
  }

  /**
   * Controlled-e^{iA·τ} on the system, with A = a·I + b·X:
   * a controlled phase for the a·I part and a controlled-R_x for the b·X part.
   * `inverse` negates τ.
   */
  private controlledEvolution(
    builder: CircuitBuilder,
    control: number,
    tau: number,
    inverse: boolean,
  ): CircuitBuilder {
    const sign = inverse ? -1 : 1;
    // a·I part: controlled global phase e^{i a τ} ⇒ phase on the control qubit.
    builder = builder.p(control, sign * this.a * tau);
    // b·X part: controlled e^{i b τ X} = controlled R_x(−2bτ) = H · CRZ · H.
    const alpha = sign * -2 * this.b * tau;
    builder = builder.h(this.sys);
    builder = this.controlledRZ(builder, control, this.sys, alpha);
    builder = builder.h(this.sys);
    return builder;
  }

  /** Controlled-R_z(α): e^{-iαZ/2} on target when control is |1⟩. */
  private controlledRZ(
    builder: CircuitBuilder,
    control: number,
    target: number,
    alpha: number,
  ): CircuitBuilder {
    builder = builder.rz(target, alpha / 2);
    builder = builder.cx(control, target);
    builder = builder.rz(target, -alpha / 2);
    builder = builder.cx(control, target);
    return builder;
  }

  /**
   * Rotate the ancilla by R_y(2·arcsin(C/m)) conditioned on the clock register
   * equalling m. C = 1 (the smallest eigenvalue), so the |1⟩-ancilla amplitude
   * becomes ∝ 1/m ∝ 1/λ — the eigenvalue inversion.
   */
  private applyReciprocalRotation(builder: CircuitBuilder, m: number): CircuitBuilder {
    const theta = 2 * Math.asin(Math.min(1, 1 / m));

    // Mask clock bits that are 0 in m so the AND fires exactly on |m⟩.
    for (let i = 0; i < this.nClock; i++) {
      if (((m >> i) & 1) === 0) {
        builder = builder.x(this.clockBase + i);
      }
    }

    const controls = Array.from({ length: this.nClock }, (_, i) => this.clockBase + i);
    builder = builder.mcx(controls, this.work); // work = 1 iff clock == m
    builder = this.controlledRY(builder, this.work, this.ancilla, theta);
    builder = builder.mcx(controls, this.work); // uncompute the AND

    for (let i = 0; i < this.nClock; i++) {
      if (((m >> i) & 1) === 0) {
        builder = builder.x(this.clockBase + i);
      }
    }
    return builder;
  }

  /** Controlled-R_y(θ): R_y(θ) on target when control is |1⟩. */
  private controlledRY(
    builder: CircuitBuilder,
    control: number,
    target: number,
    theta: number,
  ): CircuitBuilder {
    builder = builder.ry(target, theta / 2);
    builder = builder.cx(control, target);
    builder = builder.ry(target, -theta / 2);
    builder = builder.cx(control, target);
    return builder;
  }

  /** Forward QFT over the clock register (LSB = clockBase). */
  private applyQFT(builder: CircuitBuilder): CircuitBuilder {
    const n = this.nClock;
    for (let j = n - 1; j >= 0; j--) {
      builder = builder.h(this.clockBase + j);
      for (let k = 0; k < j; k++) {
        const angle = (2 * Math.PI) / Math.pow(2, j - k + 1);
        builder = builder.cp(this.clockBase + k, this.clockBase + j, angle);
      }
    }
    for (let i = 0; i < Math.floor(n / 2); i++) {
      builder = builder.swap(this.clockBase + i, this.clockBase + n - 1 - i);
    }
    return builder;
  }

  /** Inverse QFT over the clock register (LSB = clockBase). */
  private applyInverseQFT(builder: CircuitBuilder): CircuitBuilder {
    const n = this.nClock;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      builder = builder.swap(this.clockBase + i, this.clockBase + n - 1 - i);
    }
    for (let j = 0; j < n; j++) {
      for (let k = j - 1; k >= 0; k--) {
        const angle = -(2 * Math.PI) / Math.pow(2, j - k + 1);
        builder = builder.cp(this.clockBase + k, this.clockBase + j, angle);
      }
      builder = builder.h(this.clockBase + j);
    }
    return builder;
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
        interactionDistance: n - 1,
        estimatedSwapCount: 0,
        compatibleArchitectures: ['full'],
      },
      complexity: 'O(log N · s² · κ² / ε) for s-sparse, κ-conditioned A',
      classicalCost: 'Classical conjugate gradient: O(N · s · κ)',
    };
  }

  /** Classical reference solution x = A⁻¹ b for A = a·I + b·X, normalised. */
  private classicalSolution(b0: number, b1: number): [number, number] {
    const det = this.a * this.a - this.b * this.b;
    // A⁻¹ = (a·I − b·X)/det.
    const x0 = (this.a * b0 - this.b * b1) / det;
    const x1 = (this.a * b1 - this.b * b0) / det;
    const norm = Math.hypot(x0, x1);
    return [x0 / norm, x1 / norm];
  }

  /**
   * Execute HHL and report the prepared solution, its fidelity with the exact
   * classical solution, and the post-selection success probability.
   */
  execute(b0 = 1, b1 = 0): AlgorithmResult {
    const circuit = this.buildCircuit(b0, b1);

    const startTime = performance.now();
    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);
    const endTime = performance.now();

    // Post-select ancilla = |1⟩. With exact QPE the clock and work registers
    // return to |0⟩, so the solution lives in sys ∈ {0,1} with ancilla bit set.
    const ancillaBit = this.ancilla;
    let successProbability = 0;
    for (const [state, amp] of result.statevector) {
      if (((Number(state) >> ancillaBit) & 1) === 1) {
        successProbability += amp.re * amp.re + amp.im * amp.im;
      }
    }

    const idx0 = 1 << ancillaBit; // sys=0, clock=0, work=0, ancilla=1
    const idx1 = idx0 | (1 << this.sys); // sys=1
    const amp0 = result.statevector.get(BigInt(idx0)) ?? { re: 0, im: 0 };
    const amp1 = result.statevector.get(BigInt(idx1)) ?? { re: 0, im: 0 };

    const solNorm = Math.sqrt(
      amp0.re * amp0.re + amp0.im * amp0.im + amp1.re * amp1.re + amp1.im * amp1.im,
    );
    const x0 = solNorm > 0 ? { re: amp0.re / solNorm, im: amp0.im / solNorm } : { re: 0, im: 0 };
    const x1 = solNorm > 0 ? { re: amp1.re / solNorm, im: amp1.im / solNorm } : { re: 0, im: 0 };

    const [c0, c1] = this.classicalSolution(b0, b1);
    // Fidelity |⟨classical|hhl⟩|² (classical solution is real).
    const ipRe = c0 * x0.re + c1 * x1.re;
    const ipIm = c0 * x0.im + c1 * x1.im;
    const fidelity = ipRe * ipRe + ipIm * ipIm;

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
        successProbability,
      },
      output: {
        matrix: `${this.a}·I + ${this.b}·X`,
        rhs: [b0, b1],
        classicalSolution: [c0, c1],
        quantumSolution: [
          { re: x0.re, im: x0.im },
          { re: x1.re, im: x1.im },
        ],
        fidelity,
        successProbability,
      },
    };
  }

  /**
   * Verify HHL prepares A⁻¹b (fidelity ≈ 1) for several right-hand sides.
   */
  verify(): { property: string; passed: boolean; value: number }[] {
    const cases: [number, number][] = [
      [1, 0], // |0⟩
      [0, 1], // |1⟩
      [1, 1], // |+⟩
      [1, -1], // |−⟩ (an eigenvector)
    ];
    return cases.map(([b0, b1]) => {
      const out = this.execute(b0, b1).output as { fidelity: number };
      return {
        property: `A⁻¹b fidelity for b=(${b0}, ${b1})`,
        passed: out.fidelity > 0.99,
        value: out.fidelity,
      };
    });
  }
}
