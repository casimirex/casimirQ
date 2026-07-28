import { describe, it, expect } from 'vitest';
import {
  assignGate,
  gatesToOperations,
  operationsToGateTypes,
  placementsToOperations,
  operationsToPlacements,
  isPlaceable,
  type GatePlacement,
} from './circuitOperations';

describe('assignGate', () => {
  it('assigns single-qubit gates round-robin across qubits', () => {
    expect(assignGate('h', 0, 3)).toEqual({ gate: 'h', targets: [0] });
    expect(assignGate('x', 1, 3)).toEqual({ gate: 'x', targets: [1] });
    expect(assignGate('z', 3, 3)).toEqual({ gate: 'z', targets: [0] });
  });

  it('adds a default angle to rotation gates', () => {
    expect(assignGate('rx', 0, 2)).toEqual({
      gate: 'rx',
      targets: [0],
      params: [Math.PI / 2],
    });
  });

  it('assigns control/target for two-qubit gates', () => {
    expect(assignGate('cnot', 0, 3)).toEqual({ gate: 'cnot', targets: [0, 1] });
    expect(assignGate('cnot', 2, 3)).toEqual({ gate: 'cnot', targets: [2, 0] });
  });

  it('returns null for a two-qubit gate on a single-qubit circuit', () => {
    expect(assignGate('cnot', 0, 1)).toBeNull();
  });

  it('returns null for unknown gates', () => {
    expect(assignGate('bogus', 0, 2)).toBeNull();
  });
});

describe('gatesToOperations', () => {
  it('maps [h, cnot] to the canonical Bell state', () => {
    const ops = gatesToOperations(['h', 'cnot'], 2);
    expect(ops).toEqual([
      { gate: 'h', targets: [0] },
      { gate: 'cnot', targets: [0, 1] },
    ]);
  });

  it('maps [h, cnot, cnot] to a GHZ chain', () => {
    const ops = gatesToOperations(['h', 'cnot', 'cnot'], 3);
    expect(ops).toEqual([
      { gate: 'h', targets: [0] },
      { gate: 'cnot', targets: [0, 1] },
      { gate: 'cnot', targets: [1, 2] },
    ]);
  });

  it('counts single- and two-qubit gates independently', () => {
    const ops = gatesToOperations(['h', 'h', 'cnot'], 2);
    expect(ops).toEqual([
      { gate: 'h', targets: [0] },
      { gate: 'h', targets: [1] },
      { gate: 'cnot', targets: [0, 1] },
    ]);
  });

  it('drops gates that cannot be placed', () => {
    const ops = gatesToOperations(['h', 'cnot', 'bogus'], 1);
    // cnot dropped (needs 2 qubits), bogus dropped (unknown)
    expect(ops).toEqual([{ gate: 'h', targets: [0] }]);
  });
});

describe('operationsToGateTypes', () => {
  it('maps stored operations back to palette gate types', () => {
    const types = operationsToGateTypes([
      { gate: 'h' },
      { gate: 'cnot' },
      { gate: 'RX' },
    ]);
    expect(types).toEqual(['h', 'cnot', 'rx']);
  });

  it('normalizes backend aliases (cx -> cnot)', () => {
    expect(operationsToGateTypes([{ gate: 'cx' }])).toEqual(['cnot']);
  });

  it('round-trips with gatesToOperations for a Bell circuit', () => {
    const ops = gatesToOperations(['h', 'cnot'], 2);
    const types = operationsToGateTypes(ops);
    expect(gatesToOperations(types, 2)).toEqual(ops);
  });
});

const P = (over: Partial<GatePlacement>): GatePlacement => ({
  id: 'p',
  gateType: 'h',
  column: 0,
  wires: [0],
  ...over,
});

describe('isPlaceable', () => {
  it('accepts a single-qubit gate on an in-range wire', () => {
    expect(isPlaceable(P({ gateType: 'h', wires: [1] }), 2)).toBe(true);
  });

  it('rejects a wire outside the circuit', () => {
    expect(isPlaceable(P({ wires: [3] }), 2)).toBe(false);
  });

  it('requires distinct, in-range wires for two-qubit gates', () => {
    expect(isPlaceable(P({ gateType: 'cnot', wires: [0, 1] }), 2)).toBe(true);
    expect(isPlaceable(P({ gateType: 'cnot', wires: [0, 0] }), 2)).toBe(false); // same wire
    expect(isPlaceable(P({ gateType: 'cnot', wires: [0, 5] }), 2)).toBe(false); // out of range
    expect(isPlaceable(P({ gateType: 'cnot', wires: [0] }), 2)).toBe(false); // wrong wire count
  });

  it('validates three-wire gates (Toffoli, Fredkin)', () => {
    expect(isPlaceable(P({ gateType: 'ccx', wires: [0, 1, 2] }), 3)).toBe(true);
    expect(isPlaceable(P({ gateType: 'cswap', wires: [0, 1, 2] }), 3)).toBe(true);
    expect(isPlaceable(P({ gateType: 'ccx', wires: [0, 1, 1] }), 3)).toBe(false); // repeated wire
    expect(isPlaceable(P({ gateType: 'swap', wires: [0, 1] }), 2)).toBe(true);
  });
});

