import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { PauliTerm } from './vqe';

/**
 * Hamiltonian Simulation via Trotter-Suzuki decomposition.
 *
 * Approximates the time-evolution operator e^{-iHt} for a Hamiltonian written
 * as a sum of weighted Pauli strings, H = Σ_j h_j P_j. Since the P_j generally
 * do not commute, the evolution is split into r small steps and each step
 * approximated by a product of single-term exponentials (Lie-Trotter product
 * formula):
 *
 *   first order:  e^{-iHt} ≈ ( ∏_j e^{-i h_j P_j t/r} )^r          error O(t²/r)
 *   second order: e^{-iHt} ≈ ( ∏_j e^{-i h_j P_j t/2r} ∏_j' … )^r   error O(t³/r²)
 *
 * Each Pauli-string exponential e^{-iθP} is compiled with the textbook recipe:
 * rotate every non-identity factor into the Z basis (H for X, R_x(π/2) for Y),
 * a CNOT ladder to accumulate the parity onto one qubit, an R_z(2θ) there, then
 * uncompute. This is the primitive behind digital quantum simulation of
 * chemistry and materials.
 *
 * References:
 * - Lloyd, "Universal Quantum Simulators", Science 273, 1073 (1996)
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 4.7
 */
export class HamiltonianSimulation implements IQuantumAlgorithm {
  readonly name = 'Hamiltonian Simulation';
  readonly description = 'Trotterized time evolution e^{-iHt} of a Pauli-sum Hamiltonian';
  readonly category = 'fundamental' as const;
  readonly references = [
    'Lloyd, "Universal Quantum Simulators", Science 273, 1073 (1996)',
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 4.7',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build the Trotterized evolution circuit for e^{-iHt}.
   *
   * @param n Number of qubits
   * @param terms The Hamiltonian as weighted Pauli strings
   * @param time Total evolution time t
   * @param steps Number of Trotter steps r
   * @param order Trotter order (1 = Lie-Trotter, 2 = symmetric Suzuki)
   * @param initialOnes Qubits to flip to |1⟩ before evolving (default: |0…0⟩)
   */
  buildCircuit(
    n: number,
    terms: PauliTerm[],
    time: number,
    steps = 1,
    order: 1 | 2 = 1,
    initialOnes: number[] = [],
  ): Circuit {
    if (n <= 0) {
      throw new Error('Number of qubits must be positive');
    }
    if (steps <= 0) {
      throw new Error('Number of Trotter steps must be positive');
    }
    this.validateTerms(n, terms);

    let builder = Circuit.builder(n);

    // Prepare the initial state.
    for (const q of initialOnes) {
      builder = builder.x(q);
    }

    const dt = time / steps;
    for (let s = 0; s < steps; s++) {
      if (order === 2) {
        // Symmetric: half-step forward then the reverse order half-step.
        for (let j = 0; j < terms.length; j++) {
          builder = this.applyPauliExponential(builder, terms[j], (terms[j].coefficient * dt) / 2);
        }
        for (let j = terms.length - 1; j >= 0; j--) {
          builder = this.applyPauliExponential(builder, terms[j], (terms[j].coefficient * dt) / 2);
        }
      } else {
        for (let j = 0; j < terms.length; j++) {
          builder = this.applyPauliExponential(builder, terms[j], terms[j].coefficient * dt);
        }
      }
    }

    return builder.build();
  }

  private validateTerms(n: number, terms: PauliTerm[]): void {
    for (const term of terms) {
      if (term.paulis.length !== term.qubits.length) {
        throw new Error('Each Pauli term needs matching paulis and qubits arrays');
      }
      for (const q of term.qubits) {
        if (q < 0 || q >= n) {
          throw new Error(`Qubit ${q} out of range for ${n} qubits`);
        }
      }
    }
  }

  /**
   * Apply e^{-iθP} for a single Pauli string P (θ folds in the coefficient·dt).
   * Uses R_z(2θ) because e^{-iθZ} = R_z(2θ).
   */
  private applyPauliExponential(
    builder: CircuitBuilder,
    term: PauliTerm,
    theta: number,
  ): CircuitBuilder {
    // Collect the non-identity factors and their qubits.
    const active: { qubit: number; pauli: 'X' | 'Y' | 'Z' }[] = [];
    for (let i = 0; i < term.paulis.length; i++) {
      const p = term.paulis[i];
      if (p !== 'I') {
        active.push({ qubit: term.qubits[i], pauli: p });
      }
    }
    if (active.length === 0) {
      return builder; // Identity term ⇒ global phase, ignore.
    }

    // Basis change into Z.
    for (const { qubit, pauli } of active) {
      if (pauli === 'X') {
        builder = builder.h(qubit);
      } else if (pauli === 'Y') {
        builder = builder.rx(qubit, Math.PI / 2);
      }
    }

    // CNOT ladder accumulating parity onto the last active qubit.
    const chain = active.map((a) => a.qubit);
    for (let i = 0; i < chain.length - 1; i++) {
      builder = builder.cx(chain[i], chain[i + 1]);
    }

    // Core rotation.
    builder = builder.rz(chain[chain.length - 1], 2 * theta);

    // Uncompute the ladder.
    for (let i = chain.length - 2; i >= 0; i--) {
      builder = builder.cx(chain[i], chain[i + 1]);
    }

    // Undo the basis change.
    for (const { qubit, pauli } of active) {
      if (pauli === 'X') {
        builder = builder.h(qubit);
      } else if (pauli === 'Y') {
        builder = builder.rx(qubit, -Math.PI / 2);
      }
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
        compatibleArchitectures: ['full', 'linear'],
      },
      complexity: 'O(r · L) gates for r Trotter steps and L Pauli terms',
      classicalCost: 'Classical evolution of an n-qubit state is exponential in n',
    };
  }

