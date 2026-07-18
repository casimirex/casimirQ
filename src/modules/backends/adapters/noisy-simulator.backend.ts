/**
 * Noisy simulator backend.
 *
 * Runs on the density-matrix engine so it can model user-specified noise
 * channels and report purity. Smaller qubit ceiling (4ⁿ memory).
 */

import { Injectable } from '@nestjs/common';
import { CircuitSpec, SimulationRunnerService } from '../../api/services/simulation-runner.service';
import { DensityMatrixEngine } from '../../simulation-engines/engines/density-matrix-engine/density-matrix-engine';
import {
  Backend,
  BackendCapabilities,
  BackendRunOptions,
  BackendRunResult,
  BackendType,
} from '../domain/backend';
import { UNIVERSAL_GATES } from './local-simulator.backend';

@Injectable()
export class NoisySimulatorBackend extends Backend {
  readonly id = 'noisy-simulator';
  readonly name = 'Noisy Simulator';
  readonly type: BackendType = 'simulator';
  readonly description =
    'Density-matrix simulation with user-configurable noise channels; reports purity.';
  readonly capabilities: BackendCapabilities = {
    maxQubits: 10,
    nativeGates: UNIVERSAL_GATES,
    supportsNoise: true,
    connectivity: 'all-to-all',
    simulated: true,
  };

  private readonly engine = new DensityMatrixEngine();

  constructor(private readonly runner: SimulationRunnerService) {
    super();
  }

  isAvailable(): boolean {
    return true;
  }

  async run(spec: CircuitSpec, options: BackendRunOptions): Promise<BackendRunResult> {
    const circuit = this.runner.buildCircuit(spec);
    const result = this.engine.simulate(circuit, {
      noise: options.noise,
      shots: options.shots,
      seed: options.seed,
    });
    return {
      backendId: this.id,
      numQubits: result.numQubits,
      shots: options.shots ?? Object.values(result.counts).reduce((a, b) => a + b, 0),
      counts: result.counts,
      probabilities: result.probabilities,
      metadata: {
        executionTimeMs: result.executionTimeMs,
        engine: 'density-matrix',
        purity: result.purity,
        nativeGateFraction: this.nativeGateFraction(spec),
      },
    };
  }
}
