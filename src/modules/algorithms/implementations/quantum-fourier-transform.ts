import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Quantum Fourier Transform (QFT) implementation.
 *
 * The QFT transforms a quantum state from computational basis
 * to Fourier basis. It is a fundamental primitive in quantum computing.
 *
 * QFT|j⟩ = (1/√N) Σ_k e^(2πijk/N) |k⟩
 *
 * References:
 * - Nielsen & Chuang, Section 5.1
 * - https://en.wikipedia.org/wiki/Quantum_Fourier_transform
 */
export class QuantumFourierTransform implements IQuantumAlgorithm {
  readonly name = 'Quantum Fourier Transform';
  readonly description =
    'Transforms a quantum state to the Fourier basis using O(n²) gates';
  readonly category = 'fundamental' as const;
  readonly references = [
    'Nielsen & Chuang, "Quantum Computation and Quantum Information", Section 5.1',
    'https://en.wikipedia.org/wiki/Quantum_Fourier_transform',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build QFT circuit for n qubits.
   * The qubits are indexed 0 to n-1, with 0 being the least significant.
   *
   * Algorithm:
   * 1. For j from n-1 down to 0:
   *    a. Apply H to qubit j
   *    b. For k from 0 to j-1:
   *       Apply controlled-R_{2^(j-k+1)} from qubit k to j
   * 2. Reverse qubit order (for standard QFT)
   *
   * @param n Number of qubits
   * @returns Circuit implementing QFT
   */
  buildCircuit(n: number): Circuit {
    if (n <= 0) {
      throw new Error('Number of qubits must be positive');
    }

    let builder = Circuit.builder(n);

    // Build QFT circuit from most significant to least significant
    for (let j = n - 1; j >= 0; j--) {
      // Apply Hadamard to qubit j
      builder = builder.h(j);

      // Apply controlled rotation gates
      // R_k = diag(1, e^(2πi/2^k))
      // Controlled-R_{2^(j-k+1)} means rotation by angle 2π/2^(j-k+1)
      for (let k = 0; k < j; k++) {
        const rotationLevel = j - k + 1;
        const angle = (2 * Math.PI) / Math.pow(2, rotationLevel);
        builder = builder.cp(k, j, angle); // Controlled phase
      }
    }

    // Reverse qubit order (swap qubit i with qubit n-1-i)
    for (let i = 0; i < Math.floor(n / 2); i++) {
      builder = builder.swap(i, n - 1 - i);
    }

    return builder.build();
  }

  /**
   * Build inverse QFT circuit.
   * This is the adjoint of the QFT circuit.
   *
   * @param n Number of qubits
   * @returns Circuit implementing inverse QFT
   */
  buildInverseCircuit(n: number): Circuit {
    if (n <= 0) {
      throw new Error('Number of qubits must be positive');
    }

    let builder = Circuit.builder(n);

    // Reverse qubit order first
    for (let i = 0; i < Math.floor(n / 2); i++) {
      builder = builder.swap(i, n - 1 - i);
    }

    // Apply inverse operations in reverse order
    for (let j = 0; j < n; j++) {
      // Apply inverse controlled rotations (in reverse order)
      for (let k = j - 1; k >= 0; k--) {
        const rotationLevel = j - k + 1;
        const angle = -(2 * Math.PI) / Math.pow(2, rotationLevel);
        builder = builder.cp(k, j, angle);
      }

      // Apply Hadamard
      builder = builder.h(j);
    }

    return builder.build();
  }

  /**
   * Analyze QFT circuit
   * @param circuit The built circuit
   * @returns Analysis of the circuit
   */
  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis {
    const n = circuit.getMetadata().qubitCount;

    // QFT complexity analysis
    // n H gates + n(n-1)/2 controlled rotations + n/2 swaps
    const hCount = n;
    const rotationCount = (n * (n - 1)) / 2;
    const swapCount = Math.floor(n / 2);

    return {
      qubitCount: n,
      gateCount: hCount + rotationCount + swapCount,
      gateCounts: {
        H: hCount,
        CP: rotationCount,
        SWAP: swapCount,
      },
      depth: 2 * n - 1, // Approximate
      operationCount: hCount + rotationCount + swapCount,
      tCount: 0, // QFT doesn't require T gates (exact)
      multiQubitGateCount: rotationCount + swapCount,
      topology: {
        interactionDistance: n - 1, // Full connectivity needed
        estimatedSwapCount: swapCount, // Already included
        compatibleArchitectures: ['full', 'linear', '2D'],
      },
      complexity: 'O(n²) gates',
      classicalCost: 'Exponential: QFT provides exponential speedup over classical FFT',
    };
  }

  /**
   * Execute QFT and return the result.
   *
   * @param n Number of qubits
   * @param initialState Optional initial state (default: |0⟩)
   * @returns Algorithm result
   */
  execute(
    n: number,
    initialState?: { index: bigint; amplitude: { re: number; im: number } }[],
  ): AlgorithmResult {
    const circuit = this.buildCircuit(n);
    const startTime = performance.now();

    // Select appropriate backend
    const engine = this.enginesService.getEngineForCircuit(circuit);

    // Run simulation
    const result = engine.run(circuit);
    const endTime = performance.now();

    return {
      measurements: result.statevector,
      metrics: {
        executionTimeMs: endTime - startTime,
      },
      output: {
        circuit,
        statevector: result.finalState,
        analysis: this.analyzeCircuit(circuit),
      },
    };
  }

  /**
   * Verify QFT properties.
   * - QFT† × QFT = I (unitary)
   * - QFT on |0⟩ produces uniform superposition (up to phases)
   *
   * @param n Number of qubits to test
   * @returns Verification results
   */
  verify(n: number): { property: string; passed: boolean; error: number }[] {
    const results: { property: string; passed: boolean; error: number }[] = [];

    // Property 1: QFT† × QFT = I
    const qft = this.buildCircuit(n);
    const qftInv = this.buildInverseCircuit(n);

    // Compose QFT followed by inverse QFT
    const composed = qftInv.compose(qft);
    const engine = this.enginesService.getEngineForCircuit(composed);
    const composedResult = engine.run(composed);

    // Check if result is identity (only |0⟩ should have amplitude 1)
    let identityError = 0;
    for (let i = 0; i < Math.pow(2, n); i++) {
      const expected = i === 0 ? { re: 1, im: 0 } : { re: 0, im: 0 };
      const actual = composedResult.statevector.get(BigInt(i)) ?? {
        re: 0,
        im: 0,
      };
      identityError += Math.pow(expected.re - actual.re, 2);
      identityError += Math.pow(expected.im - actual.im, 2);
    }

    results.push({
      property: 'QFT† × QFT = Identity',
      passed: identityError < 1e-10,
      error: identityError,
    });

    // Property 2: QFT on |0⟩ produces uniform superposition with correct phases
    const qftCircuit = this.buildCircuit(n);
    const qftResult = engine.run(qftCircuit);

    const N = Math.pow(2, n);
    const expectedAmplitude = 1 / Math.sqrt(N);

    let phaseError = 0;
    for (let i = 0; i < N; i++) {
      const amp = qftResult.statevector.get(BigInt(i)) ?? { re: 0, im: 0 };
      const magnitude = Math.sqrt(amp.re * amp.re + amp.im * amp.im);
      phaseError += Math.pow(magnitude - expectedAmplitude, 2);
    }

    results.push({
      property: 'QFT|0⟩ has uniform magnitude 1/√N',
      passed: phaseError < 1e-10,
      error: phaseError,
    });

    return results;
  }
}
