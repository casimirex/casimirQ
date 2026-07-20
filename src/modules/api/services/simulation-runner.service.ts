/**
 * Simulation Runner Service
 *
 * Bridges the REST API layer and the quantum simulation engines.
 * Builds an in-memory Circuit from a JSON operation spec, executes it on
 * the auto-selected (or requested) engine, and serializes the resulting
 * statevector into a JSON-friendly response with probabilities and sampled
 * measurement counts.
 */

import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { Circuit } from '../../circuit-engine/circuit';
import { MetricsService } from '../../observability/metrics.service';
import {
  EngineType,
  SimulationEnginesService,
} from '../../simulation-engines/simulation-engines.service';

/** Upper bound on qubits for a synchronous dense simulation request. */
const MAX_QUBITS = 24;
/** Amplitudes below this probability are treated as zero and dropped. */
const AMPLITUDE_EPSILON = 1e-10;

export interface CircuitOperationSpec {
  gate: string;
  targets: number[];
  params?: number[];
}

export interface CircuitSpec {
  numQubits: number;
  operations?: CircuitOperationSpec[];
}

export interface SimulationRunConfig {
  engine?: EngineType;
  method?: EngineType;
  shots?: number;
  seed?: number;
}

export interface SerializedAmplitude {
  state: string;
  re: number;
  im: number;
  probability: number;
}

export interface SimulationRunResult {
  status: 'completed';
  numQubits: number;
  requestedEngine: EngineType;
  shots: number;
  results: {
    statevector: SerializedAmplitude[];
    probabilities: Record<string, number>;
    counts: Record<string, number>;
  };
  metadata: {
    executionTimeMs: number;
    memoryUsageBytes: number;
  };
}

/**
 * Aliases mapping common gate names to the Circuit builder method names.
 */
const GATE_ALIASES: Record<string, string> = {
  cnot: 'cx',
  toffoli: 'ccx',
  ccnot: 'ccx',
  fredkin: 'cswap',
  phase: 'p',
  id: 'i',
  ccz: 'mcz',
};

/**
 * Multi-controlled gates. In the JSON spec their controls are folded into
 * `targets` (like ccx/cswap): every qubit but the last is a control, the last is
 * the target. The builder methods take `(controls[], target)`.
 */
const MULTI_CONTROLLED = new Set(['mcx', 'mcz']);

/** Builder methods that represent applicable gates/operations. */
const SUPPORTED_GATES = new Set([
  'x',
  'y',
  'z',
  'h',
  's',
  'sdg',
  't',
  'tdg',
  'cx',
  'cy',
  'cz',
  'ch',
  'swap',
  'ccx',
  'cswap',
  'rx',
  'ry',
  'rz',
  'p',
  'cp',
  'crx',
  'cry',
  'crz',
  'mcx',
  'mcz',
  'measure',
  'barrier',
]);

