/**
 * Noise Lab Page
 *
 * Runs a circuit under noise on the density-matrix engine and reports how far
 * the result drifts from ideal — via purity (Tr(ρ²)) and fidelity — plus the
 * measured distribution.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CircuitSelector, type ResolvedCircuit } from '@/components/CircuitSelector';
import { useNoiseSimulation } from '@/api/hooks/useNoise';
import type { NoiseChannelConfig } from '@/types';
import { Play, Plus, Trash2, Activity } from 'lucide-react';

const CHANNEL_TYPES: { value: NoiseChannelConfig['type']; label: string; param: 'p' | 'gamma' | 'lambda' }[] = [
  { value: 'depolarizing', label: 'Depolarizing', param: 'p' },
  { value: 'bit_flip', label: 'Bit flip', param: 'p' },
  { value: 'phase_flip', label: 'Phase flip', param: 'p' },
  { value: 'amplitude_damping', label: 'Amplitude damping', param: 'gamma' },
  { value: 'phase_damping', label: 'Phase damping', param: 'lambda' },
];

function paramName(type: NoiseChannelConfig['type']): 'p' | 'gamma' | 'lambda' {
  return CHANNEL_TYPES.find((c) => c.value === type)?.param ?? 'p';
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function NoiseLab() {
  const [circuit, setCircuit] = useState<ResolvedCircuit | null>(null);
  const [channels, setChannels] = useState<NoiseChannelConfig[]>([
    { type: 'depolarizing', params: { p: 0.1 } },
  ]);
  const [shots, setShots] = useState(2000);
  const run = useNoiseSimulation();

  function updateChannel(i: number, next: NoiseChannelConfig) {
    setChannels((cs) => cs.map((c, idx) => (idx === i ? next : c)));
  }

  function handleRun() {
    if (!circuit) return;
    run.mutate({
      numQubits: circuit.numQubits,
      operations: circuit.operations,
      noise: channels,
      shots,
      computeFidelity: true,
    });
  }

  const result = run.data;
  const probRows = result
    ? Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
    : [];
  const maxProb = probRows.length ? probRows[0][1] : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Noise Lab</h1>
        <p className="mt-1 text-muted-foreground">
          Run a circuit under realistic noise and measure the damage.
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Configure</CardTitle>
          <CardDescription>
            Each channel is applied to every qubit a gate touches, after that gate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <CircuitSelector onChange={setCircuit} />
            <Input
              label="Shots"
              type="number"
              min={1}
              className="w-28"
              value={shots}
              onChange={(e) => setShots(Number(e.target.value) || 1)}
            />
          </div>

          {/* Noise channels */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Noise channels</label>
            {channels.map((ch, i) => {
              const pName = paramName(ch.type);
              return (
                <div key={i} className="flex items-center gap-2">
                  <select
                    className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={ch.type}
                    onChange={(e) => {
                      const type = e.target.value as NoiseChannelConfig['type'];
                      updateChannel(i, { type, params: { [paramName(type)]: 0.1 } });
                    }}
                  >
                    {CHANNEL_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="number"
                    step="0.05"
                    min={0}
                    max={1}
                    aria-label={`${ch.type} ${pName}`}
                    value={ch.params[pName] ?? 0}
                    onChange={(e) =>
                      updateChannel(i, { type: ch.type, params: { [pName]: Number(e.target.value) } })
                    }
                  />
                  <span className="w-14 text-xs text-muted-foreground">{pName}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Remove channel"
                    onClick={() => setChannels((cs) => cs.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() =>
                setChannels((cs) => [...cs, { type: 'depolarizing', params: { p: 0.05 } }])
              }
            >
              Add channel
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleRun}
              disabled={!circuit}
              isLoading={run.isPending}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Run
            </Button>
          </div>

          {run.isError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {(run.error as Error)?.message ?? 'Simulation failed.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Result ({result.numQubits} qubits, {result.engine})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile
                label="Purity"
                value={result.purity.toFixed(3)}
                hint="Tr(ρ²) — 1 is pure, lower is mixed"
              />
              <Tile
                label="Fidelity"
                value={result.fidelity != null ? result.fidelity.toFixed(3) : '—'}
                hint="overlap with the noiseless state"
              />
              <Tile label="Time" value={`${result.executionTimeMs.toFixed(2)} ms`} />
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Measured distribution</div>
              <div className="space-y-1">
                {probRows.map(([state, p]) => (
                  <div key={state} className="flex items-center gap-2">
                    <span className="w-20 font-mono text-sm">|{state}⟩</span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-accent">
                      <div
                        className="h-full rounded bg-primary"
                        style={{ width: `${(p / maxProb) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-sm tabular-nums">
                      {(p * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
