/**
 * Emulated hardware backend.
 *
 * A local simulator dressed up to behave like a small superconducting device:
 * a restricted native gate set, linear connectivity, and a baseline
 * depolarizing error applied after every gate (plus any user noise). It is NOT
 * a real QPU — `simulated` is true and the metadata is clearly marked emulated —
 * but it lets you see how a circuit degrades on hardware-like conditions and how
 * far it is from the device's native gate set.
 */

import { Injectable } from '@nestjs/common';
import { CircuitSpec, SimulationRunnerService } from '../../api/services/simulation-runner.service';
import {
  DensityMatrixEngine,
  NoiseSpec,
} from '../../simulation-engines/engines/density-matrix-engine/density-matrix-engine';
import {
  Backend,
  BackendCapabilities,
  BackendRunOptions,
  BackendRunResult,
  BackendType,
} from '../domain/backend';

/** Baseline per-gate depolarizing error rate of the emulated device. */
const DEVICE_ERROR_RATE = 0.01;

@Injectable()
export class EmulatedHardwareBackend extends Backend {
  readonly id = 'emulated-qpu';
  readonly name = 'Emulated QPU (7-qubit)';
  readonly type: BackendType = 'hardware-emulator';
  readonly description =
    'Local density-matrix simulation with a superconducting-style native gate set, ' +
    'linear connectivity, and baseline device noise. Emulated — not a real device.';
  readonly capabilities: BackendCapabilities = {
    maxQubits: 7,
    // Native basis (matches the transpiler's target); anything else needs
    // transpilation via POST /transpile.
    nativeGates: ['id', 'rz', 'ry', 'cx', 'cnot'],
    supportsNoise: true,
    connectivity: 'linear',
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

    // Baseline device depolarizing noise, plus any caller-supplied channels.
    const noise: NoiseSpec[] = [
      { type: 'depolarizing', params: { p: DEVICE_ERROR_RATE } },
      ...(options.noise ?? []),
    ];

    const result = this.engine.simulate(circuit, {
      noise,
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
        emulated: true,
        deviceErrorRate: DEVICE_ERROR_RATE,
        purity: result.purity,
        nativeGateFraction: this.nativeGateFraction(spec),
        transpilationNote:
          'Non-native gates would be decomposed to the native basis before execution.',
      },
    };
  }
}
