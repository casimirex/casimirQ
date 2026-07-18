/**
 * Built-in circuit presets, so the Jobs and Noise pages are usable without
 * first building a circuit. Gate names match what the simulation runner accepts.
 */

import type { SimulationOperation } from '@/types';

export interface CircuitPreset {
  id: string;
  label: string;
  numQubits: number;
  operations: SimulationOperation[];
}

/** GHZ state on n qubits: H then a CNOT ladder. */
function ghz(n: number): SimulationOperation[] {
  const ops: SimulationOperation[] = [{ gate: 'h', targets: [0] }];
  for (let q = 0; q < n - 1; q++) {
    ops.push({ gate: 'cnot', targets: [q, q + 1] });
  }
  return ops;
}

export const CIRCUIT_PRESETS: CircuitPreset[] = [
  { id: 'superposition', label: 'Superposition (1 qubit)', numQubits: 1, operations: [{ gate: 'h', targets: [0] }] },
  { id: 'excited', label: 'Excited |1> (1 qubit)', numQubits: 1, operations: [{ gate: 'x', targets: [0] }] },
  { id: 'bell', label: 'Bell state (2 qubits)', numQubits: 2, operations: ghz(2) },
  { id: 'ghz3', label: 'GHZ state (3 qubits)', numQubits: 3, operations: ghz(3) },
  { id: 'ghz4', label: 'GHZ state (4 qubits)', numQubits: 4, operations: ghz(4) },
];