describe('placementsToOperations', () => {
  it('orders gates by column then top wire', () => {
    const placements: GatePlacement[] = [
      P({ id: 'a', gateType: 'cnot', wires: [0, 1], column: 1 }),
      P({ id: 'b', gateType: 'h', wires: [0], column: 0 }),
    ];
    expect(placementsToOperations(placements, 2)).toEqual([
      { gate: 'h', targets: [0] },
      { gate: 'cnot', targets: [0, 1] },
    ]);
  });

  it('honours explicit wire assignments (control/target, swap, toffoli)', () => {
    expect(
      placementsToOperations([P({ gateType: 'cnot', wires: [2, 0] })], 3),
    ).toEqual([{ gate: 'cnot', targets: [2, 0] }]);
    expect(
      placementsToOperations([P({ gateType: 'swap', wires: [1, 2] })], 3),
    ).toEqual([{ gate: 'swap', targets: [1, 2] }]);
    expect(
      placementsToOperations([P({ gateType: 'ccx', wires: [0, 2, 1] })], 3),
    ).toEqual([{ gate: 'ccx', targets: [0, 2, 1] }]);
  });

  it('attaches params to (controlled) rotation gates', () => {
    expect(
      placementsToOperations([P({ gateType: 'rx', wires: [1], param: 1.25 })], 2),
    ).toEqual([{ gate: 'rx', targets: [1], params: [1.25] }]);
    expect(
      placementsToOperations([P({ gateType: 'crz', wires: [0, 1], param: 0.5 })], 2),
    ).toEqual([{ gate: 'crz', targets: [0, 1], params: [0.5] }]);
  });

  it('drops placements whose wires no longer fit the circuit', () => {
    const placements: GatePlacement[] = [
      P({ id: 'a', gateType: 'h', wires: [0], column: 0 }),
      P({ id: 'b', gateType: 'x', wires: [3], column: 1 }), // wire removed
    ];
    expect(placementsToOperations(placements, 2)).toEqual([{ gate: 'h', targets: [0] }]);
  });
});

describe('operationsToPlacements', () => {
  const id = (i: number) => `g${i}`;

  it('rebuilds placements from stored operations, one column each', () => {
    const placements = operationsToPlacements(
      [
        { gate: 'h', targets: [0] },
        { gate: 'cx', targets: [0, 1] }, // alias -> cnot
        { gate: 'cswap', targets: [0, 1, 2] },
      ],
      id,
    );
    expect(placements).toEqual([
      { id: 'g0', gateType: 'h', column: 0, wires: [0], param: undefined },
      { id: 'g1', gateType: 'cnot', column: 1, wires: [0, 1], param: undefined },
      { id: 'g2', gateType: 'cswap', column: 2, wires: [0, 1, 2], param: undefined },
    ]);
  });

  it('skips operations the builder cannot represent (e.g. barrier)', () => {
    const placements = operationsToPlacements(
      [{ gate: 'h', targets: [0] }, { gate: 'barrier', targets: [0] }],
      id,
    );
    expect(placements.map((p) => p.gateType)).toEqual(['h']);
  });

  it('represents measurement, splitting a multi-qubit measure into one meter per wire', () => {
    expect(placementsToOperations([P({ gateType: 'measure', wires: [1] })], 2)).toEqual([
      { gate: 'measure', targets: [1] },
    ]);
    const pl = operationsToPlacements([{ gate: 'measure', targets: [0, 1] }], id);
    expect(pl.map((p) => ({ gateType: p.gateType, wires: p.wires }))).toEqual([
      { gateType: 'measure', wires: [0] },
      { gateType: 'measure', wires: [1] },
    ]);
  });

  it('round-trips a SWAP + Toffoli circuit through placements', () => {
    const ops = [
      { gate: 'swap', targets: [0, 1] },
      { gate: 'ccx', targets: [0, 1, 2] },
    ];
    const placements = operationsToPlacements(ops, id);
    expect(placementsToOperations(placements, 3)).toEqual(ops);
  });
});
