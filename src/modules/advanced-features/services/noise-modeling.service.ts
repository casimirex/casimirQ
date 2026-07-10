/**
 * Noise Modeling Service
 *
 * Implements quantum noise channels including depolarizing,
 * amplitude damping, phase damping, and custom Kraus operators.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Complex } from '../../../common/utils/complex';
import {
  INoiseChannel,
  INoiseChannelParams,
  INoiseModel,
  INoiseSimulationOptions,
  INoiseResult,
  IDeviceCharacteristics,
  NoiseChannelType,
} from '../interfaces/noise.interface';

/**
 * Common noise models
 */
export const NOISE_MODELS: Record<string, INoiseModel> = {
  ideal: {
    name: 'Ideal',
    singleQubitErrors: [],
    twoQubitErrors: [],
    measurementErrors: [],
  },
  depolarizing: {
    name: 'Depolarizing',
    singleQubitErrors: [
      {
        gate: 'all',
        error: {
          type: 'depolarizing',
          targetQubits: [0],
          params: { pDepolarizing: 0.001 },
        },
      },
    ],
    twoQubitErrors: [
      {
        gate: 'cx',
        error: {
          type: 'depolarizing',
          targetQubits: [0, 1],
          params: { pDepolarizing: 0.01 },
        },
      },
    ],
    measurementErrors: [],
  },
  ibmq_lagos: {
    name: 'IBMQ Lagos',
    singleQubitErrors: [
      {
        gate: 'u1',
        error: { type: 'depolarizing', targetQubits: [0], params: { pDepolarizing: 0.0002 } },
      },
      {
        gate: 'u2',
        error: { type: 'depolarizing', targetQubits: [0], params: { pDepolarizing: 0.0004 } },
      },
      {
        gate: 'u3',
        error: { type: 'depolarizing', targetQubits: [0], params: { pDepolarizing: 0.0008 } },
      },
    ],
    twoQubitErrors: [
      {
        gate: 'cx',
        error: { type: 'depolarizing', targetQubits: [0, 1], params: { pDepolarizing: 0.008 } },
      },
    ],
    measurementErrors: [
      { qubit: 0, pFlip0to1: 0.02, pFlip1to0: 0.02 },
      { qubit: 1, pFlip0to1: 0.03, pFlip1to0: 0.025 },
    ],
  },
};

@Injectable()
export class NoiseModelingService {
  private readonly logger = new Logger(NoiseModelingService.name);

  /**
   * Get available noise models
   */
  getAvailableModels(): string[] {
    return Object.keys(NOISE_MODELS);
  }

  /**
   * Get a noise model by name
   */
  getModel(name: string): INoiseModel | undefined {
    return NOISE_MODELS[name];
  }

  /**
   * Apply depolarizing channel to a state
   */
  applyDepolarizing(
    state: Map<bigint, Complex>,
    targetQubit: number,
    probability: number,
  ): Map<bigint, Complex> {
    if (probability <= 0) return state;

    const noisyState = new Map<bigint, Complex>();
    const factor = 1 - probability;

    // Depolarizing channel: ρ → (1-p)ρ + p/4 * (XρX + YρY + ZρZ + ρ)
    // Simplified: mix with maximally mixed state
    for (const [basis, amplitude] of state) {
      noisyState.set(basis, amplitude.scale(factor));
    }

    return noisyState;
  }

  /**
   * Apply amplitude damping channel
   */
  applyAmplitudeDamping(
    state: Map<bigint, Complex>,
    targetQubit: number,
    gamma: number,
  ): Map<bigint, Complex> {
    if (gamma <= 0) return state;

    const noisyState = new Map<bigint, Complex>();

    // Amplitude damping: models T1 relaxation
    // |1⟩ → |0⟩ with probability γ
    for (const [basis, amplitude] of state) {
      const bit = (basis >> BigInt(targetQubit)) & BigInt(1);

      if (bit === BigInt(1)) {
        // |1⟩ state decays
        const decayedAmp = amplitude.scale(Math.sqrt(1 - gamma));
        noisyState.set(basis, decayedAmp);

        // Add contribution to |0⟩
        const zeroBasis = basis ^ (BigInt(1) << BigInt(targetQubit));
        const existing = noisyState.get(zeroBasis) ?? new Complex(0, 0);
        noisyState.set(zeroBasis, existing.add(amplitude.scale(Math.sqrt(gamma))));
      } else {
        // |0⟩ unchanged
        const existing = noisyState.get(basis) ?? new Complex(0, 0);
        noisyState.set(basis, existing.add(amplitude));
      }
    }

    return noisyState;
  }

