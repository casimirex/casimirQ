/**
 * Backend selector — pick where a circuit runs.
 *
 * Offers "Auto" (the default runner) plus every registered backend; unavailable
 * backends are shown but disabled. Reports the chosen backend id, or null for
 * the default runner. Also surfaces the selected backend's capabilities so the
 * caller can show a hint.
 */

import { useMemo } from 'react';
import { useBackends } from '@/api/hooks/useBackends';
import type { Backend } from '@/types';

interface BackendSelectorProps {
  value: string | null;
  onChange: (backendId: string | null) => void;
  label?: string;
}

export function BackendSelector({ value, onChange, label = 'Target' }: BackendSelectorProps) {
  const { data } = useBackends();
  const backends = useMemo(() => data?.backends ?? [], [data]);
  const selected: Backend | undefined = backends.find((b) => b.id === value);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <select
        className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value ?? 'auto'}
        onChange={(e) => onChange(e.target.value === 'auto' ? null : e.target.value)}
      >
        <option value="auto">Auto (default engine)</option>
        {backends.map((b) => (
          <option key={b.id} value={b.id} disabled={!b.available}>
            {b.name}
            {b.available ? '' : ' — unavailable'}
          </option>
        ))}
      </select>
      {selected && (
        <p className="mt-1 text-xs text-muted-foreground">
          {selected.type} · up to {selected.capabilities.maxQubits} qubits ·{' '}
          {selected.capabilities.supportsNoise ? 'noisy' : 'noiseless'} ·{' '}
          {selected.capabilities.connectivity}
        </p>
      )}
    </div>
  );
}