@Injectable()
export class SimulationRunnerService {
  constructor(
    private readonly enginesService: SimulationEnginesService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  /**
   * Build an immutable Circuit from a JSON spec, validating gates and targets.
   */
  buildCircuit(spec: CircuitSpec): Circuit {
    const { numQubits, operations = [] } = spec;

    if (!Number.isInteger(numQubits) || numQubits < 1) {
      throw new BadRequestException('numQubits must be a positive integer');
    }
    if (numQubits > MAX_QUBITS) {
      throw new BadRequestException(
        `numQubits ${numQubits} exceeds the synchronous simulation limit of ${MAX_QUBITS}`,
      );
    }
    if (!Array.isArray(operations)) {
      throw new BadRequestException('operations must be an array');
    }

    let builder = Circuit.builder(numQubits);

    operations.forEach((op, index) => {
      if (!op || typeof op.gate !== 'string') {
        throw new BadRequestException(`Operation ${index} is missing a gate name`);
      }

      const gateName = GATE_ALIASES[op.gate.toLowerCase()] ?? op.gate.toLowerCase();
      if (!SUPPORTED_GATES.has(gateName)) {
        throw new BadRequestException(`Unsupported gate "${op.gate}" at operation ${index}`);
      }

      const targets = op.targets ?? [];
      if (!Array.isArray(targets) || targets.length === 0) {
        throw new BadRequestException(`Operation ${index} (${op.gate}) requires targets`);
      }
      for (const q of targets) {
        if (!Number.isInteger(q) || q < 0 || q >= numQubits) {
          throw new BadRequestException(
            `Operation ${index} (${op.gate}) references qubit ${q} outside range 0..${numQubits - 1}`,
          );
        }
      }

      const method = (builder as unknown as Record<string, unknown>)[gateName];
      if (typeof method !== 'function') {
        throw new BadRequestException(`Unsupported gate "${op.gate}" at operation ${index}`);
      }

      const params = op.params ?? [];
      try {
        if (gateName === 'measure' || gateName === 'barrier') {
          // These take a targets array directly rather than spread args.
          builder = (method as (t: number[]) => typeof builder).call(builder, targets);
        } else if (MULTI_CONTROLLED.has(gateName)) {
          // Controls are folded into targets: [...controls, target].
          if (targets.length < 2) {
            throw new BadRequestException(
              `Operation ${index} (${op.gate}) needs at least one control and a target`,
            );
          }
          const controls = targets.slice(0, -1);
          const target = targets[targets.length - 1];
          builder = (method as (c: number[], t: number) => typeof builder).call(
            builder,
            controls,
            target,
          );
        } else {
          builder = (method as (...a: number[]) => typeof builder).call(
            builder,
            ...targets,
            ...params,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new BadRequestException(`Operation ${index} (${op.gate}) failed: ${message}`);
      }
    });

    return builder.build();
  }

  /**
   * Build and simulate a circuit spec, returning a serialized result.
   */
  run(spec: CircuitSpec, config: SimulationRunConfig = {}): SimulationRunResult {
    // Default to the dense statevector engine: it returns exact amplitudes for
    // arbitrary gate sets (the Clifford engine is exact but only for Clifford
    // circuits, and MPS is approximate). Callers can still opt into another
    // engine explicitly via `engine`/`method`. Resolved up front so a failure
    // (bad circuit, unsupported gate) is still attributed to the right engine.
    const requestedEngine: EngineType = config.engine ?? config.method ?? 'statevector';
    const startedAt = Date.now();

    let result: ReturnType<SimulationEnginesService['simulate']>;
    let shots: number;
    try {
      const circuit = this.buildCircuit(spec);
      shots = this.normalizeShots(config.shots);
      result = this.enginesService.simulate(circuit, {
        engine: requestedEngine,
        shots,
        seed: config.seed,
      });
    } catch (err) {
      this.metrics?.recordSimulation(
        requestedEngine,
        spec.numQubits ?? 0,
        (Date.now() - startedAt) / 1000,
        false,
      );
      throw err;
    }

    const numQubits = result.numQubits;
    const statevector: SerializedAmplitude[] = [];
    const probabilities: Record<string, number> = {};

    for (const [state, amplitude] of result.statevector) {
      const probability = amplitude.magnitudeSquared();
      if (probability < AMPLITUDE_EPSILON) {
        continue;
      }
      const bitString = state.toString(2).padStart(numQubits, '0');
      statevector.push({
        state: bitString,
        re: amplitude.real,
        im: amplitude.imag,
        probability,
      });
      probabilities[bitString] = probability;
    }

    statevector.sort((a, b) => (a.state < b.state ? -1 : a.state > b.state ? 1 : 0));

    this.metrics?.recordSimulation(
      requestedEngine,
      numQubits,
      result.executionTimeMs / 1000,
      true,
    );

    return {
      status: 'completed',
      numQubits,
      requestedEngine,
      shots,
      results: {
        statevector,
        probabilities,
        counts: this.sampleCounts(probabilities, shots, config.seed),
      },
      metadata: {
        executionTimeMs: result.executionTimeMs,
        memoryUsageBytes: result.memoryUsageBytes,
      },
    };
  }

  private normalizeShots(shots?: number): number {
    if (shots === undefined) {
      return 1024;
    }
    if (!Number.isInteger(shots) || shots < 0) {
      throw new BadRequestException('shots must be a non-negative integer');
    }
    return Math.min(shots, 1_000_000);
  }

  /**
   * Draw `shots` samples from the measurement distribution, returning a map of
   * bitstring -> count. Deterministic when a seed is provided.
   */
  private sampleCounts(
    probabilities: Record<string, number>,
    shots: number,
    seed?: number,
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    if (shots === 0) {
      return counts;
    }

    const entries = Object.entries(probabilities);
    if (entries.length === 0) {
      return counts;
    }

    // Build a cumulative distribution.
    const total = entries.reduce((sum, [, p]) => sum + p, 0) || 1;
    const cumulative: Array<{ bitString: string; ceiling: number }> = [];
    let running = 0;
    for (const [bitString, p] of entries) {
      running += p / total;
      cumulative.push({ bitString, ceiling: running });
    }

    const rng = this.makeRng(seed);
    for (let i = 0; i < shots; i++) {
      const r = rng();
      const hit = cumulative.find((c) => r <= c.ceiling) ?? cumulative[cumulative.length - 1];
      counts[hit.bitString] = (counts[hit.bitString] ?? 0) + 1;
    }

    return counts;
  }

  /**
   * mulberry32 PRNG. Seeded for reproducibility; falls back to Math.random.
   */
  private makeRng(seed?: number): () => number {
    if (seed === undefined) {
      return Math.random;
    }
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