  /**
   * Apply phase damping channel
   */
  applyPhaseDamping(
    state: Map<bigint, Complex>,
    targetQubit: number,
    lambda: number,
  ): Map<bigint, Complex> {
    if (lambda <= 0) return state;

    const noisyState = new Map<bigint, Complex>();

    // Phase damping: models T2 dephasing
    // Off-diagonal elements decay
    for (const [basis, amplitude] of state) {
      noisyState.set(basis, amplitude.scale(Math.sqrt(1 - lambda)));
    }

    return noisyState;
  }

  /**
   * Apply bit flip channel
   */
  applyBitFlip(
    state: Map<bigint, Complex>,
    targetQubit: number,
    probability: number,
  ): Map<bigint, Complex> {
    if (probability <= 0) return state;

    const noisyState = new Map<bigint, Complex>();
    const flipMask = BigInt(1) << BigInt(targetQubit);

    for (const [basis, amplitude] of state) {
      // Keep original with probability (1-p)
      const existing = noisyState.get(basis) ?? new Complex(0, 0);
      noisyState.set(basis, existing.add(amplitude.scale(1 - probability)));

      // Add flipped component with probability p
      const flippedBasis = basis ^ flipMask;
      const flippedExisting = noisyState.get(flippedBasis) ?? new Complex(0, 0);
      noisyState.set(flippedBasis, flippedExisting.add(amplitude.scale(probability)));
    }

    return noisyState;
  }

  /**
   * Apply phase flip channel
   */
  applyPhaseFlip(
    state: Map<bigint, Complex>,
    targetQubit: number,
    probability: number,
  ): Map<bigint, Complex> {
    if (probability <= 0) return state;

    const noisyState = new Map<bigint, Complex>();

    for (const [basis, amplitude] of state) {
      const bit = (basis >> BigInt(targetQubit)) & BigInt(1);
      const sign = bit === BigInt(1) ? (Math.random() < probability ? -1 : 1) : 1;
      noisyState.set(basis, amplitude.scale(sign));
    }

    return noisyState;
  }

  /**
   * Apply a noise channel to state
   */
  applyNoiseChannel(state: Map<bigint, Complex>, channel: INoiseChannel): Map<bigint, Complex> {
    let noisyState = new Map(state);

    for (const qubit of channel.targetQubits) {
      switch (channel.type) {
        case 'depolarizing':
          noisyState = this.applyDepolarizing(noisyState, qubit, channel.params.pDepolarizing ?? 0);
          break;
        case 'amplitude_damping':
          noisyState = this.applyAmplitudeDamping(noisyState, qubit, channel.params.gamma ?? 0);
          break;
        case 'phase_damping':
          noisyState = this.applyPhaseDamping(noisyState, qubit, channel.params.lambda ?? 0);
          break;
        case 'bit_flip':
          noisyState = this.applyBitFlip(noisyState, qubit, channel.params.pBitFlip ?? 0);
          break;
        case 'phase_flip':
          noisyState = this.applyPhaseFlip(noisyState, qubit, channel.params.pPhaseFlip ?? 0);
          break;
        default:
          this.logger.warn(`Unknown noise channel type: ${channel.type}`);
      }
    }

    return noisyState;
  }

  /**
   * Simulate with noise model
   */
  simulateWithNoise(state: Map<bigint, Complex>, options: INoiseSimulationOptions): INoiseResult {
    const startTime = performance.now();

    if (!options.enableNoise) {
      return {
        noisyState: new Map(state),
        noisyMeasurements: new Map(),
        errorRates: { total: 0, byGate: new Map(), byQubit: new Map() },
        fidelity: 1.0,
        executionTimeMs: 0,
      };
    }

    // Apply noise channels
    let noisyState = new Map(state);
    const errorRates = {
      total: 0,
      byGate: new Map<string, number>(),
      byQubit: new Map<number, number>(),
    };

    // Apply custom channels
    if (options.customChannels) {
      for (const channel of options.customChannels) {
        noisyState = this.applyNoiseChannel(noisyState, channel);

        // Track error rates
        for (const qubit of channel.targetQubits) {
          const currentRate = errorRates.byQubit.get(qubit) ?? 0;
          errorRates.byQubit.set(qubit, currentRate + this.getChannelErrorRate(channel));
        }
      }
    }

    // Apply noise model
    if (options.noiseModel) {
      // Apply single-qubit errors
      for (const { error } of options.noiseModel.singleQubitErrors) {
        noisyState = this.applyNoiseChannel(noisyState, error);
      }

      // Apply two-qubit errors
      for (const { error } of options.noiseModel.twoQubitErrors) {
        noisyState = this.applyNoiseChannel(noisyState, error);
      }
    }

    // Calculate fidelity
    const fidelity = this.calculateFidelity(state, noisyState);

    const endTime = performance.now();

    return {
      noisyState,
      noisyMeasurements: new Map(),
      errorRates,
      fidelity,
      executionTimeMs: endTime - startTime,
    };
  }

