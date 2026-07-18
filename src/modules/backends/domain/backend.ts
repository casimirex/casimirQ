/**
 * Backend port.
 *
 * A Backend is a target a circuit can run on. Local simulators, an emulated
 * noisy device, and (in future) real cloud QPUs all implement this one
 * interface, so selecting where a circuit runs is a matter of choosing a
 * backend id — nothing else about the request changes. This is the seam that
 * makes real hardware pluggable.
 */

import { CircuitSpec } from '../../api/services/simulation-runner.service';
import { NoiseSpec } from '../../simulation-engines/engines/density-matrix-engine/density-matrix-engine';

/** How a backend executes circuits. */
export type BackendType =
  /** Exact, classical simulation. */
  | 'simulator'
  /** Local simulation dressed up to mimic a real device (noise, native gates). */
  | 'hardware-emulator'
  /** A real quantum processor reached over the network. */
  | 'hardware';

/** What a backend can run. */
export interface BackendCapabilities {
  /** Maximum number of qubits. */
  maxQubits: number;
  /** Gate set the backend executes natively (others require transpilation). */
  nativeGates: string[];
  /** Whether the backend models noise. */
  supportsNoise: boolean;
  /** Qubit connectivity. */
  connectivity: 'all-to-all' | 'linear';
  /** False only for a real quantum processor. */
  simulated: boolean;
}

/** Options for a backend run. */
export interface BackendRunOptions {
  shots?: number;
  seed?: number;
  /** Noise channels, for backends that support them. */
  noise?: NoiseSpec[];
}

/** Normalized result returned by every backend. */
export interface BackendRunResult {
  backendId: string;
  numQubits: number;
  shots: number;
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  metadata: {
    executionTimeMs: number;
    /** Fraction of operations already in the backend's native gate set. */
    nativeGateFraction?: number;
    [key: string]: unknown;
  };
}

/** The common interface all execution targets implement. */
export abstract class Backend {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: BackendType;
  abstract readonly description: string;
  abstract readonly capabilities: BackendCapabilities;

  /** Whether the backend can currently accept work (e.g. credentials present). */
  abstract isAvailable(): boolean;

  /** Execute a circuit and return a normalized result. */
  abstract run(spec: CircuitSpec, options: BackendRunOptions): Promise<BackendRunResult>;

  /** Fraction of the circuit's operations already in the native gate set. */
  protected nativeGateFraction(spec: CircuitSpec): number {
    const ops = spec.operations ?? [];
    if (ops.length === 0) return 1;
    const native = new Set(this.capabilities.nativeGates);
    const inNative = ops.filter((op) => native.has(op.gate.toLowerCase())).length;
    return inNative / ops.length;
  }
}

/** DI token for the array of registered backends. */
export const BACKENDS = Symbol('BACKENDS');
