import { Injectable } from '@nestjs/common';
import { QuantumFourierTransform } from './implementations/quantum-fourier-transform';
import { GroversSearch } from './implementations/grovers-search';
import { VQE, PauliTerm, createExampleHamiltonians } from './implementations/vqe';
import { QAOA, createExampleGraphs } from './implementations/qaoa';
import { QuantumTeleportation } from './implementations/quantum-teleportation';
import { ShorsAlgorithm } from './implementations/shors-algorithm';
import { SimulationEnginesService } from '../simulation-engines/simulation-engines.service';
import {
  IQuantumAlgorithm,
  AlgorithmResult,
  AlgorithmRegistryEntry,
} from './interfaces/algorithm.interface';

/**
 * Service for quantum algorithms.
 * Provides implementations of fundamental and advanced quantum algorithms.
 */
@Injectable()
export class AlgorithmsService {
  private algorithms: Map<string, new (...args: unknown[]) => IQuantumAlgorithm> = new Map();

  constructor(private readonly enginesService: SimulationEnginesService) {
    this.registerBuiltInAlgorithms();
  }

  /**
   * Register built-in algorithms.
   */
  private registerBuiltInAlgorithms(): void {
    // Algorithm factories - will be instantiated on demand
    // Map stores constructor functions that take SimulationEnginesService
  }

  /**
   * Get list of available algorithms.
   */
  getAvailableAlgorithms(): AlgorithmRegistryEntry[] {
    return [
      {
        name: 'Quantum Fourier Transform',
        description: 'Transforms quantum state to Fourier basis using O(n²) gates',
        category: 'fundamental',
        factory: () => new QuantumFourierTransform(this.enginesService),
      },
      {
        name: "Grover's Search",
        description: 'Searches unstructured database with O(√N) queries',
        category: 'search',
        factory: () => new GroversSearch(this.enginesService),
      },
      {
        name: 'Variational Quantum Eigensolver',
        description: 'Hybrid algorithm for ground state energy estimation',
        category: 'optimization',
        factory: () => new VQE(this.enginesService),
      },
      {
        name: 'Quantum Approximate Optimization Algorithm',
        description: 'Finds approximate solutions to combinatorial problems',
        category: 'optimization',
        factory: () => new QAOA(this.enginesService),
      },
      {
        name: 'Quantum Teleportation',
        description: 'Transfers quantum state using entanglement',
        category: 'fundamental',
        factory: () => new QuantumTeleportation(this.enginesService),
      },
      {
        name: "Shor's Algorithm",
        description: 'Factors integers in polynomial time',
        category: 'cryptography',
        factory: () => new ShorsAlgorithm(this.enginesService),
      },
    ];
  }

  /**
   * Execute QFT algorithm.
   */
  executeQFT(n: number): AlgorithmResult {
    const algorithm = new QuantumFourierTransform(this.enginesService);
    return algorithm.execute(n);
  }

  /**
   * Execute Grover's search.
   */
  executeGrover(n: number, markedItem: number, iterations?: number): AlgorithmResult {
    const algorithm = new GroversSearch(this.enginesService);
    return algorithm.execute(n, markedItem, iterations);
  }

  /**
   * Execute VQE for given Hamiltonian.
   */
  executeVQE(n: number, hamiltonian: PauliTerm[], maxIterations?: number): AlgorithmResult {
    const algorithm = new VQE(this.enginesService);
    return algorithm.execute(n, hamiltonian, maxIterations);
  }

  /**
   * Execute QAOA for MaxCut.
   */
  executeQAOA(n: number, edges: [number, number][], p = 1): AlgorithmResult {
    const algorithm = new QAOA(this.enginesService);
    return algorithm.execute(n, edges, p);
  }

  /**
   * Execute quantum teleportation.
   */
  executeTeleport(messageState: [number, number]): AlgorithmResult {
    const algorithm = new QuantumTeleportation(this.enginesService);
    return algorithm.execute(messageState);
  }

  /**
   * Execute Shor's algorithm.
   */
  executeShor(N: number): AlgorithmResult {
    const algorithm = new ShorsAlgorithm(this.enginesService);
    return algorithm.execute(N);
  }

  /**
   * Get example Hamiltonians for VQE.
   */
  getExampleHamiltonians(): ReturnType<typeof createExampleHamiltonians> {
    return createExampleHamiltonians();
  }

  /**
   * Get example graphs for QAOA.
   */
  getExampleGraphs(): ReturnType<typeof createExampleGraphs> {
    return createExampleGraphs();
  }

  /**
   * Verify an algorithm.
   */
  verifyAlgorithm(algorithmName: string): unknown {
    switch (algorithmName.toLowerCase()) {
      case 'qft': {
        const qft = new QuantumFourierTransform(this.enginesService);
        return qft.verify(3); // Test with 3 qubits
      }
      case 'grover': {
        const grover = new GroversSearch(this.enginesService);
        return grover.verify(3, 5); // Test with 3 qubits, search for 5
      }
      case 'teleport': {
        const teleport = new QuantumTeleportation(this.enginesService);
        return teleport.verify();
      }
      case 'shor': {
        const shor = new ShorsAlgorithm(this.enginesService);
        return shor.verify();
      }
      default:
        throw new Error(`Verification not available for ${algorithmName}`);
    }
  }
}
