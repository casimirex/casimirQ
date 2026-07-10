import { Circuit, CircuitBuilder } from '../../circuit-engine/circuit';
import {
  IQuantumAlgorithm,
  AlgorithmAnalysis,
  AlgorithmResult,
} from '../interfaces/algorithm.interface';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';

/**
 * Quantum Approximate Optimization Algorithm (QAOA) implementation.
 *
 * QAOA finds approximate solutions to combinatorial optimization problems
 * using a variational quantum approach.
 *
 * For a cost function C(z) to maximize:
 *   |γ, β⟩ = e^(-iβ H_mixer) e^(-iγ H_C) ... |+⟩
 *
 * References:
 * - Farhi, Goldstone, Gutmann, "A Quantum Approximate Optimization Algorithm" (2014)
 * - Hadfield et al., "From the Quantum Approximate Optimization Algorithm to a Quantum Alternating Operator Ansatz" (2019)
 */
export class QAOA implements IQuantumAlgorithm {
  readonly name = 'Quantum Approximate Optimization Algorithm';
  readonly description = 'Finds approximate solutions to combinatorial optimization problems';
  readonly category = 'optimization' as const;
  readonly references = [
    'Farhi, Goldstone, Gutmann, "A Quantum Approximate Optimization Algorithm", arXiv:1411.4028 (2014)',
    'Hadfield et al., "From the Quantum Approximate Optimization Algorithm to a Quantum Alternating Operator Ansatz", arXiv:1709.03489 (2019)',
  ];

  constructor(private readonly enginesService: SimulationEnginesService) {}

  /**
   * Build QAOA circuit for MaxCut on a graph.
   *
   * @param n Number of vertices
   * @param edges List of edges [[u, v], ...]
   * @param p Number of QAOA layers
   * @param gamma Mixing angle(s) for cost Hamiltonian
   * @param beta Mixing angle(s) for mixer Hamiltonian
   * @returns Circuit implementing QAOA
   */
  buildCircuit(
    n: number,
    edges: [number, number][],
    p = 1,
    gamma?: number[],
    beta?: number[],
  ): Circuit {
    if (n <= 0) {
      throw new Error('Number of vertices must be positive');
    }
    if (p <= 0) {
      throw new Error('Number of layers must be positive');
    }

    let builder = Circuit.builder(n);

    // Initialize |+⟩ state on all qubits
    for (let i = 0; i < n; i++) {
      builder = builder.h(i);
    }

    // Apply p layers of QAOA
    for (let layer = 0; layer < p; layer++) {
      const gamma_l = gamma?.[layer] ?? Math.PI / 4; // Default value
      const beta_l = beta?.[layer] ?? Math.PI / 4;

      // Apply cost Hamiltonian: e^(-iγ H_C)
      // For MaxCut: H_C = Σ_{(u,v)∈E} Z_u Z_v / 2
      builder = this.applyCostHamiltonian(builder, edges, gamma_l);

      // Apply mixer Hamiltonian: e^(-iβ H_M)
      // Standard mixer: H_M = Σ_i X_i
      builder = this.applyMixerHamiltonian(builder, n, beta_l);
    }

    return builder.build();
  }

  /**
   * Apply cost Hamiltonian for MaxCut.
   * H_C = Σ_{(u,v)∈E} Z_u Z_v / 2
   *
   * This corresponds to RZZ gates between connected vertices.
   */
  private applyCostHamiltonian(
    builder: CircuitBuilder,
    edges: [number, number][],
    gamma: number,
  ): CircuitBuilder {
    // For each edge (u, v), apply RZZ(2γ) gate
    // RZZ(θ) = e^(-iθ Z⊗Z / 2)
    // Since MaxCut uses Z_u Z_v / 2, we need RZZ(2γ)

    for (const [u, v] of edges) {
      // Decompose RZZ into CNOTs and RZ
      // RZZ(θ) = CNOT(u,v) · RZ(v, θ) · CNOT(u,v)
      builder = builder.cx(u, v);
      builder = builder.rz(v, 2 * gamma);
      builder = builder.cx(u, v);
    }

    return builder;
  }

