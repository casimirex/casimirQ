/**
 * Transpiler tests.
 *
 * The core guarantee is *equivalence*: a transpiled circuit must produce the
 * same measurement distribution as the original. Each case transpiles a circuit,
 * checks it is in the native basis, and compares statevector probabilities
 * against the original — so any wrong decomposition is caught numerically.
 */

import { TranspilerService, NATIVE_BASIS } from '../transpiler.service';
import {
  SimulationRunnerService,
  CircuitOperationSpec,
} from '../../api/services/simulation-runner.service';
import { SimulationEnginesService } from '../../simulation-engines/simulation-engines.service';
import { StatevectorEngine } from '../../simulation-engines/engines/statevector-engine/statevector-engine';
import { MPSEngine } from '../../simulation-engines/engines/mps-engine/mps-engine';
import { CliffordEngine } from '../../simulation-engines/engines/clifford-engine/clifford-engine';

describe('TranspilerService', () => {
  let runner: SimulationRunnerService;
  let transpiler: TranspilerService;

  beforeEach(() => {
    const engines = new SimulationEnginesService(
      new StatevectorEngine(),
      new MPSEngine(),
      new CliffordEngine(),
    );
    runner = new SimulationRunnerService(engines);
    transpiler = new TranspilerService(runner);
  });

  function probabilities(
    numQubits: number,
    operations: CircuitOperationSpec[],
  ): Record<string, number> {
    return runner.run({ numQubits, operations }, { engine: 'statevector', shots: 1 }).results
      .probabilities;
  }

  /** Assert the transpiled circuit measures identically to the original. */
  function assertEquivalent(numQubits: number, operations: CircuitOperationSpec[]) {
    const result = transpiler.transpile({ numQubits, operations });
    const before = probabilities(numQubits, operations);
    const after = probabilities(numQubits, result.operations);
    const states = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const s of states) {
      expect(after[s] ?? 0).toBeCloseTo(before[s] ?? 0, 6);
    }
    return result;
  }

  function isNative(result: { operations: CircuitOperationSpec[] }): boolean {
    return result.operations.every((op) => NATIVE_BASIS.includes(op.gate));
  }

  it('transpiles a Bell state to native gates, preserving the distribution', () => {
    const result = assertEquivalent(2, [
      { gate: 'h', targets: [0] },
      { gate: 'cnot', targets: [0, 1] },
    ]);
    expect(result.fullyNative).toBe(true);
    expect(isNative(result)).toBe(true);
    expect(result.unsupported).toEqual([]);
  });

  it('decomposes every single-qubit gate correctly (via H·G·H)', () => {
    // Sandwiching in Hadamards turns hidden phases into measurable probabilities,
    // so this catches phase errors in the ZYZ decomposition.
    for (const gate of ['x', 'y', 'z', 'h', 's', 'sdg', 't', 'tdg']) {
      const result = assertEquivalent(1, [
        { gate: 'h', targets: [0] },
        { gate, targets: [0] },
        { gate: 'h', targets: [0] },
      ]);
      expect(isNative(result)).toBe(true);
    }
  });

  it('decomposes rotations', () => {
    assertEquivalent(1, [{ gate: 'rx', targets: [0], params: [0.7] }]);
    assertEquivalent(1, [{ gate: 'ry', targets: [0], params: [1.1] }]);
    assertEquivalent(1, [
      { gate: 'h', targets: [0] },
      { gate: 'rz', targets: [0], params: [0.9] },
      { gate: 'h', targets: [0] },
    ]);
  });

  it('decomposes SWAP', () => {
    const result = assertEquivalent(2, [
      { gate: 'x', targets: [0] },
      { gate: 'swap', targets: [0, 1] },
    ]);
    expect(isNative(result)).toBe(true);
  });

  it('decomposes CZ', () => {
    const result = assertEquivalent(2, [
      { gate: 'h', targets: [0] },
      { gate: 'h', targets: [1] },
      { gate: 'cz', targets: [0, 1] },
      { gate: 'h', targets: [1] },
    ]);
    expect(isNative(result)).toBe(true);
  });

  it('decomposes the Toffoli gate', () => {
    for (const [a, b] of [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]) {
      const prep: CircuitOperationSpec[] = [];
      if (a) prep.push({ gate: 'x', targets: [0] });
      if (b) prep.push({ gate: 'x', targets: [1] });
      const result = assertEquivalent(3, [...prep, { gate: 'ccx', targets: [0, 1, 2] }]);
      expect(isNative(result)).toBe(true);
    }
  });

  it('flags gates it cannot decompose but keeps the circuit runnable', () => {
    // Controlled-phase is not yet supported; it should pass through and be flagged.
    const result = transpiler.transpile({
      numQubits: 2,
      operations: [
        { gate: 'h', targets: [0] },
        { gate: 'cp', targets: [0, 1], params: [0.5] },
      ],
    });
    expect(result.fullyNative).toBe(false);
    expect(result.unsupported.length).toBeGreaterThan(0);
  });
});
