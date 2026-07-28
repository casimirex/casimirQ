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

// ---------------------------------------------------------------------------
// Full gate catalogue for the visual builder.
//
// `shape` decides how a gate is placed and drawn, and what its `wires` mean:
//   single     : [q]                — one tile on a wire
//   controlled : [control, target]  — a control dot linked to a target symbol
//   swap       : [a, b]             — two ✕ marks (exchange the wires)
//   cc         : [c1, c2, target]   — two control dots + a target symbol
//   cswap      : [control, a, b]    — a control dot + a ✕/✕ swap
// ---------------------------------------------------------------------------

export type GateShape = 'single' | 'controlled' | 'swap' | 'cc' | 'cswap' | 'measure';
export type GateColorKey = 'h' | 'x' | 'y' | 'z' | 'cnot' | 'meas';

export interface GateDef {
  /** backend gate name (also the palette key) */
  type: string;
  /** label on the palette swatch and on boxed tiles */
  label: string;
  color: GateColorKey;
  shape: GateShape;
  /** how the target of a controlled/cc gate is drawn */
  targetKind?: 'plus' | 'dot' | 'box';
  hasParam?: boolean;
  defaultParam?: number;
  description: string;
}

const HALF_PI = Math.PI / 2;

export const GATE_DEFS: GateDef[] = [
  // single-qubit
  { type: 'h', label: 'H', color: 'h', shape: 'single', description: 'Hadamard' },
  { type: 'x', label: 'X', color: 'x', shape: 'single', description: 'Pauli-X' },
  { type: 'y', label: 'Y', color: 'y', shape: 'single', description: 'Pauli-Y' },
  { type: 'z', label: 'Z', color: 'z', shape: 'single', description: 'Pauli-Z' },
  { type: 's', label: 'S', color: 'h', shape: 'single', description: 'Phase' },
  { type: 'sdg', label: 'S†', color: 'h', shape: 'single', description: 'S-dagger' },
  { type: 't', label: 'T', color: 'h', shape: 'single', description: 'T' },
  { type: 'tdg', label: 'T†', color: 'h', shape: 'single', description: 'T-dagger' },
  { type: 'rx', label: 'Rx', color: 'x', shape: 'single', hasParam: true, defaultParam: HALF_PI, description: 'Rotation X' },
  { type: 'ry', label: 'Ry', color: 'y', shape: 'single', hasParam: true, defaultParam: HALF_PI, description: 'Rotation Y' },
  { type: 'rz', label: 'Rz', color: 'z', shape: 'single', hasParam: true, defaultParam: HALF_PI, description: 'Rotation Z' },
  { type: 'p', label: 'P', color: 'h', shape: 'single', hasParam: true, defaultParam: HALF_PI, description: 'Phase (λ)' },
  // two-qubit controlled
  { type: 'cnot', label: '⊕', color: 'cnot', shape: 'controlled', targetKind: 'plus', description: 'CNOT' },
  { type: 'cz', label: 'Z', color: 'z', shape: 'controlled', targetKind: 'dot', description: 'Controlled-Z' },
  { type: 'cy', label: 'Y', color: 'y', shape: 'controlled', targetKind: 'box', description: 'Controlled-Y' },
  { type: 'ch', label: 'H', color: 'h', shape: 'controlled', targetKind: 'box', description: 'Controlled-H' },
  { type: 'cp', label: 'P', color: 'h', shape: 'controlled', targetKind: 'box', hasParam: true, defaultParam: HALF_PI, description: 'Controlled-Phase' },
  { type: 'crx', label: 'Rx', color: 'x', shape: 'controlled', targetKind: 'box', hasParam: true, defaultParam: HALF_PI, description: 'Controlled-Rx' },
  { type: 'cry', label: 'Ry', color: 'y', shape: 'controlled', targetKind: 'box', hasParam: true, defaultParam: HALF_PI, description: 'Controlled-Ry' },
  { type: 'crz', label: 'Rz', color: 'z', shape: 'controlled', targetKind: 'box', hasParam: true, defaultParam: HALF_PI, description: 'Controlled-Rz' },
  // swap
  { type: 'swap', label: 'SWAP', color: 'cnot', shape: 'swap', description: 'SWAP' },
  // three-qubit
  { type: 'ccx', label: '⊕', color: 'cnot', shape: 'cc', targetKind: 'plus', description: 'Toffoli (CCX)' },
  { type: 'ccz', label: 'Z', color: 'z', shape: 'cc', targetKind: 'dot', description: 'CCZ' },
  { type: 'cswap', label: 'SWAP', color: 'cnot', shape: 'cswap', description: 'Fredkin (CSWAP)' },
  // measurement
  { type: 'measure', label: 'M', color: 'meas', shape: 'measure', description: 'Measure' },
];