  /**
   * Apply mixer Hamiltonian.
   * Standard mixer: H_M = Σ_i X_i
   * e^(-iβ H_M) = ⊗_i e^(-iβ X_i) = ⊗_i RX(i, 2β)
   */
  private applyMixerHamiltonian(builder: CircuitBuilder, n: number, beta: number): CircuitBuilder {
    // Apply RX(2β) to each qubit
    for (let i = 0; i < n; i++) {
      builder = builder.rx(i, 2 * beta);
    }

    return builder;
  }

  /**
   * Calculate the expectation value of the cost function.
   *
   * @param circuit QAOA circuit with bound parameters
   * @param edges Graph edges
   * @returns Expected cut size
   */
  calculateExpectation(
    circuit: Circuit,
    edges: [number, number][],
  ): { expectation: number; variance: number; samples: number } {
    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);

    // For each basis state |z⟩, calculate C(z) = Σ_{(u,v)} [z_u ≠ z_v]
    let totalExpectation = 0;
    let totalVariance = 0;
    let sampleCount = 0;

    for (const [idx, amp] of result.statevector.entries()) {
      const bits = Number(idx);
      const probability = amp.re * amp.re + amp.im * amp.im;

      if (probability < 1e-15) continue;

      // Calculate cut value for this bitstring
      let cutValue = 0;
      for (const [u, v] of edges) {
        const zu = (bits >> u) & 1;
        const zv = (bits >> v) & 1;
        if (zu !== zv) {
          cutValue += 1; // Edge is cut
        }
      }

      totalExpectation += probability * cutValue;
      totalVariance += probability * cutValue * cutValue;
      sampleCount++;
    }

    const variance = totalVariance - totalExpectation * totalExpectation;

