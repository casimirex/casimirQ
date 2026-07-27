import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Simon's Algorithm.
 *
 * Given a 2-to-1 function f: {0,1}^n → {0,1}^n with a hidden period s ≠ 0 —
 * f(x) = f(y) iff y = x ⊕ s — Simon's algorithm recovers s with O(n) quantum
 * queries, an exponential speedup over the Ω(2^{n/2}) queries any classical
 * (even randomized) algorithm needs. It is the direct ancestor of Shor's
 * period-finding core.
 *
 * Circuit (n input qubits 0..n-1, n output qubits n..2n-1):
 * 1. Hadamard the input register.
 * 2. Apply U_f into the output register.
 * 3. Hadamard the input register again.
 * 4. Measuring the input register yields a uniformly random y with y · s = 0.
 *
 * A single run gives one linear constraint on s. Collecting n−1 independent
 * constraints and solving the resulting homogeneous GF(2) system pins down the
 * unique non-zero s. Because the simulator is exact, we read the full set of
 * satisfying y directly from the input-register marginal (they are precisely
 * the orthogonal complement of s) and solve for s deterministically.
 *
 * References:
 * - Simon, "On the power of quantum computation", SIAM J. Comput. 26, 1474 (1997)
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information", Exercise 6.13
 */
export class SimonsAlgorithm implements IQuantumAlgorithm {
  readonly name = "Simon's Algorithm";
  readonly description = 'Recovers the hidden period s of a 2-to-1 function in O(n) queries';
  readonly category = 'fundamental' as const;
  readonly references = [
    'Simon, "On the power of quantum computation", SIAM J. Comput. 26, 1474 (1997)',
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Exercise 6.13',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build Simon's circuit for the hidden period `secret`.
   *
   * The oracle first copies the input into the output register (CX i → n+i),
   * then, if s ≠ 0, conditions on the least-significant set bit j of s to XOR s
   * into the output. This realises a 2-to-1 function with period exactly s.
   *
   * @param n Number of input qubits (total qubits = 2n)
   * @param secret The hidden period, an integer in [0, 2^n)
   */
  buildCircuit(n: number, secret: number): Circuit {
    if (n <= 0) {
      throw new Error('Number of input qubits must be positive');
    }
    if (secret < 0 || secret >= Math.pow(2, n)) {
      throw new Error('Secret must be in [0, 2^n)');
    }

    let builder = Circuit.builder(2 * n);

    for (let i = 0; i < n; i++) {
      builder = builder.h(i);
    }

    builder = this.applyOracle(builder, n, secret);

    for (let i = 0; i < n; i++) {
      builder = builder.h(i);
    }

    return builder.build();
  }

  /** U_f: output ← x, then (if s≠0) XOR s into output controlled on x_j. */
  private applyOracle(builder: CircuitBuilder, n: number, secret: number): CircuitBuilder {
    // Copy input into output.
    for (let i = 0; i < n; i++) {
      builder = builder.cx(i, n + i);
    }

    if (secret === 0) {
      return builder; // 1-to-1 (identity period).
    }

    // Least-significant set bit of the secret.
    let j = 0;
    while (((secret >> j) & 1) === 0) {
      j++;
    }

    for (let i = 0; i < n; i++) {
      if (((secret >> i) & 1) === 1) {
        builder = builder.cx(j, n + i);
      }
    }
    return builder;
  }

  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis {
    const n = circuit.getMetadata().qubitCount / 2;
    const hCount = 2 * n;
    const cxCount = 2 * n; // copy (n) + period XOR (≤ n)
    const gateCount = hCount + cxCount;

    return {
      qubitCount: 2 * n,
      gateCount,
      gateCounts: { H: hCount, CX: cxCount },
      depth: n + 3,
      operationCount: gateCount,
      tCount: 0,
      multiQubitGateCount: cxCount,
      topology: {
        interactionDistance: n,
        estimatedSwapCount: 0,
        compatibleArchitectures: ['full', 'linear'],
      },
      complexity: 'O(n) queries, O(n) gates per query',
      classicalCost: 'Classical needs Ω(2^{n/2}) queries',
    };
  }

  /**
   * Execute Simon's algorithm and recover the hidden period.
   *
   * @param n Number of input qubits
   * @param secret The hidden period
   */
  execute(n: number, secret: number): AlgorithmResult {
    const circuit = this.buildCircuit(n, secret);
    const startTime = performance.now();

    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);
    const endTime = performance.now();

    // Marginal over the input register: the y values with non-zero probability
    // are exactly those satisfying y · s = 0.
    const inputMask = (1 << n) - 1;
    const probByY = new Map<number, number>();
    for (const [state, amp] of result.statevector) {
      const y = Number(state) & inputMask;
      const p = amp.re * amp.re + amp.im * amp.im;
      probByY.set(y, (probByY.get(y) ?? 0) + p);
    }

    const equations: number[] = [];
    for (const [y, p] of probByY) {
      if (p > 1e-9 && y !== 0) {
        equations.push(y);
      }
    }

    const recovered = this.solvePeriod(equations, n);

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
        // One useful equation per non-trivial measurement outcome.
        iterations: equations.length,
      },
      output: {
        secret,
        recovered,
        recoveredBits: recovered.toString(2).padStart(n, '0'),
        correct: recovered === secret,
        equationCount: equations.length,
      },
    };
  }

  /**
   * Solve the homogeneous GF(2) system { y · s = 0 : y ∈ equations } for the
   * unique non-zero period s. Returns 0 when the constraints admit no such
   * period (the s = 0 / 1-to-1 case).
   *
   * Each vector is an integer bitmask (bit i = coefficient of variable i).
   */
  private solvePeriod(equations: number[], n: number): number {
    // Row-reduce the constraint matrix over GF(2).
    const reduced: number[] = [];
    const pivotCol: number[] = [];

    for (const eq of equations) {
      let cur = eq;
      for (let k = 0; k < reduced.length; k++) {
        if (((cur >> pivotCol[k]) & 1) === 1) {
          cur ^= reduced[k];
        }
      }
      if (cur === 0) {
        continue;
      }
      // Lowest set bit becomes this row's pivot.
      let p = 0;
      while (((cur >> p) & 1) === 0) {
        p++;
      }
      for (let k = 0; k < reduced.length; k++) {
        if (((reduced[k] >> p) & 1) === 1) {
          reduced[k] ^= cur;
        }
      }
      reduced.push(cur);
      pivotCol.push(p);
    }

    // A free column (not a pivot) parametrises the null space. For a genuine
    // Simon instance the rank is n−1, leaving exactly one free column.
    const isPivot = new Set(pivotCol);
    let freeCol = -1;
    for (let c = 0; c < n; c++) {
      if (!isPivot.has(c)) {
        freeCol = c;
        break;
      }
    }
    if (freeCol === -1) {
      return 0; // Full rank ⇒ only the trivial solution.
    }

    // Set the free variable to 1; back-substitute the pivot variables.
    let s = 1 << freeCol;
    for (let k = 0; k < reduced.length; k++) {
      if (((reduced[k] >> freeCol) & 1) === 1) {
        s |= 1 << pivotCol[k];
      }
    }
    return s;
  }

  /**
   * Verify recovery for a spread of hidden periods.
   */
  verify(n = 3): { property: string; passed: boolean; value: number }[] {
    const N = Math.pow(2, n);
    const samples = [1, N - 1, Math.floor(N / 2) || 1].filter((s, i, a) => a.indexOf(s) === i);
    return samples.map((secret) => {
      const out = this.execute(n, secret).output as { recovered: number; correct: boolean };
      return {
        property: `recover period s=${secret}`,
        passed: out.correct,
        value: out.recovered,
      };
    });
  }
}
