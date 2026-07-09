/**
 * Dense Statevector Engine
 *
 * Simulates quantum circuits using dense statevector representation.
 * Stores amplitudes as a sparse map for efficiency.
 *
 * Supports up to 20+ qubits (dense) and uses BigInt for state indices.
 */

import { Injectable } from '@nestjs/common';
import {
  ISimulationEngine,
  ISimulationResult,
  ISimulationOptions,
  IResourceEstimate,
  IMeasurementOutcome,
} from '../../interfaces/simulation-engine.interface';
import { Circuit, IGateOperation } from '../../../circuit-engine/circuit';
import { Complex } from '../../../../common/utils/complex';
import { Matrix } from '../../../../common/utils/matrix';

type SparseStatevector = Map<bigint, Complex>;

@Injectable()
export class StatevectorEngine implements ISimulationEngine {
  readonly name = 'Statevector';
  readonly maxQubits = 28;

  supports(circuit: Circuit): boolean {
    if (circuit.numQubits > this.maxQubits) return false;
    for (const op of circuit.operations) {
      if (op.gate.type !== 'measure' && op.gate.type !== 'barrier') {
        if (!op.gate.isUnitary()) return false;
      }
    }
    return true;
  }

  estimateResources(circuit: Circuit): IResourceEstimate {
    const n = circuit.numQubits;
    const dim = BigInt(1) << BigInt(n);
    const memoryBytes = Number(dim) * 16;
    const gateCount = circuit.gateCount();
    const timePerGate = n <= 10 ? 1 : n <= 15 ? 10 : n <= 20 ? 100 : 1000;

    let canSimulate = true;
    let reason: string | undefined;

    if (n > this.maxQubits) {
      canSimulate = false;
      reason = `Too many qubits: ${n} > max ${this.maxQubits}`;
    } else if (memoryBytes > 8 * 1024 * 1024 * 1024) {
      canSimulate = false;
      reason = `Memory requirement too high`;
    }

    return { memoryBytes, timeMs: gateCount * timePerGate, canSimulate, reason };
  }

  simulate(circuit: Circuit, options: ISimulationOptions = {}): ISimulationResult {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const numQubits = circuit.numQubits;
    const state = this.initializeState(numQubits);
    const measurements: IMeasurementOutcome[] = [];

    for (const op of circuit.operations) {
      if (op.gate.type === 'measure') {
        for (const qubit of op.targets) {
          measurements.push(this.measure(state, numQubits, qubit, options.seed));
        }
      } else if (op.gate.type !== 'barrier') {
        this.applyGate(state, numQubits, op);
      }
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      statevector: state,
      numQubits,
      measurements: measurements.length > 0 ? measurements : undefined,
      executionTimeMs: endTime - startTime,
      memoryUsageBytes: Math.max(0, endMemory - startMemory),
    };
  }

  private initializeState(numQubits: number): SparseStatevector {
    return new Map<bigint, Complex>([[BigInt(0), new Complex(1, 0)]]);
  }

  private applyGate(state: SparseStatevector, numQubits: number, op: IGateOperation): void {
    const { gate, targets, controls } = op;

    if (controls && controls.length > 0) {
      this.applyControlledGate(state, numQubits, targets, controls, gate.matrix);
    } else if (targets.length === 1) {
      this.applySingleQubitGate(state, numQubits, targets[0], gate.matrix);
    } else if (targets.length === 2) {
      this.applyTwoQubitGate(state, numQubits, targets[0], targets[1], gate.matrix);
    } else if (targets.length === 3) {
      this.applyThreeQubitGate(state, numQubits, targets, gate.matrix);
    } else {
      throw new Error(`Unsupported gate: ${targets.length} targets`);
    }
  }

  private applySingleQubitGate(
    state: SparseStatevector,
    numQubits: number,
    target: number,
    U: Matrix,
  ): void {
    const newState = new Map<bigint, Complex>();

    for (const [idx, amp] of state.entries()) {
      const targetBit = Number((idx >> BigInt(target)) & BigInt(1));

      // |ψ⟩ = a|0⟩ + b|1⟩ where a and b depend on the target bit value
      // Apply U: U|0⟩ = u00|0⟩ + u10|1⟩, U|1⟩ = u01|0⟩ + u11|1⟩

      for (let outBit = 0; outBit < 2; outBit++) {
        const newIdx = this.setBit(idx, target, outBit);
        const u_el = U.get(outBit, targetBit);
        const contribution = amp.multiply(u_el);

        const existing = newState.get(newIdx);
        newState.set(newIdx, existing ? existing.add(contribution) : contribution);
      }
    }

    this.prune(state, newState);
  }

  private applyTwoQubitGate(
    state: SparseStatevector,
    numQubits: number,
    t1: number,
    t2: number,
    U: Matrix,
  ): void {
    const newState = new Map<bigint, Complex>();

    for (const [idx, amp] of state.entries()) {
      const b1 = Number((idx >> BigInt(t1)) & BigInt(1));
      const b2 = Number((idx >> BigInt(t2)) & BigInt(1));
      const inState = b1 * 2 + b2;

      for (let outState = 0; outState < 4; outState++) {
        const out1 = (outState >> 1) & 1;
        const out2 = outState & 1;

        let newIdx = this.setBit(idx, t1, out1);
        newIdx = this.setBit(newIdx, t2, out2);

        const u_el = U.get(outState, inState);
        const contribution = amp.multiply(u_el);

        const existing = newState.get(newIdx);
        newState.set(newIdx, existing ? existing.add(contribution) : contribution);
      }
    }

    this.prune(state, newState);
  }

