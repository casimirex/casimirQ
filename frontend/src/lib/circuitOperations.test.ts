import { describe, it, expect } from 'vitest';
import {
  assignGate,
  gatesToOperations,
  operationsToGateTypes,
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
