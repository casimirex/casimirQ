import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Quantum Amplitude Amplification (QAA).
 *
 * The generalisation of Grover's search from a uniform superposition to an
 * arbitrary state-preparation operator A. Given A with A|0⟩ = |ψ⟩ and an oracle
 * that marks a set of "good" basis states, QAA drives the probability of
 * measuring a good state from its initial value a toward 1 in O(1/√a)
 * iterations — a quadratic speedup over the O(1/a) repetitions classical
 * rejection sampling would need.
 *
 * Each iteration applies the operator Q = −A·S₀·A⁻¹·S_χ, where:
 * - S_χ phase-flips the good states,
 * - A⁻¹ un-prepares back toward |0⟩,
 * - S₀ phase-flips |0…0⟩ (reflection about the origin),
 * - A re-prepares |ψ⟩.
 * Together A·S₀·A⁻¹ is a reflection about |ψ⟩, so Q is a rotation by 2θ (with
 * a = sin²θ) in the 2-D {good, bad} plane. Grover is the special case A = H^⊗n.
 *
 * Here A is a product state of per-qubit RY rotations, which gives a genuinely
 * non-uniform starting distribution (unlike Grover) while keeping A⁻¹ exact.
 *
 * References:
 * - Brassard, Høyer, Mosca & Tapp, "Quantum Amplitude Amplification and
 *   Estimation", quant-ph/0005055 (2000)
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 6.1.3
 */