  private applyThreeQubitGate(
    state: SparseStatevector,
    numQubits: number,
    targets: number[],
    U: Matrix,
  ): void {
    const [t0, t1, t2] = targets;
    const newState = new Map<bigint, Complex>();

    for (const [idx, amp] of state.entries()) {
      const b0 = Number((idx >> BigInt(t0)) & BigInt(1));
      const b1 = Number((idx >> BigInt(t1)) & BigInt(1));
      const b2 = Number((idx >> BigInt(t2)) & BigInt(1));
      const inState = b0 * 4 + b1 * 2 + b2;

      for (let outState = 0; outState < 8; outState++) {
        const out0 = (outState >> 2) & 1;
        const out1 = (outState >> 1) & 1;
        const out2 = outState & 1;

        let newIdx = this.setBit(idx, t0, out0);
        newIdx = this.setBit(newIdx, t1, out1);
        newIdx = this.setBit(newIdx, t2, out2);

        const u_el = U.get(outState, inState);
        const contribution = amp.multiply(u_el);

        const existing = newState.get(newIdx);
        newState.set(newIdx, existing ? existing.add(contribution) : contribution);
      }
    }

    this.prune(state, newState);
  }

  private applyControlledGate(
    state: SparseStatevector,
    numQubits: number,
    targets: number[],
    controls: number[],
    U: Matrix,
  ): void {
    const newState = new Map<bigint, Complex>();

    for (const [idx, amp] of state.entries()) {
      // Check if all controls are |1⟩
      const allActive = controls.every(c => ((idx >> BigInt(c)) & BigInt(1)) === BigInt(1));

      if (!allActive) {
        newState.set(idx, amp);
        continue;
      }

      // Apply gate to targets
      if (targets.length === 1) {
        const target = targets[0];
        const tBit = Number((idx >> BigInt(target)) & BigInt(1));

        for (let outBit = 0; outBit < 2; outBit++) {
          const newIdx = this.setBit(idx, target, outBit);
          const u_el = U.get(outBit, tBit);
          const contribution = amp.multiply(u_el);

          const existing = newState.get(newIdx);
          newState.set(newIdx, existing ? existing.add(contribution) : contribution);
        }
      } else if (targets.length === 2) {
        const [t1, t2] = targets;
        const b1 = Number((idx >> BigInt(t1)) & BigInt(1));
        const b2 = Number((idx >> BigInt(t2)) & BigInt(1));
        const inState = b1 * 2 + b2;

        for (let outState = 0; outState < 4; outState++) {
          const out1 = (outState >> 1) & 1;
          const out2 = outState & 1;

          let newIdx = this.setBit(idx, t1, out1);
          newIdx = this.setBit(newIdx, t2, out2);

          const u_el = U.get(outState, inState);
          const contribution = amp.multiply(u_el);

          const existing = newState.get(newIdx);
          newState.set(newIdx, existing ? existing.add(contribution) : contribution);
        }
      }
    }

    this.prune(state, newState);
  }

  private measure(
    state: SparseStatevector,
    numQubits: number,
    qubit: number,
    seed?: number,
  ): IMeasurementOutcome {
    let p0 = 0;
    let p1 = 0;

    for (const [idx, amp] of state.entries()) {
      const bit = (idx >> BigInt(qubit)) & BigInt(1);
      const prob = amp.magnitudeSquared();
      if (bit === BigInt(0)) p0 += prob;
      else p1 += prob;
    }

    const rnd = seed !== undefined ? this.seededRandom(seed) : Math.random();
    const outcome: 0 | 1 = rnd < p0 ? 0 : 1;
    const prob = outcome === 0 ? p0 : p1;

    // Collapse
    const newState = new Map<bigint, Complex>();
    for (const [idx, amp] of state.entries()) {
      const bit = (idx >> BigInt(qubit)) & BigInt(1);
      if ((bit === BigInt(0) && outcome === 0) || (bit === BigInt(1) && outcome === 1)) {
        newState.set(idx, amp);
      }
    }

    // Normalize
    const norm = Math.sqrt(prob);
    for (const [idx, amp] of newState.entries()) {
      newState.set(idx, amp.scale(1 / norm));
    }

    state.clear();
    for (const [k, v] of newState.entries()) state.set(k, v);

    return { qubit, value: outcome, probability: prob };
  }

  private setBit(idx: bigint, pos: number, val: number): bigint {
    const mask = BigInt(1) << BigInt(pos);
    return (idx & ~mask) | (BigInt(val) << BigInt(pos));
  }

  private prune(oldState: SparseStatevector, newState: SparseStatevector): void {
    const TOL = 1e-15;
    oldState.clear();
    for (const [k, v] of newState.entries()) {
      if (v.magnitude() > TOL) oldState.set(k, v);
    }
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  getProbability(state: SparseStatevector, basis: bigint): number {
    const amp = state.get(basis);
    return amp ? amp.magnitudeSquared() : 0;
  }

  /**
   * Run simulation (alias for simulate)
   */
  run(circuit: Circuit, options?: ISimulationOptions): ISimulationResult {
    return this.simulate(circuit, options);
  }
}
