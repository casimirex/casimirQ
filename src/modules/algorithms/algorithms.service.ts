import { Injectable } from '@nestjs/common';
import { QuantumFourierTransform } from './implementations/quantum-fourier-transform';
import { GroversSearch } from './implementations/grovers-search';
import { VQE, PauliTerm, createExampleHamiltonians } from './implementations/vqe';
import { QAOA, createExampleGraphs } from './implementations/qaoa';
import { QuantumTeleportation } from './implementations/quantum-teleportation';
import { ShorsAlgorithm } from './implementations/shors-algorithm';
import { DeutschJozsa, DeutschJozsaOracle } from './implementations/deutsch-jozsa';
import { BernsteinVazirani } from './implementations/bernstein-vazirani';
import { SimonsAlgorithm } from './implementations/simons-algorithm';
import { PhaseEstimation } from './implementations/phase-estimation';
import { AmplitudeAmplification } from './implementations/amplitude-amplification';
import { QuantumWalk } from './implementations/quantum-walk';
import { HamiltonianSimulation } from './implementations/hamiltonian-simulation';
import { HHL } from './implementations/hhl';
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
      {
        name: 'Deutsch-Jozsa',
        description: 'Decides constant vs balanced oracle with a single query',
        category: 'fundamental',
        factory: () => new DeutschJozsa(this.enginesService),
      },
      {
        name: 'Bernstein-Vazirani',
        description: 'Recovers a hidden bit string s from f(x)=s·x in one query',
        category: 'fundamental',
        factory: () => new BernsteinVazirani(this.enginesService),
      },
      {
        name: "Simon's Algorithm",
        description: 'Finds the hidden period of a 2-to-1 function (exponential speedup)',
        category: 'fundamental',
        factory: () => new SimonsAlgorithm(this.enginesService),
      },
      {
        name: 'Quantum Phase Estimation',
        description: 'Estimates the eigenphase of a unitary to t bits of precision',
        category: 'fundamental',
        factory: () => new PhaseEstimation(this.enginesService),
      },
      {
        name: 'Quantum Amplitude Amplification',
        description: 'Amplifies good-state probability under an arbitrary state preparation',
        category: 'search',
        factory: () => new AmplitudeAmplification(this.enginesService),
      },
      {
        name: 'Quantum Walk',
        description: 'Discrete-time coined quantum walk on a cycle (ballistic spreading)',
        category: 'search',
        factory: () => new QuantumWalk(this.enginesService),
      },
      {
        name: 'Hamiltonian Simulation',
        description: 'Trotterized time evolution e^{-iHt} of a Pauli-sum Hamiltonian',
        category: 'fundamental',
        factory: () => new HamiltonianSimulation(this.enginesService),
      },
      {
        name: 'HHL Algorithm',
        description: 'Solves a Hermitian linear system A x = b (prepares |x⟩ ∝ A⁻¹|b⟩)',
        category: 'fundamental',
        factory: () => new HHL(this.enginesService),
      },
    ];
  }

  /**
   * Execute the HHL linear-system solver.
   */
  executeHHL(b0: number, b1: number): AlgorithmResult {
    const algorithm = new HHL(this.enginesService);
    return algorithm.execute(b0, b1);
  }

  /**
   * Execute Trotterized Hamiltonian simulation.
   */
  executeHamiltonianSimulation(
    n: number,
    terms: PauliTerm[],
    time: number,
    steps = 1,
    order: 1 | 2 = 1,
    initialOnes: number[] = [],
  ): AlgorithmResult {
    const algorithm = new HamiltonianSimulation(this.enginesService);
    return algorithm.execute(n, terms, time, steps, order, initialOnes);
  }

  /**
   * Execute a discrete-time quantum walk.
   */
  executeQuantumWalk(
    n: number,
    steps: number,
    options: { start?: number; symmetricCoin?: boolean } = {},
  ): AlgorithmResult {
    const algorithm = new QuantumWalk(this.enginesService);
    return algorithm.execute(n, steps, options);
  }

  /**
   * Execute Quantum Phase Estimation.
   */
  executePhaseEstimation(phi: number, precision: number): AlgorithmResult {
    const algorithm = new PhaseEstimation(this.enginesService);
    return algorithm.execute(phi, precision);
  }

  /**
   * Execute Quantum Amplitude Amplification.
   */
  executeAmplitudeAmplification(
    angles: number[],
    goodStates: number[],
    iterations?: number,
  ): AlgorithmResult {
    const algorithm = new AmplitudeAmplification(this.enginesService);
    return algorithm.execute(angles, goodStates, iterations);
  }

  /**
   * Execute Deutsch-Jozsa.
   */
  executeDeutschJozsa(n: number, oracle: DeutschJozsaOracle): AlgorithmResult {
    const algorithm = new DeutschJozsa(this.enginesService);
    return algorithm.execute(n, oracle);
  }

  /**
   * Execute Bernstein-Vazirani.
   */
  executeBernsteinVazirani(n: number, secret: number): AlgorithmResult {
    const algorithm = new BernsteinVazirani(this.enginesService);
    return algorithm.execute(n, secret);
  }

  /**
   * Execute Simon's algorithm.
   */
  executeSimon(n: number, secret: number): AlgorithmResult {
    const algorithm = new SimonsAlgorithm(this.enginesService);
    return algorithm.execute(n, secret);
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
      case 'deutsch-jozsa':
      case 'dj': {
        return new DeutschJozsa(this.enginesService).verify(3);
      }
      case 'bernstein-vazirani':
      case 'bv': {
        return new BernsteinVazirani(this.enginesService).verify(4);
      }
      case 'simon': {
        return new SimonsAlgorithm(this.enginesService).verify(3);
      }
      case 'phase-estimation':
      case 'qpe': {
        return new PhaseEstimation(this.enginesService).verify(5);
      }
      case 'amplitude-amplification':
      case 'qaa': {
        return new AmplitudeAmplification(this.enginesService).verify();
      }
      case 'quantum-walk':
      case 'walk': {
        return new QuantumWalk(this.enginesService).verify();
      }
      case 'hamiltonian-simulation':
      case 'trotter': {
        return new HamiltonianSimulation(this.enginesService).verify();
      }
      case 'hhl': {
        return new HHL(this.enginesService).verify();
      }
      default:
        throw new Error(`Verification not available for ${algorithmName}`);
    }
  }
}
