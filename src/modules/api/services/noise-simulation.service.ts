/**
 * NoiseSimulationService.
 *
 * Bridges the REST layer to the density-matrix engine: it builds a validated
 * circuit from a JSON spec (reusing the SimulationRunnerService's validation)
 * and runs it under noise, returning the diagonal probabilities, sampled counts,
 * purity, and (optionally) fidelity against the noiseless state.
 */

import { Injectable } from '@nestjs/common';
import {
  DensityMatrixEngine,
  DensityMatrixOptions,
  DensityMatrixResult,
  NoiseSpec,
} from '../../simulation-engines/engines/density-matrix-engine/density-matrix-engine';
import { CircuitSpec, SimulationRunnerService } from './simulation-runner.service';

export interface NoiseSimulationRequest {
  spec: CircuitSpec;
  noise?: NoiseSpec[];
  shots?: number;
  seed?: number;
  computeFidelity?: boolean;
}

@Injectable()
export class NoiseSimulationService {
  private readonly engine = new DensityMatrixEngine();

  constructor(private readonly runner: SimulationRunnerService) {}

  run(request: NoiseSimulationRequest): DensityMatrixResult {
    const circuit = this.runner.buildCircuit(request.spec);
    const options: DensityMatrixOptions = {
      noise: request.noise,
      shots: request.shots,
      seed: request.seed,
      computeFidelity: request.computeFidelity,
    };
    return this.engine.simulate(circuit, options);
  }
}