  /**
   * Execute the Trotterized evolution and report the resulting state.
   *
   * @param n Number of qubits
   * @param terms Hamiltonian as weighted Pauli strings
   * @param time Total evolution time
   * @param steps Number of Trotter steps
   * @param order Trotter order (1 or 2)
   * @param initialOnes Qubits to flip to |1⟩ before evolving
   */
  execute(
    n: number,
    terms: PauliTerm[],
    time: number,
    steps = 1,
    order: 1 | 2 = 1,
    initialOnes: number[] = [],
  ): AlgorithmResult {
    const circuit = this.buildCircuit(n, terms, time, steps, order, initialOnes);

    const startTime = performance.now();
    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);
    const endTime = performance.now();

    const probabilities = Array.from(result.statevector.entries())
      .map(([state, amp]) => ({
        state: Number(state),
        probability: amp.re * amp.re + amp.im * amp.im,
      }))
      .filter((e) => e.probability > 1e-12)
      .sort((a, b) => a.state - b.state);

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
        iterations: steps,
      },
      output: {
        time,
        steps,
        order,
        termCount: terms.length,
        probabilities,
      },
    };
  }

  /**
   * Exact single-qubit reference state e^{-iHt}|0⟩ for H = aX + bY + cZ, used to
   * validate the Trotter approximation. Returns the two complex amplitudes.
   */
  private exactSingleQubit(
    a: number,
    b: number,
    c: number,
    t: number,
  ): { amp0: { re: number; im: number }; amp1: { re: number; im: number } } {
    const r = Math.sqrt(a * a + b * b + c * c);
    const cos = Math.cos(r * t);
    const s = r === 0 ? 0 : Math.sin(r * t) / r;
    // |ψ⟩ = (cos − i·s·c)|0⟩ + (s·b − i·s·a)|1⟩
    return {
      amp0: { re: cos, im: -s * c },
      amp1: { re: s * b, im: -s * a },
    };
  }

  /**
   * Verify: single Pauli term is exact, and Trotter error for a non-commuting
   * Hamiltonian shrinks as the step count grows.
   */
  verify(): { property: string; passed: boolean; value: number }[] {
    const results: { property: string; passed: boolean; value: number }[] = [];

    // 1) H = X on one qubit ⇒ e^{-iXt}|0⟩, exact for any step count.
    const t1 = 0.7;
    const single = this.execute(1, [{ coefficient: 1, paulis: ['X'], qubits: [0] }], t1, 1)
      .output as {
      probabilities: { state: number; probability: number }[];
    };
    const p1 = single.probabilities.find((e) => e.state === 1)?.probability ?? 0;
    results.push({
      property: 'single Pauli term exact: P(|1⟩)=sin²(t)',
      passed: Math.abs(p1 - Math.pow(Math.sin(t1), 2)) < 1e-9,
      value: p1,
    });

    // 2) H = X + Z (non-commuting). Trotter error must decrease with steps.
    const H: PauliTerm[] = [
      { coefficient: 1, paulis: ['X'], qubits: [0] },
      { coefficient: 1, paulis: ['Z'], qubits: [0] },
    ];
    const t2 = 1.0;
    const exact = this.exactSingleQubit(1, 0, 1, t2);
    const fid = (steps: number, order: 1 | 2): number => {
      const res = this.execute(1, H, t2, steps, order);
      const sv = res.measurements;
      const a0 = sv.get(0n) ?? { re: 0, im: 0 };
      const a1 = sv.get(1n) ?? { re: 0, im: 0 };
      // |⟨exact|sim⟩|²
      const re =
        exact.amp0.re * a0.re +
        exact.amp0.im * a0.im +
        exact.amp1.re * a1.re +
        exact.amp1.im * a1.im;
      const im =
        exact.amp0.re * a0.im -
        exact.amp0.im * a0.re +
        exact.amp1.re * a1.im -
        exact.amp1.im * a1.re;
      return re * re + im * im;
    };
    const fidLow = fid(1, 1);
    const fidHigh = fid(50, 1);
    results.push({
      property: 'first-order Trotter converges with more steps',
      passed: fidHigh > fidLow && fidHigh > 0.999,
      value: fidHigh,
    });

    // 3) Second-order is more accurate than first-order at equal step count.
    const fid1 = fid(4, 1);
    const fid2 = fid(4, 2);
    results.push({
      property: 'second-order beats first-order at equal steps',
      passed: fid2 > fid1,
      value: fid2,
    });

    return results;
  }
}