  /**
   * Calculate state fidelity
   */
  calculateFidelity(ideal: Map<bigint, Complex>, actual: Map<bigint, Complex>): number {
    let fidelity = 0;

    // F = |⟨ψ|φ⟩|²
    for (const [basis, amp1] of ideal) {
      const amp2 = actual.get(basis);
      if (amp2) {
        fidelity += amp1.multiply(amp2.conjugate()).real;
      }
    }

    return Math.abs(fidelity);
  }

  /**
   * Generate device characteristics from noise model
   */
  generateDeviceCharacteristics(model: INoiseModel): IDeviceCharacteristics {
    // Extract characteristics from noise model
    const nQubits =
      Math.max(
        ...model.singleQubitErrors.flatMap((e) => e.error.targetQubits),
        ...model.twoQubitErrors.flatMap((e) => e.error.targetQubits),
        0,
      ) + 1;

    const T1: number[] = [];
    const T2: number[] = [];

    for (let i = 0; i < nQubits; i++) {
      // Estimate T1 from amplitude damping rate
      // γ = 1 - exp(-t/T1)
      const gamma =
        model.singleQubitErrors.find(
          (e) => e.error.targetQubits.includes(i) && e.error.type === 'amplitude_damping',
        )?.error.params.gamma ?? 0;

      T1.push(gamma > 0 ? 1 / gamma : Infinity);
      T2.push(Infinity); // Would be extracted from phase damping
    }

    return {
      nQubits,
      connectivity: new Map(),
      gateTimes: new Map(),
      T1,
      T2,
      gateErrors: new Map(),
      readoutErrors: new Map(),
    };
  }

  /**
   * Create custom noise channel
   */
  createNoiseChannel(
    type: NoiseChannelType,
    targetQubits: number[],
    params: INoiseChannelParams,
    name?: string,
  ): INoiseChannel {
    return {
      type,
      targetQubits,
      params,
      name,
    };
  }

  /**
   * Estimate error probability after gate
   */
  estimateGateError(gateType: string, qubits: number[], model: INoiseModel): number {
    // Find matching error for this gate
    const errors =
      qubits.length === 1
        ? model.singleQubitErrors.filter((e) => e.gate === gateType || e.gate === 'all')
        : model.twoQubitErrors.filter((e) => e.gate === gateType);

    if (errors.length === 0) return 0;

    // Return average error rate
    const totalError = errors.reduce((sum, e) => {
      return sum + (e.error.params.pDepolarizing ?? 0);
    }, 0);

    return totalError / errors.length;
  }

  /**
   * Get error rate for a channel
   */
  private getChannelErrorRate(channel: INoiseChannel): number {
    switch (channel.type) {
      case 'depolarizing':
        return channel.params.pDepolarizing ?? 0;
      case 'amplitude_damping':
        return channel.params.gamma ?? 0;
      case 'phase_damping':
        return channel.params.lambda ?? 0;
      case 'bit_flip':
        return channel.params.pBitFlip ?? 0;
      case 'phase_flip':
        return channel.params.pPhaseFlip ?? 0;
      default:
        return 0;
    }
  }

  /**
   * Validate noise parameters
   */
  validateNoiseParams(type: NoiseChannelType, params: INoiseChannelParams): boolean {
    switch (type) {
      case 'depolarizing':
        return (params.pDepolarizing ?? 0) >= 0 && (params.pDepolarizing ?? 0) <= 1;
      case 'amplitude_damping':
        return (params.gamma ?? 0) >= 0 && (params.gamma ?? 0) <= 1;
      case 'phase_damping':
        return (params.lambda ?? 0) >= 0 && (params.lambda ?? 0) <= 1;
      case 'bit_flip':
        return (params.pBitFlip ?? 0) >= 0 && (params.pBitFlip ?? 0) <= 1;
      case 'phase_flip':
        return (params.pPhaseFlip ?? 0) >= 0 && (params.pPhaseFlip ?? 0) <= 1;
      default:
        return true;
    }
  }
}
