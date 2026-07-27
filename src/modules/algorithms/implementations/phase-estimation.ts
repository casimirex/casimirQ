import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Quantum Phase Estimation (QPE).
 *
 * Given a unitary U and one of its eigenstates |ψ⟩ with U|ψ⟩ = e^{2πiφ}|ψ⟩,
 * QPE estimates the phase φ ∈ [0, 1) to t bits of precision using t "counting"
 * qubits. It is the workhorse subroutine behind Shor's period finding, the HHL
 * linear-solver, and quantum chemistry energy estimation.
 *
 * This implementation uses the canonical single-qubit instance: the unitary is
 * the phase gate U = P(2πφ) = diag(1, e^{2πiφ}) and the eigenstate is |1⟩
 * (eigenvalue e^{2πiφ}). It is a faithful, fully general QPE circuit — only the
 * choice of U is specialised so that the controlled powers U^{2^j} are exact
 * single controlled-phase rotations.
 *
 * Circuit (t counting qubits 0..t-1, target qubit t):
 * 1. Prepare the eigenstate |1⟩ on the target (X).
 * 2. Hadamard the counting register.
 * 3. For counting qubit j, apply controlled-U^{2^j} = CP(2π·φ·2^j) onto the
 *    target. This writes the state (1/√2^t) Σ_k e^{2πiφk} |k⟩ into the counting
 *    register.
 * 4. Apply the inverse QFT to the counting register.
 * 5. Measure the counting register: the integer m read out gives φ ≈ m / 2^t
 *    (exact when φ is a dyadic rational with ≤ t bits).
 *
 * References:
 * - Kitaev, "Quantum measurements and the Abelian Stabilizer Problem" (1995)
 * - Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 5.2
 */
export class PhaseEstimation implements IQuantumAlgorithm {
  readonly name = 'Quantum Phase Estimation';
  readonly description = 'Estimates the eigenphase φ of a unitary to t bits of precision';
  readonly category = 'fundamental' as const;
  readonly references = [
    'Kitaev, "Quantum measurements and the Abelian Stabilizer Problem" (1995)',
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 5.2',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build the phase-estimation circuit for eigenphase `phi` with `t` counting
   * qubits.
   *
   * @param phi True eigenphase φ ∈ [0, 1)
   * @param t Number of counting qubits (precision in bits)
   */
  buildCircuit(phi: number, t: number): Circuit {
    if (t <= 0) {
      throw new Error('Number of counting qubits must be positive');
    }
    if (phi < 0 || phi >= 1) {
      throw new Error('Phase φ must be in [0, 1)');
    }

    const target = t;
    let builder = Circuit.builder(t + 1);

    // Eigenstate |1⟩ of U = P(2πφ).
    builder = builder.x(target);

    // Uniform superposition over the counting register.
    for (let j = 0; j < t; j++) {
      builder = builder.h(j);
    }

    // Controlled-U^{2^j}: a controlled phase of 2π·φ·2^j.
    for (let j = 0; j < t; j++) {
      const angle = 2 * Math.PI * phi * Math.pow(2, j);
      builder = builder.cp(j, target, angle);
    }

    // Inverse QFT on the counting register (qubits 0..t-1).
    builder = this.applyInverseQFT(builder, t);

    return builder.build();
  }

  /**
   * Inverse QFT over counting qubits 0..t-1, matching the codebase QFT
   * convention (qubit 0 = least significant).
   */
  private applyInverseQFT(builder: CircuitBuilder, t: number): CircuitBuilder {
    // Reverse qubit order.
    for (let i = 0; i < Math.floor(t / 2); i++) {
      builder = builder.swap(i, t - 1 - i);
    }
    // Inverse controlled rotations + Hadamards.
    for (let j = 0; j < t; j++) {
      for (let k = j - 1; k >= 0; k--) {
        const angle = -(2 * Math.PI) / Math.pow(2, j - k + 1);
        builder = builder.cp(k, j, angle);
      }
      builder = builder.h(j);
    }
    return builder;
  }

  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis {
    const total = circuit.getMetadata().qubitCount;
    const t = total - 1;
    const hCount = 2 * t; // t for superposition + t in the inverse QFT
    const controlledPhases = t + (t * (t - 1)) / 2;
    const swaps = Math.floor(t / 2);
    const gateCount = 1 + hCount + controlledPhases + swaps;

    return {
      qubitCount: total,
      gateCount,
      gateCounts: { X: 1, H: hCount, CP: controlledPhases, SWAP: swaps },
      depth: 2 * t + 2,
      operationCount: gateCount,
      tCount: 0,
      multiQubitGateCount: controlledPhases + swaps,
      topology: {
        interactionDistance: t,
        estimatedSwapCount: swaps,
        compatibleArchitectures: ['full', 'linear'],
      },
      complexity: 'O(t²) gates for t bits of precision',
      classicalCost: 'Estimating an eigenphase to t bits is the core of Shor/HHL',
    };
  }

  /**
   * Execute phase estimation and read off the estimate.
   *
   * @param phi True eigenphase φ ∈ [0, 1)
   * @param t Number of counting qubits
   */
  execute(phi: number, t: number): AlgorithmResult {
    const circuit = this.buildCircuit(phi, t);
    const startTime = performance.now();

    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);
    const endTime = performance.now();

    // Marginalise over the counting register (qubits 0..t-1, qubit 0 = LSB).
    const countMask = (1 << t) - 1;
    const probByK = new Map<number, number>();
    for (const [state, amp] of result.statevector) {
      const k = Number(state) & countMask;
      const p = amp.re * amp.re + amp.im * amp.im;
      probByK.set(k, (probByK.get(k) ?? 0) + p);
    }

    let bestK = 0;
    let bestProbability = 0;
    for (const [k, p] of probByK) {
      if (p > bestProbability) {
        bestProbability = p;
        bestK = k;
      }
    }

    const estimatedPhase = bestK / Math.pow(2, t);

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
        successProbability: bestProbability,
      },
      output: {
        truePhase: phi,
        estimatedPhase,
        measuredInteger: bestK,
        precisionBits: t,
        error: Math.abs(estimatedPhase - phi),
        bestProbability,
      },
    };
  }

  /**
   * Verify QPE recovers exactly-representable phases and stays within one LSB
   * for arbitrary phases.
   */
  verify(t = 5): { property: string; passed: boolean; value: number }[] {
    const results: { property: string; passed: boolean; value: number }[] = [];

    // Exactly representable phase: k / 2^t.
    const exactK = 5;
    const exact = this.execute(exactK / Math.pow(2, t), t).output as {
      measuredInteger: number;
      error: number;
    };
    results.push({
      property: `exact phase ${exactK}/2^${t} recovered`,
      passed: exact.measuredInteger === exactK && exact.error < 1e-9,
      value: exact.measuredInteger,
    });

    // Non-representable phase: estimate within one least-significant bit.
    const phi = 0.3;
    const approx = this.execute(phi, t).output as { error: number };
    results.push({
      property: 'non-dyadic phase within one LSB',
      passed: approx.error <= 1 / Math.pow(2, t) + 1e-9,
      value: approx.error,
    });

    return results;
  }
}
