/**
 * Local simulator backend.
 *
 * Wraps the platform's exact simulation engines (statevector / Clifford / MPS)
 * with automatic engine selection. This is the default, always-available target.
 */

import { Injectable } from '@nestjs/common';
import { CircuitSpec, SimulationRunnerService } from '../../api/services/simulation-runner.service';
import {
  Backend,
  BackendCapabilities,
  BackendRunOptions,
  BackendRunResult,
  BackendType,
} from '../domain/backend';

/** The universal gate set the local simulator runs natively. */
export const UNIVERSAL_GATES = [
  'h',
  'x',
  'y',
  'z',
  's',
  'sdg',
  't',
  'tdg',
  'rx',
  'ry',
  'rz',
  'p',
  'cx',
  'cnot',
  'cy',
  'cz',
  'ch',
  'swap',
  'cp',
  'ccx',
  'toffoli',
  'cswap',
];

@Injectable()
export class LocalSimulatorBackend extends Backend {
  readonly id = 'local-simulator';
  readonly name = 'Local Simulator';
  readonly type: BackendType = 'simulator';
  readonly description =
    'Exact statevector / Clifford / MPS simulation with automatic engine selection.';
  readonly capabilities: BackendCapabilities = {
    maxQubits: 24,
    nativeGates: UNIVERSAL_GATES,
    supportsNoise: false,
    connectivity: 'all-to-all',
    simulated: true,
  };

  constructor(private readonly runner: SimulationRunnerService) {
    super();
  }

  isAvailable(): boolean {
    return true;
  }

  async run(spec: CircuitSpec, options: BackendRunOptions): Promise<BackendRunResult> {
    const result = this.runner.run(spec, {
      engine: 'auto',
      shots: options.shots,
      seed: options.seed,
    });
    return {
      backendId: this.id,
      numQubits: result.numQubits,
      shots: result.shots,
      counts: result.results.counts,
      probabilities: result.results.probabilities,
      metadata: {
        executionTimeMs: result.metadata.executionTimeMs,
        engine: result.requestedEngine,
        nativeGateFraction: this.nativeGateFraction(spec),
      },
    };
  }
}
