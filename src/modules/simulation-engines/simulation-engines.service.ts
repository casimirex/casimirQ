/**
 * Simulation Engines Service
 *
 * Provides unified interface for all simulation backends.
 * Automatically selects optimal engine based on circuit characteristics.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ISimulationEngine,
  ISimulationResult,
  ISimulationOptions,
} from './interfaces/simulation-engine.interface';
import { Circuit } from '../circuit-engine/circuit';
import { StatevectorEngine } from './engines/statevector-engine/statevector-engine';
import { MPSEngine } from './engines/mps-engine/mps-engine';
import { CliffordEngine } from './engines/clifford-engine/clifford-engine';

export type EngineType = 'statevector' | 'mps' | 'clifford' | 'auto';

export interface IEngineSelection {
  engine: ISimulationEngine;
  engineType: EngineType;
  reason: string;
}

@Injectable()
export class SimulationEnginesService {
  private readonly logger = new Logger(SimulationEnginesService.name);

  private readonly engines: Map<EngineType, ISimulationEngine>;

  constructor(
    private readonly statevectorEngine: StatevectorEngine,
    private readonly mpsEngine: MPSEngine,
    private readonly cliffordEngine: CliffordEngine,
  ) {
    this.engines = new Map<EngineType, ISimulationEngine>([
      ['statevector', statevectorEngine],
      ['mps', mpsEngine],
      ['clifford', cliffordEngine],
    ]);
  }

  /**
   * Select optimal engine for a circuit
   */
  selectEngine(circuit: Circuit, preference?: EngineType): IEngineSelection {
    // User override
    if (preference && preference !== 'auto') {
      const engine = this.engines.get(preference);
      if (engine && engine.supports(circuit)) {
        return {
          engine,
          engineType: preference,
          reason: 'User selected',
        };
      }
      this.logger.warn(
        `Preferred engine ${preference} does not support this circuit, using auto-selection`,
      );
    }

    // Auto-selection logic
    return this.autoSelect(circuit);
  }

  /**
   * Automatic engine selection based on circuit characteristics
   */
  private autoSelect(circuit: Circuit): IEngineSelection {
    const n = circuit.numQubits;

    // Check 1: Is it a Clifford circuit?
    const isClifford = this.isCliffordCircuit(circuit);
    if (isClifford && this.cliffordEngine.supports(circuit)) {
      return {
        engine: this.cliffordEngine,
        engineType: 'clifford',
        reason: 'Clifford circuit detected - exponential speedup',
      };
    }

    // Check 2: Number of qubits
    if (n <= 20) {
      // Small circuits: use dense statevector
      return {
        engine: this.statevectorEngine,
        engineType: 'statevector',
        reason: `Small circuit (${n} qubits) - dense simulation optimal`,
      };
    }

    if (n <= 50) {
      // Medium circuits with potential low entanglement: try MPS
      if (this.mpsEngine.supports(circuit)) {
        return {
          engine: this.mpsEngine,
          engineType: 'mps',
          reason: `Medium circuit (${n} qubits) - MPS with χ=${this.mpsEngine.getMaxBondDimension()}`,
        };
      }
    }

    // Check 3: Can statevector handle it?
    if (this.statevectorEngine.supports(circuit)) {
      return {
        engine: this.statevectorEngine,
        engineType: 'statevector',
        reason: `Using dense statevector for ${n} qubits`,
      };
    }

    // No engine can handle this
    throw new Error(
      `No simulation engine supports this circuit: ${n} qubits with non-Clifford gates`,
    );
  }

  /**
   * Check if circuit contains only Clifford gates
   */
  private isCliffordCircuit(circuit: Circuit): boolean {
    const cliffordGates = new Set([
      'i',
      'id',
      'x',
      'y',
      'z',
      'h',
      's',
      'sdg',
      'cx',
      'cnot',
      'cz',
      'swap',
      'measure',
      'barrier',
    ]);

    for (const op of circuit.operations) {
      if (!cliffordGates.has(op.gate.type.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Simulate circuit with auto-selected or preferred engine
   */
  simulate(
    circuit: Circuit,
    options: ISimulationOptions & { engine?: EngineType } = {},
  ): ISimulationResult {
    const selection = this.selectEngine(circuit, options.engine);

    this.logger.log(`Using ${selection.engineType} engine: ${selection.reason}`);

    return selection.engine.simulate(circuit, options);
  }

  /**
   * Simulate with specific engine
   */
  simulateWithEngine(
    circuit: Circuit,
    engineType: EngineType,
    options: ISimulationOptions = {},
  ): ISimulationResult {
    const engine = this.engines.get(engineType);
    if (!engine) {
      throw new Error(`Unknown engine type: ${engineType}`);
    }

    if (!engine.supports(circuit)) {
      throw new Error(`Engine ${engineType} does not support this circuit`);
    }

    return engine.simulate(circuit, options);
  }

  /**
   * Compare results from multiple engines
   * Useful for validation
   */
  compareEngines(
    circuit: Circuit,
    engines: EngineType[],
    options: ISimulationOptions = {},
  ): Map<EngineType, ISimulationResult> {
    const results = new Map<EngineType, ISimulationResult>();

    for (const engineType of engines) {
      try {
        const result = this.simulateWithEngine(circuit, engineType, options);
        results.set(engineType, result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Engine ${engineType} failed: ${errorMessage}`);
      }
    }

    return results;
  }

  /**
   * Get all available engines
   */
  getAvailableEngines(): EngineType[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Get engine by type
   */
  getEngine(engineType: EngineType): ISimulationEngine | undefined {
    return this.engines.get(engineType);
  }

  /**
   * Check if engine supports circuit
   */
  supports(circuit: Circuit, engineType: EngineType): boolean {
    const engine = this.engines.get(engineType);
    return engine ? engine.supports(circuit) : false;
  }

  /**
   * Get resource estimates for all engines
   */
  estimateResources(circuit: Circuit): Map<EngineType, { estimate: any; supports: boolean }> {
    const estimates = new Map();

    for (const [type, engine] of this.engines) {
      estimates.set(type, {
        estimate: engine.estimateResources(circuit),
        supports: engine.supports(circuit),
      });
    }

    return estimates;
  }

  /**
   * Get engine capabilities
   */
  getCapabilities(): Array<{
    type: EngineType;
    maxQubits: number;
    bestFor: string[];
    limitations: string[];
  }> {
    return [
      {
        type: 'statevector',
        maxQubits: this.statevectorEngine.maxQubits,
        bestFor: ['General circuits', 'N ≤ 20', 'High entanglement'],
        limitations: ['Exponential memory', 'Limited to 28 qubits'],
      },
      {
        type: 'mps',
        maxQubits: this.mpsEngine.maxQubits,
        bestFor: ['Low entanglement', 'N ≤ 50', 'Area-law states'],
        limitations: ['Bond dimension limits accuracy', 'Long-range gates expensive'],
      },
      {
        type: 'clifford',
        maxQubits: this.cliffordEngine.maxQubits,
        bestFor: ['Stabilizer circuits', 'N ≤ 2000', 'Error correction'],
        limitations: ['Clifford gates only', 'No T gates'],
      },
    ];
  }

  /**
   * Get engine for a circuit (auto-selected).
   * Alias for selectEngine with auto.
   */
  getEngineForCircuit(circuit: Circuit): ISimulationEngine {
    return this.selectEngine(circuit, 'auto').engine;
  }

  /**
   * Run circuit simulation (alias for simulate).
   */
  run(circuit: Circuit, options?: ISimulationOptions): ISimulationResult {
    return this.simulate(circuit, options);
  }
}
