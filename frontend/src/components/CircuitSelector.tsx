/**
 * Circuit selector — pick a built-in preset or one of your saved circuits.
 * Reports the resolved circuit (name, qubits, operations) to the parent, or
 * null while a saved circuit is still loading.
 */

import { useEffect, useState } from 'react';
import { useCircuits, useCircuit } from '@/api/hooks/useCircuits';
import { CIRCUIT_PRESETS } from '@/lib/circuitPresets';
import type { SimulationOperation } from '@/types';

export interface ResolvedCircuit {
  name: string;
  numQubits: number;
  operations: SimulationOperation[];
}

interface CircuitSelectorProps {
  onChange: (circuit: ResolvedCircuit | null) => void;
  label?: string;
}

export function CircuitSelector({ onChange, label = 'Circuit' }: CircuitSelectorProps) {
  const [selected, setSelected] = useState<string>('preset:bell');
  const { data: circuitList } = useCircuits(1, 50);

  const savedId = selected.startsWith('saved:') ? selected.slice('saved:'.length) : null;
  const { data: savedCircuit } = useCircuit(savedId);

  useEffect(() => {
    if (selected.startsWith('preset:')) {
      const preset = CIRCUIT_PRESETS.find((p) => `preset:${p.id}` === selected);
      onChange(
        preset
          ? { name: preset.label, numQubits: preset.numQubits, operations: preset.operations }
          : null,
      );
    } else if (savedCircuit) {
      onChange({
        name: savedCircuit.name,
        numQubits: savedCircuit.numQubits,
        operations: savedCircuit.operations,
      });
    } else {
      onChange(null); // saved circuit still loading
    }
  }, [selected, savedCircuit, onChange]);

  const saved = circuitList?.circuits ?? [];

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <select
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <optgroup label="Presets">
          {CIRCUIT_PRESETS.map((p) => (
            <option key={p.id} value={`preset:${p.id}`}>
              {p.label}
            </option>
          ))}
        </optgroup>
        {saved.length > 0 && (
          <optgroup label="Your circuits">
            {saved.map((c) => (
              <option key={c.id} value={`saved:${c.id}`}>
                {c.name} ({c.numQubits}q)
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}
