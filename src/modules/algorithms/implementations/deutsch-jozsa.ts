import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Oracle specification for Deutsch-Jozsa.
 *
 * A `constant` oracle computes f(x) = value for all x. A `balanced` oracle
 * computes f(x) = (mask · x) mod 2 — the parity of the bits of x selected by
 * `mask`. Any non-zero mask yields a balanced function (exactly half the inputs
 * map to 0, half to 1).
 */
export type DeutschJozsaOracle =
  | { readonly kind: 'constant'; readonly value: 0 | 1 }
  | { readonly kind: 'balanced'; readonly mask: number };

/**
 * Deutsch-Jozsa Algorithm.
 *
 * Given a promise that f: {0,1}^n → {0,1} is either constant (same output for
 * every input) or balanced (0 for exactly half the inputs, 1 for the other
 * half), Deutsch-Jozsa decides which with a **single** oracle query — the first
 * demonstration of exponential quantum speedup for a (promise) decision problem.
 * Classically, distinguishing the two cases with certainty needs 2^{n-1}+1
 * queries in the worst case.
 *
 * Circuit (n input qubits + 1 output ancilla):
 * 1. Prepare the ancilla in |−⟩ (X then H) so the oracle acts by phase kickback.
 * 2. Hadamard the input register into a uniform superposition.
 * 3. Apply U_f. With the ancilla in |−⟩ this stamps a phase (−1)^{f(x)} on |x⟩.
 * 4. Hadamard the input register again.
 * 5. Measure the input register: all-zeros ⇒ constant, anything else ⇒ balanced.
 *
 * References:
 * - Deutsch & Jozsa, "Rapid solution of problems by quantum computation",
 *   Proc. R. Soc. Lond. A 439, 553 (1992)
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 1.4.4
 */
export class DeutschJozsa implements IQuantumAlgorithm {
  readonly name = 'Deutsch-Jozsa';
  readonly description =
    'Decides whether a boolean oracle is constant or balanced with a single query';
  readonly category = 'fundamental' as const;
  readonly references = [
    'Deutsch & Jozsa, "Rapid solution of problems by quantum computation", Proc. R. Soc. Lond. A 439, 553 (1992)',
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 1.4.4',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build the Deutsch-Jozsa circuit.
   *
   * @param n Number of input qubits (the ancilla is qubit index `n`)
   * @param oracle The (hidden) oracle to interrogate
   */
  buildCircuit(n: number, oracle: DeutschJozsaOracle): Circuit {
    if (n <= 0) {
      throw new Error('Number of input qubits must be positive');
    }
    if (oracle.kind === 'balanced') {
      if (oracle.mask <= 0 || oracle.mask >= Math.pow(2, n)) {
        throw new Error('Balanced oracle mask must be in [1, 2^n - 1]');
      }
    }

    const ancilla = n;
    let builder = Circuit.builder(n + 1);

    // Ancilla into |−⟩ for phase kickback.
    builder = builder.x(ancilla).h(ancilla);

    // Uniform superposition over the input register.
    for (let i = 0; i < n; i++) {
      builder = builder.h(i);
    }

    builder = this.applyOracle(builder, n, oracle);

    // Interfere: a second Hadamard on the inputs.
    for (let i = 0; i < n; i++) {
      builder = builder.h(i);
    }

    return builder.build();
  }

  /**
   * Apply U_f to the input register + ancilla.
   *
   * - constant(0): identity (no phase).
   * - constant(1): X on the ancilla — a global (−1) phase under |−⟩, so the
   *   input register is unaffected and still measures all-zeros.
   * - balanced(mask): CX from each input bit set in `mask` to the ancilla, which
   *   kicks back a phase (−1)^{mask·x}.
   */
  private applyOracle(
    builder: CircuitBuilder,
    n: number,
    oracle: DeutschJozsaOracle,
  ): CircuitBuilder {
    const ancilla = n;
    if (oracle.kind === 'constant') {
      if (oracle.value === 1) {
        builder = builder.x(ancilla);
      }
      return builder;
    }
    for (let i = 0; i < n; i++) {
      if (((oracle.mask >> i) & 1) === 1) {
        builder = builder.cx(i, ancilla);
      }
    }
    return builder;
  }

  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis {
    const total = circuit.getMetadata().qubitCount;
    const n = total - 1;
    // 2n + 1 Hadamards + up to n oracle CX + up to one ancilla X.
    const hCount = 2 * n + 1;
    const cxCount = n; // worst case (balanced with full mask)
    const gateCount = hCount + cxCount + 1;

    return {
      qubitCount: total,
      gateCount,
      gateCounts: { H: hCount, CX: cxCount, X: 1 },
      depth: 4, // H | oracle | H (constant depth in the query)
      operationCount: gateCount,
      tCount: 0,
      multiQubitGateCount: cxCount,
      topology: {
        interactionDistance: n,
        estimatedSwapCount: 0,
        compatibleArchitectures: ['full', 'star'],
      },
      complexity: 'O(1) oracle queries, O(n) gates',
      classicalCost: 'Deterministic classical needs 2^{n-1}+1 queries worst case',
    };
  }

  /**
   * Execute Deutsch-Jozsa and report the decision.
   *
   * @param n Number of input qubits
   * @param oracle The oracle to interrogate
   */
  execute(n: number, oracle: DeutschJozsaOracle): AlgorithmResult {
    const circuit = this.buildCircuit(n, oracle);
    const startTime = performance.now();

    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);
    const endTime = performance.now();

    // Marginal probability of the input register being all-zeros.
    const inputMask = (1 << n) - 1;
    let pAllZero = 0;
    for (const [state, amp] of result.statevector) {
      if ((Number(state) & inputMask) === 0) {
        pAllZero += amp.re * amp.re + amp.im * amp.im;
      }
    }

    const decision: 'constant' | 'balanced' = pAllZero > 0.5 ? 'constant' : 'balanced';
    const expected = oracle.kind;
    const successProbability = decision === 'constant' ? pAllZero : 1 - pAllZero;

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
        successProbability,
      },
      output: {
        decision,
        expected,
        correct: decision === expected,
        allZeroProbability: pAllZero,
      },
    };
  }

  /**
   * Verify Deutsch-Jozsa across constant and balanced oracles.
   */
  verify(n = 3): { property: string; passed: boolean; value: number }[] {
    const results: { property: string; passed: boolean; value: number }[] = [];

    const c0 = this.execute(n, { kind: 'constant', value: 0 }).output as {
      decision: string;
      allZeroProbability: number;
    };
    results.push({
      property: 'constant(0) ⇒ decides "constant"',
      passed: c0.decision === 'constant',
      value: c0.allZeroProbability,
    });

    const bal = this.execute(n, { kind: 'balanced', mask: (1 << n) - 1 }).output as {
      decision: string;
      allZeroProbability: number;
    };
    results.push({
      property: 'balanced ⇒ decides "balanced"',
      passed: bal.decision === 'balanced',
      value: bal.allZeroProbability,
    });

    return results;
  }
}
