import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Discrete-Time Coined Quantum Walk (on a cycle of N = 2^n nodes).
 *
 * The quantum analogue of a classical random walk. A single "coin" qubit
 * decides the direction of a conditional shift on an n-qubit position register:
 * each step Hadamards the coin and then moves the walker +1 (coin |0⟩) or −1
 * (coin |1⟩) modulo N. Interference between the two branches makes the walker
 * spread **ballistically** — its standard deviation grows like O(T) after T
 * steps — versus the O(√T) diffusive spreading of a classical walk. This
 * quadratic-faster spreading underlies quantum-walk search and graph algorithms.
 *
 * Registers: position qubits 0..n-1 (qubit 0 = least significant), coin qubit n.
 *
 * The conditional ±1 shift is a reversible modular adder: increment is the
 * standard carry cascade (flip bit i controlled on all lower bits), gated on the
 * coin; decrement reuses it as X^n · increment · X^n (since x−1 = ¬(¬x + 1)).
 *
 * References:
 * - Aharonov, Ambainis, Kempe & Vazirani, "Quantum Walks on Graphs", STOC 2001
 * - Kempe, "Quantum random walks - an introductory overview", Contemp. Phys. 44 (2003)
 */
export class QuantumWalk implements IQuantumAlgorithm {
  readonly name = 'Quantum Walk';
  readonly description = 'Discrete-time coined quantum walk on a cycle (ballistic spreading)';
  readonly category = 'search' as const;
  readonly references = [
    'Aharonov, Ambainis, Kempe & Vazirani, "Quantum Walks on Graphs", STOC 2001',
    'Kempe, "Quantum random walks - an introductory overview", Contemp. Phys. 44, 307 (2003)',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build the quantum-walk circuit.
   *
   * @param n Number of position qubits (cycle length N = 2^n)
   * @param steps Number of walk steps
   * @param options.start Starting node (default: the cycle midpoint 2^{n-1})
   * @param options.symmetricCoin Prepare the coin in (|0⟩+i|1⟩)/√2 for a
   *   symmetric distribution (default true)
   */
  buildCircuit(
    n: number,
    steps: number,
    options: { start?: number; symmetricCoin?: boolean } = {},
  ): Circuit {
    if (n <= 0) {
      throw new Error('Number of position qubits must be positive');
    }
    if (steps < 0) {
      throw new Error('Steps must be non-negative');
    }
    const start = options.start ?? 1 << (n - 1);
    if (start < 0 || start >= Math.pow(2, n)) {
      throw new Error('Start node out of range');
    }
    const symmetricCoin = options.symmetricCoin ?? true;
    const coin = n;

    let builder = Circuit.builder(n + 1);

    // Prepare the starting position.
    for (let i = 0; i < n; i++) {
      if (((start >> i) & 1) === 1) {
        builder = builder.x(i);
      }
    }

    // Symmetric initial coin state (|0⟩ + i|1⟩)/√2.
    if (symmetricCoin) {
      builder = builder.h(coin).s(coin);
    }

    for (let step = 0; step < steps; step++) {
      builder = builder.h(coin); // coin flip
      builder = this.applyShift(builder, n);
    }

    return builder.build();
  }

  /**
   * Conditional shift: increment position when coin=0, decrement when coin=1.
   */
  private applyShift(builder: CircuitBuilder, n: number): CircuitBuilder {
    const coin = n;

    // Increment branch, gated on coin=0 (wrap the coin so it reads as a 1-control).
    builder = builder.x(coin);
    builder = this.conditionalIncrement(builder, n, coin);
    builder = builder.x(coin);

    // Decrement branch, gated on coin=1: X^n · increment · X^n.
    for (let i = 0; i < n; i++) {
      builder = builder.x(i);
    }
    builder = this.conditionalIncrement(builder, n, coin);
    for (let i = 0; i < n; i++) {
      builder = builder.x(i);
    }

    return builder;
  }

  /**
   * Add 1 (mod 2^n) to the position register, every carry gated on `control`.
   * Processes high bits first so each carry reads pre-flip lower bits.
   */
  private conditionalIncrement(
    builder: CircuitBuilder,
    n: number,
    control: number,
  ): CircuitBuilder {
    for (let i = n - 1; i >= 1; i--) {
      const controls = [control, ...Array.from({ length: i }, (_, k) => k)];
      builder = builder.mcx(controls, i);
    }
    // Lowest bit: flip whenever the control is set.
    builder = builder.cx(control, 0);
    return builder;
  }

  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis {
    const n = circuit.getMetadata().qubitCount - 1;
    return {
      qubitCount: n + 1,
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
      complexity: 'Ballistic spreading: σ ∝ T after T steps',
      classicalCost: 'Classical random walk: σ ∝ √T (diffusive)',
    };
  }

  /**
   * Execute the walk and report the position distribution and its spread.
   *
   * @param n Number of position qubits
   * @param steps Number of walk steps
   * @param options See {@link buildCircuit}
   */
  execute(
    n: number,
    steps: number,
    options: { start?: number; symmetricCoin?: boolean } = {},
  ): AlgorithmResult {
    const start = options.start ?? 1 << (n - 1);
    const circuit = this.buildCircuit(n, steps, options);

    const startTime = performance.now();
    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);
    const endTime = performance.now();

    // Marginalise over the position register (bits 0..n-1).
    const posMask = (1 << n) - 1;
    const probByPos = new Map<number, number>();
    let totalProb = 0;
    for (const [state, amp] of result.statevector) {
      const pos = Number(state) & posMask;
      const p = amp.re * amp.re + amp.im * amp.im;
      probByPos.set(pos, (probByPos.get(pos) ?? 0) + p);
      totalProb += p;
    }

    // Spread statistics, measured as signed displacement from the start on the
    // cycle so wrap-around does not distort the variance.
    const N = 1 << n;
    let mean = 0;
    for (const [pos, p] of probByPos) {
      mean += this.signedDisplacement(pos, start, N) * p;
    }
    let variance = 0;
    for (const [pos, p] of probByPos) {
      const d = this.signedDisplacement(pos, start, N) - mean;
      variance += d * d * p;
    }
    const stdDev = Math.sqrt(variance);
    const classicalStdDev = Math.sqrt(steps);

    const distribution = Array.from(probByPos.entries())
      .map(([position, probability]) => ({ position, probability }))
      .sort((a, b) => a.position - b.position);

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
        iterations: steps,
      },
      output: {
        steps,
        start,
        nodes: N,
        meanDisplacement: mean,
        stdDev,
        classicalStdDev,
        spreadRatio: classicalStdDev > 0 ? stdDev / classicalStdDev : 0,
        totalProbability: totalProb,
        distribution,
      },
    };
  }

  /** Signed displacement of `pos` from `start` on a cycle of N nodes. */
  private signedDisplacement(pos: number, start: number, N: number): number {
    let d = pos - start;
    if (d > N / 2) {
      d -= N;
    } else if (d < -N / 2) {
      d += N;
    }
    return d;
  }

  /**
   * Verify probability conservation and ballistic (super-diffusive) spreading.
   */
  verify(n = 5, steps = 8): { property: string; passed: boolean; value: number }[] {
    const out = this.execute(n, steps).output as {
      totalProbability: number;
      stdDev: number;
      classicalStdDev: number;
    };
    return [
      {
        property: 'probability conserved',
        passed: Math.abs(out.totalProbability - 1) < 1e-9,
        value: out.totalProbability,
      },
      {
        property: 'ballistic: quantum σ exceeds classical √T',
        passed: out.stdDev > out.classicalStdDev,
        value: out.stdDev / out.classicalStdDev,
      },
    ];
  }
}