    return {
      expectation: totalExpectation,
      variance: Math.max(0, variance),
      samples: sampleCount,
    };
  }

  /**
   * Optimize QAOA parameters using a classical optimizer.
   *
   * @param n Number of vertices
   * @param edges Graph edges
   * @param p Number of QAOA layers
   * @param maxIterations Maximum optimization iterations
   * @returns Optimized angles and expected cut value
   */
  optimize(
    n: number,
    edges: [number, number][],
    p = 1,
    maxIterations = 100,
  ): {
    optimalGamma: number[];
    optimalBeta: number[];
    maxExpectation: number;
    iterations: number;
    convergenceHistory: number[];
  } {
    // Initialize parameters
    const gamma = Array.from({ length: p }, () => Math.random() * Math.PI);
    const beta = Array.from({ length: p }, () => (Math.random() * Math.PI) / 2);

    const convergenceHistory: number[] = [];
    const learningRate = 0.1;
    const eps = 0.01;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Calculate current expectation
      const circuit = this.buildCircuit(n, edges, p, gamma, beta);
      const { expectation } = this.calculateExpectation(circuit, edges);
      convergenceHistory.push(expectation);

      // Check convergence
      if (iter > 0 && Math.abs(convergenceHistory[iter] - convergenceHistory[iter - 1]) < 1e-6) {
        return {
          optimalGamma: gamma,
          optimalBeta: beta,
          maxExpectation: expectation,
          iterations: iter,
          convergenceHistory,
        };
      }

      // Gradient descent for gamma
      for (let i = 0; i < p; i++) {
        const gammaPlus = [...gamma];
        gammaPlus[i] += eps;
        const circuitPlus = this.buildCircuit(n, edges, p, gammaPlus, beta);
        const { expectation: expPlus } = this.calculateExpectation(circuitPlus, edges);
        const gradient = (expPlus - expectation) / eps;
        gamma[i] += learningRate * gradient; // Maximize, so +
      }

      // Gradient descent for beta
      for (let i = 0; i < p; i++) {
        const betaPlus = [...beta];
        betaPlus[i] += eps;
        const circuitPlus = this.buildCircuit(n, edges, p, gamma, betaPlus);
        const { expectation: expPlus } = this.calculateExpectation(circuitPlus, edges);
        const gradient = (expPlus - expectation) / eps;
        beta[i] += learningRate * gradient;
      }
    }

    // Final evaluation
    const finalCircuit = this.buildCircuit(n, edges, p, gamma, beta);
    const { expectation: finalExpectation } = this.calculateExpectation(finalCircuit, edges);

    return {
      optimalGamma: gamma,
      optimalBeta: beta,
      maxExpectation: finalExpectation,
      iterations: maxIterations,
      convergenceHistory,
    };
  }

  /**
   * Find the best solution by sampling the optimized circuit.
   *
   * @param n Number of vertices
   * @param edges Graph edges
   * @param shots Number of samples
   * @returns Most likely cut and its value
   */
  sampleSolution(
    n: number,
    edges: [number, number][],
    p = 1,
    shots = 1000,
  ): {
    bestSolution: number;
    bestCutValue: number;
    solutionProbabilities: Map<number, number>;
  } {
    // Optimize first
    const { optimalGamma, optimalBeta } = this.optimize(n, edges, p, 50);

    // Build optimized circuit
    const circuit = this.buildCircuit(n, edges, p, optimalGamma, optimalBeta);

    // Run and measure
    const engine = this.enginesService.getEngineForCircuit(circuit);
    const result = engine.run(circuit);

    // Sample from distribution
    const solutionCounts = new Map<number, number>();

    for (const [idx, amp] of result.statevector.entries()) {
      const probability = amp.re * amp.re + amp.im * amp.im;
      if (probability > 1e-10) {
        solutionCounts.set(Number(idx), probability * shots);
      }
    }

    // Calculate cut values and find best
    let bestSolution = 0;
    let bestCutValue = 0;
    const solutionProbabilities = new Map<number, number>();

    for (const [solution, count] of solutionCounts) {
      // Calculate cut value
      let cutValue = 0;
      for (const [u, v] of edges) {
        const su = (solution >> u) & 1;
        const sv = (solution >> v) & 1;
        if (su !== sv) cutValue++;
      }

      solutionProbabilities.set(solution, count / shots);

      if (cutValue > bestCutValue) {
        bestCutValue = cutValue;
        bestSolution = solution;
      }
    }

    return {
      bestSolution,
      bestCutValue,
      solutionProbabilities,
    };
  }

  /**
   * Execute QAOA.
   */
  execute(n: number, edges: [number, number][], p = 1): AlgorithmResult {
    const startTime = performance.now();

    const result = this.optimize(n, edges, p);
    const solution = this.sampleSolution(n, edges, p);

    const endTime = performance.now();

    return {
      measurements: new Map(),
      metrics: {
        executionTimeMs: endTime - startTime,
        iterations: result.iterations,
      },
      output: {
        ...result,
        ...solution,
      },
    };
  }

  /**
   * Analyze QAOA circuit.
   */
  analyzeCircuit(circuit: Circuit): AlgorithmAnalysis {
    const n = circuit.getMetadata().qubitCount;
    const metadata = circuit.getMetadata();

    return {
      qubitCount: n,
      gateCount: metadata.gateCount,
      gateCounts: metadata.gateCounts,
      depth: metadata.depth,
      operationCount: metadata.operationCount,
      tCount: 0, // QAOA doesn't need T gates
      multiQubitGateCount: metadata.multiQubitGateCount,
      topology: {
        interactionDistance: metadata.multiQubitGateCount > 0 ? n - 1 : 0,
        estimatedSwapCount: 0, // Assuming graph topology matches hardware
        compatibleArchitectures: ['linear', '2D', 'full'],
      },
      complexity: 'O(p × |E|) gates, p = QAOA depth',
      classicalCost: 'Requires O(1/ε²) shots per expectation evaluation',
    };
  }
}

/**
 * Create example graphs for testing.
 */
export function createExampleGraphs(): Record<string, { n: number; edges: [number, number][] }> {
  return {
    // Triangle (3 vertices)
    triangle: {
      n: 3,
      edges: [
        [0, 1],
        [1, 2],
        [0, 2],
      ],
    },

    // Square (4 vertices)
    square: {
      n: 4,
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ],
    },

    // Complete graph K4
    K4: {
      n: 4,
      edges: [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
        [1, 3],
        [2, 3],
      ],
    },

    // Path graph P4
    path4: {
      n: 4,
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
    },
  };
}
