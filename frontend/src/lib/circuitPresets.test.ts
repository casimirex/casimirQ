import { describe, it, expect } from 'vitest';
import { CIRCUIT_PRESETS } from './circuitPresets';

describe('circuit presets', () => {
  it('exposes well-formed presets', () => {
    expect(CIRCUIT_PRESETS.length).toBeGreaterThan(0);
    for (const preset of CIRCUIT_PRESETS) {
      expect(preset.numQubits).toBeGreaterThan(0);
      // Every operation targets valid qubit indices.
      for (const op of preset.operations) {
        expect(op.gate).toBeTruthy();
        expect(op.targets.length).toBeGreaterThan(0);
        for (const q of op.targets) {
          expect(q).toBeGreaterThanOrEqual(0);
          expect(q).toBeLessThan(preset.numQubits);
        }
      }
    }
  });

  it('builds the Bell state as H then CNOT', () => {
    const bell = CIRCUIT_PRESETS.find((p) => p.id === 'bell')!;
    expect(bell.numQubits).toBe(2);
    expect(bell.operations).toEqual([
      { gate: 'h', targets: [0] },
      { gate: 'cnot', targets: [0, 1] },
    ]);
  });

  it('builds GHZ states with a CNOT ladder of n-1 entangling gates', () => {
    const ghz3 = CIRCUIT_PRESETS.find((p) => p.id === 'ghz3')!;
    const cnots = ghz3.operations.filter((o) => o.gate === 'cnot');
    expect(cnots).toHaveLength(2);
    expect(ghz3.operations[0]).toEqual({ gate: 'h', targets: [0] });
  });
});
