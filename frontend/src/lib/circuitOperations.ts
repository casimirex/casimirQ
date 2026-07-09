/**
 * Circuit operation helpers
 *
 * Maps gates placed on the builder canvas into the operation spec expected by
 * the backend simulate endpoint (`POST /circuits/:id/simulate`).
 *
 * The current builder is a simple sequential palette without qubit lanes, so
 * qubits are assigned deterministically from a gate's placement order:
 *  - single-qubit gates target qubit `seq % numQubits`
 *  - two-qubit gates use control `seq % numQubits`, target `(control + 1) % numQubits`
 * Rotation gates receive a default angle when none is supplied.
 */

import type { SimulationOperation } from '@/types';

export interface GateSpec {
  /** Palette id (also the gate name sent to the backend). */
  type: string;
  arity: 1 | 2;
  hasParam: boolean;
  defaultParam?: number;
}

export const GATE_SPECS: Record<string, GateSpec> = {
  h: { type: 'h', arity: 1, hasParam: false },
  x: { type: 'x', arity: 1, hasParam: false },
  y: { type: 'y', arity: 1, hasParam: false },
  z: { type: 'z', arity: 1, hasParam: false },
  s: { type: 's', arity: 1, hasParam: false },
  t: { type: 't', arity: 1, hasParam: false },
  cnot: { type: 'cnot', arity: 2, hasParam: false },
  rx: { type: 'rx', arity: 1, hasParam: true, defaultParam: Math.PI / 2 },
  ry: { type: 'ry', arity: 1, hasParam: true, defaultParam: Math.PI / 2 },
  rz: { type: 'rz', arity: 1, hasParam: true, defaultParam: Math.PI / 2 },
};

/**
 * Assign qubits (and default params) to a gate placed at sequence position
 * `seq`. Returns null if the gate cannot be placed (unknown gate, or a
 * two-qubit gate on a single-qubit circuit).
 */
export function assignGate(
  type: string,
  seq: number,
  numQubits: number,
): SimulationOperation | null {
  const spec = GATE_SPECS[type];
  if (!spec || numQubits < 1) {
    return null;
  }

  if (spec.arity === 2) {
    if (numQubits < 2) {
      return null;
    }
    const control = seq % numQubits;
    const target = (control + 1) % numQubits;
    return { gate: type, targets: [control, target] };
  }

  const qubit = seq % numQubits;
  if (spec.hasParam) {
    return { gate: type, targets: [qubit], params: [spec.defaultParam ?? Math.PI / 2] };
  }
  return { gate: type, targets: [qubit] };
}

/** Reverse aliases: backend/stored gate names -> builder palette ids. */
const PALETTE_ALIASES: Record<string, string> = {
  cx: 'cnot',
  toffoli: 'ccx',
  ccnot: 'ccx',
};

/**
 * Map stored circuit operations back to the ordered palette gate types used to
 * rebuild the builder canvas when loading a saved circuit.
 */
export function operationsToGateTypes(
  operations: Array<{ gate: string }>,
): string[] {
  return operations.map((op) => {
    const gate = op.gate.toLowerCase();
    return PALETTE_ALIASES[gate] ?? gate;
  });
}

/**
 * Convert an ordered list of placed gate types into backend operations,
 * dropping any that cannot be placed on the given circuit.
 *
 * Qubits are assigned per gate-category sequence (single-qubit gates and
 * two-qubit gates are counted independently) so that common patterns map to
 * their textbook circuits: `[h, cnot]` -> Bell state, `[h, cnot, cnot]` -> GHZ.
 */
export function gatesToOperations(
  gateTypes: string[],
  numQubits: number,
): SimulationOperation[] {
  const operations: SimulationOperation[] = [];
  let singleSeq = 0;
  let twoSeq = 0;

  for (const type of gateTypes) {
    const spec = GATE_SPECS[type];
    if (!spec) {
      continue;
    }
    const seq = spec.arity === 2 ? twoSeq : singleSeq;
    const op = assignGate(type, seq, numQubits);
    if (op) {
      operations.push(op);
      if (spec.arity === 2) {
        twoSeq += 1;
      } else {
        singleSeq += 1;
      }
    }
  }

  return operations;
}