const GATE_DEF_MAP: Record<string, GateDef> = Object.fromEntries(
  GATE_DEFS.map((g) => [g.type, g]),
);

/** Look up a gate definition by backend name (via placement aliases). */
export function gateDef(type: string): GateDef | undefined {
  const t = type.toLowerCase();
  return GATE_DEF_MAP[PLACEMENT_ALIASES[t] ?? t];
}

/** How many wires a gate occupies (single/measure=1, controlled/swap=2, cc/cswap=3). */
export function gateWireCount(shape: GateShape): number {
  if (shape === 'single' || shape === 'measure') return 1;
  if (shape === 'controlled' || shape === 'swap') return 2;
  return 3;
}

/** Aliases from stored/backend gate names to builder palette keys. */
const PLACEMENT_ALIASES: Record<string, string> = {
  cx: 'cnot',
  toffoli: 'ccx',
  ccnot: 'ccx',
  fredkin: 'cswap',
};

/**
 * A gate the user has placed on the canvas at an explicit time `column`, on a
 * set of `wires` whose meaning depends on the gate's shape (see GATE_DEFS).
 */
export interface GatePlacement {
  id: string;
  gateType: string;
  /** time column (left-to-right order) */
  column: number;
  /** the wires this gate occupies, in backend target order */
  wires: number[];
  /** rotation/phase angle for parameterised gates */
  param?: number;
}

/** A placement can be simulated iff every wire is valid, distinct, and known. */
export function isPlaceable(p: GatePlacement, numQubits: number): boolean {
  const def = gateDef(p.gateType);
  if (!def || p.wires.length !== gateWireCount(def.shape)) return false;
  if (p.wires.some((w) => w < 0 || w >= numQubits)) return false;
  return new Set(p.wires).size === p.wires.length; // all distinct
}

/**
 * Convert explicitly-placed gates into backend operations, ordered by column
 * (then top wire). Placements that no longer fit the circuit are dropped.
 */
export function placementsToOperations(
  placements: GatePlacement[],
  numQubits: number,
): SimulationOperation[] {
  return placements
    .filter((p) => isPlaceable(p, numQubits))
    .slice()
    .sort((a, b) => a.column - b.column || a.wires[0] - b.wires[0])
    .map((p) => {
      const def = gateDef(p.gateType)!;
      const op: SimulationOperation = { gate: p.gateType, targets: p.wires.slice() };
      if (def.hasParam) op.params = [p.param ?? def.defaultParam ?? HALF_PI];
      return op;
    });
}

/**
 * Rebuild placements from stored operations when loading a saved circuit, one
 * column per operation. Operations the builder can't represent (e.g. measure,
 * barrier, arbitrary mcx/mcz) are skipped — they remain in the saved circuit.
 */
export function operationsToPlacements(
  operations: Array<{ gate: string; targets?: number[]; params?: number[] }>,
  makeId: (i: number) => string,
): GatePlacement[] {
  const out: GatePlacement[] = [];
  operations.forEach((op, i) => {
    const def = gateDef(op.gate);
    if (!def) return;
    const targets = op.targets ?? [];
    // A measurement can name several qubits at once — draw one meter per wire.
    if (def.shape === 'measure') {
      targets.forEach((q, j) =>
        out.push({ id: `${makeId(i)}-${j}`, gateType: 'measure', column: i, wires: [q] }),
      );
      return;
    }
    if (targets.length !== gateWireCount(def.shape)) return;
    out.push({
      id: makeId(i),
      gateType: def.type,
      column: i,
      wires: targets.slice(),
      param: op.params?.[0],
    });
  });
  return out;
}