export class AmplitudeAmplification implements IQuantumAlgorithm {
  readonly name = 'Quantum Amplitude Amplification';
  readonly description = 'Amplifies good-state probability under an arbitrary state preparation A';
  readonly category = 'search' as const;
  readonly references = [
    'Brassard, Høyer, Mosca & Tapp, "Quantum Amplitude Amplification and Estimation", quant-ph/0005055 (2000)',
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 6.1.3',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Amplitude of basis state `x` under the product state-prep A(angles):
   * A|0⟩ = ⊗_i (cos(θ_i/2)|0⟩ + sin(θ_i/2)|1⟩).
   */
  private prepAmplitude(x: number, angles: number[]): number {
    let amp = 1;
    for (let i = 0; i < angles.length; i++) {
      const bit = (x >> i) & 1;
      amp *= bit === 1 ? Math.sin(angles[i] / 2) : Math.cos(angles[i] / 2);
    }
    return amp;
  }

  /** Initial probability of the good set under A. */
  initialSuccessProbability(angles: number[], goodStates: number[]): number {
    let a = 0;
    for (const g of goodStates) {
      const amp = this.prepAmplitude(g, angles);
      a += amp * amp;
    }
    return a;
  }

  /** Optimal number of Q iterations given the initial success probability. */
  optimalIterations(a: number): number {
    if (a <= 0 || a >= 1) {
      return 0;
    }
    const theta = Math.asin(Math.sqrt(a));
    return Math.max(0, Math.round(Math.PI / (4 * theta) - 0.5));
  }

  /**
   * Build the amplitude-amplification circuit.
   *
   * @param angles Per-qubit RY angles defining the state preparation A
   * @param goodStates Basis states (integers) considered "good"
   * @param iterations Optional override for the number of Q iterations
   */
  buildCircuit(angles: number[], goodStates: number[], iterations?: number): Circuit {
    const n = angles.length;
    if (n <= 0) {
      throw new Error('Need at least one qubit');
    }
    if (goodStates.length === 0) {
      throw new Error('At least one good state is required');
    }
    for (const g of goodStates) {
      if (g < 0 || g >= Math.pow(2, n)) {
        throw new Error(`Good state ${g} out of range for ${n} qubits`);
      }
    }

    const a = this.initialSuccessProbability(angles, goodStates);
    const iters = iterations ?? this.optimalIterations(a);

    let builder = Circuit.builder(n);
    builder = this.applyPrep(builder, angles);

    for (let it = 0; it < iters; it++) {
      // S_χ: phase-flip each good state.
      for (const g of goodStates) {
        builder = this.applyPhaseFlip(builder, n, g);
      }
      // Reflection about |ψ⟩ = A S₀ A⁻¹.
      builder = this.applyPrepInverse(builder, angles);
      builder = this.applyPhaseFlip(builder, n, 0);
      builder = this.applyPrep(builder, angles);
    }

    return builder.build();
  }

  /** A: per-qubit RY(θ_i). */
  private applyPrep(builder: CircuitBuilder, angles: number[]): CircuitBuilder {
    for (let i = 0; i < angles.length; i++) {
      builder = builder.ry(i, angles[i]);
    }
    return builder;
  }

  /** A⁻¹: per-qubit RY(−θ_i). */
  private applyPrepInverse(builder: CircuitBuilder, angles: number[]): CircuitBuilder {
    for (let i = 0; i < angles.length; i++) {
      builder = builder.ry(i, -angles[i]);
    }
    return builder;
  }

  /**
   * Phase-flip a single basis state via X-masking + a multi-controlled Z that
   * flips |1…1⟩ (matching the Grover oracle construction).
   */
  private applyPhaseFlip(builder: CircuitBuilder, n: number, state: number): CircuitBuilder {
    for (let i = 0; i < n; i++) {
      if (((state >> i) & 1) === 0) {
        builder = builder.x(i);
      }
    }

    if (n === 1) {
      builder = builder.z(0);
    } else if (n === 2) {
      builder = builder.cz(0, 1);
    } else {
      const controls = Array.from({ length: n - 1 }, (_, i) => i);
      builder = builder.mcz(controls, n - 1);
    }

    for (let i = 0; i < n; i++) {
      if (((state >> i) & 1) === 0) {
        builder = builder.x(i);
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
        compatibleArchitectures: ['full'],
      },
      complexity: 'O(1/√a) iterations of Q',
      classicalCost: 'Classical rejection sampling needs O(1/a) preparations',
    };
  }

  /**
   * Execute amplitude amplification and report the amplified good-state
   * probability.
   *
   * @param angles Per-qubit RY angles defining A
   * @param goodStates Basis states considered good
   * @param iterations Optional override for the number of Q iterations
   */
  execute(angles: number[], goodStates: number[], iterations?: number): AlgorithmResult {
    const a = this.initialSuccessProbability(angles, goodStates);
    const iters = iterations ?? this.optimalIterations(a);
    const circuit = this.buildCircuit(angles, goodStates, iters);

    const startTime = performance.now();
    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);
    const endTime = performance.now();

    const good = new Set(goodStates);
    let finalProbability = 0;
    for (const [state, amp] of result.statevector) {
      if (good.has(Number(state))) {
        finalProbability += amp.re * amp.re + amp.im * amp.im;
      }
    }

    // Theoretical amplitude after k iterations: sin²((2k+1)θ).
    const theta = Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
    const theoretical = Math.pow(Math.sin((2 * iters + 1) * theta), 2);

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
        iterations: iters,
        successProbability: finalProbability,
      },
      output: {
        initialProbability: a,
        finalProbability,
        theoreticalProbability: theoretical,
        iterations: iters,
        goodStates,
        amplification: a > 0 ? finalProbability / a : 0,
      },
    };
  }

  /**
   * Verify amplification for a uniform (Grover-equivalent) and a non-uniform
   * preparation.
   */
  verify(): { property: string; passed: boolean; value: number }[] {
    const results: { property: string; passed: boolean; value: number }[] = [];

    // Uniform A = H^⊗3 (RY(π/2)); single good state → reduces to Grover.
    const n = 3;
    const uniform = new Array(n).fill(Math.PI / 2);
    const u = this.execute(uniform, [5]).output as {
      finalProbability: number;
      initialProbability: number;
    };
    results.push({
      property: 'uniform prep amplifies single target > 0.9',
      passed: u.finalProbability > 0.9,
      value: u.finalProbability,
    });

    // Non-uniform A: distinct per-qubit angles → non-uniform start.
    const angles = [Math.PI / 2, Math.PI / 3, (2 * Math.PI) / 5];
    const nu = this.execute(angles, [7]).output as {
      finalProbability: number;
      initialProbability: number;
      theoreticalProbability: number;
    };
    results.push({
      property: 'non-uniform prep amplifies above its initial probability',
      passed: nu.finalProbability > nu.initialProbability,
      value: nu.finalProbability,
    });
    results.push({
      property: 'final probability matches sin²((2k+1)θ) theory',
      passed: Math.abs(nu.finalProbability - nu.theoreticalProbability) < 1e-6,
      value: Math.abs(nu.finalProbability - nu.theoreticalProbability),
    });

    return results;
  }
}
