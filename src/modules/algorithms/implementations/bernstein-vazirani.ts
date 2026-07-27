import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Bernstein-Vazirani Algorithm.
 *
 * Given an oracle for f(x) = (s · x) mod 2 with a hidden bit string
 * s ∈ {0,1}^n, Bernstein-Vazirani recovers **all n bits of s with a single
 * query**. Classically, learning s requires n queries (one per bit).
 *
 * It is the Deutsch-Jozsa circuit read out as a value rather than a decision:
 * 1. Prepare the ancilla in |−⟩ (X then H) for phase kickback.
 * 2. Hadamard the input register.
 * 3. Apply U_f — a CX from each input bit set in s to the ancilla, kicking back
 *    a phase (−1)^{s·x}.
 * 4. Hadamard the input register again; it now sits exactly in the basis
 *    state |s⟩.
 * 5. Measure the input register to read off s.
 *
 * References:
 * - Bernstein & Vazirani, "Quantum complexity theory", SIAM J. Comput. 26, 1411 (1997)
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 6.6
 */
export class BernsteinVazirani implements IQuantumAlgorithm {
  readonly name = 'Bernstein-Vazirani';
  readonly description = 'Recovers a hidden bit string s from f(x)=s·x with one query';
  readonly category = 'fundamental' as const;
  readonly references = [
    'Bernstein & Vazirani, "Quantum complexity theory", SIAM J. Comput. 26, 1411 (1997)',
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 6.6',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build the Bernstein-Vazirani circuit for hidden string `secret`.
   *
   * @param n Number of input qubits (the ancilla is qubit index `n`)
   * @param secret The hidden bit string, as an integer in [0, 2^n)
   */
  buildCircuit(n: number, secret: number): Circuit {
    if (n <= 0) {
      throw new Error('Number of input qubits must be positive');
    }
    if (secret < 0 || secret >= Math.pow(2, n)) {
      throw new Error('Secret must be in [0, 2^n)');
    }

    const ancilla = n;
    let builder = Circuit.builder(n + 1);

    builder = builder.x(ancilla).h(ancilla);
    for (let i = 0; i < n; i++) {
      builder = builder.h(i);
    }

    builder = this.applyOracle(builder, n, secret);

    for (let i = 0; i < n; i++) {
      builder = builder.h(i);
    }

    return builder.build();
  }

  /** U_f: CX from every input bit set in `secret` to the ancilla. */
  private applyOracle(builder: CircuitBuilder, n: number, secret: number): CircuitBuilder {
    const ancilla = n;
    for (let i = 0; i < n; i++) {
      if (((secret >> i) & 1) === 1) {
        builder = builder.cx(i, ancilla);
      }
    }
    return builder;
  }

  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis {
    const total = circuit.getMetadata().qubitCount;
    const n = total - 1;
    const hCount = 2 * n + 1;
    const cxCount = n; // worst case (all bits of s set)
    const gateCount = hCount + cxCount + 1;

    return {
      qubitCount: total,
      gateCount,
      gateCounts: { H: hCount, CX: cxCount, X: 1 },
      depth: 4,
      operationCount: gateCount,
      tCount: 0,
      multiQubitGateCount: cxCount,
      topology: {
        interactionDistance: n,
        estimatedSwapCount: 0,
        compatibleArchitectures: ['full', 'star'],
      },
      complexity: 'O(1) oracle queries, O(n) gates',
      classicalCost: 'Classical needs n queries (one bit each)',
    };
  }

  /**
   * Execute Bernstein-Vazirani and recover the hidden string.
   *
   * @param n Number of input qubits
   * @param secret The hidden bit string
   */
  execute(n: number, secret: number): AlgorithmResult {
    const circuit = this.buildCircuit(n, secret);
    const startTime = performance.now();

    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);
    const endTime = performance.now();

    // The input register collapses onto |s⟩. Find the most-probable input value.
    const inputMask = (1 << n) - 1;
    const probByInput = new Map<number, number>();
    for (const [state, amp] of result.statevector) {
      const input = Number(state) & inputMask;
      const p = amp.re * amp.re + amp.im * amp.im;
      probByInput.set(input, (probByInput.get(input) ?? 0) + p);
    }

    let recovered = 0;
    let successProbability = 0;
    for (const [input, p] of probByInput) {
      if (p > successProbability) {
        successProbability = p;
        recovered = input;
      }
    }

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
        successProbability,
      },
      output: {
        secret,
        recovered,
        recoveredBits: recovered.toString(2).padStart(n, '0'),
        correct: recovered === secret,
      },
    };
  }

  /**
   * Verify recovery for a spread of hidden strings.
   */
  verify(n = 4): { property: string; passed: boolean; value: number }[] {
    const N = Math.pow(2, n);
    const samples = [0, 1, N - 1, Math.floor(N / 3)].filter((s, i, a) => a.indexOf(s) === i);
    return samples.map((secret) => {
      const out = this.execute(n, secret).output as { recovered: number; correct: boolean };
      return {
        property: `recover s=${secret}`,
        passed: out.correct,
        value: out.recovered,
      };
    });
  }
}
