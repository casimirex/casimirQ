/**
 * Transpile Page
 *
 * Rewrites a circuit into the native gate basis {rz, ry, cx} and, optionally,
 * routes it onto a device connectivity with SWAPs. Shows the gate-count
 * blow-up that hardware pays for "simple" gates, plus the routing choices
 * (initial layout, final permutation, SWAP count).
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CircuitSelector, type ResolvedCircuit } from '@/components/CircuitSelector';
import { useTranspile } from '@/api/hooks/useTranspile';
import type { Connectivity, LayoutStrategy, RouterStrategy } from '@/types';
import { Play, Layers, Check, X, ArrowRight } from 'lucide-react';

/** '' means "don't route" — plain decomposition only. */
type RouteChoice = '' | Connectivity;

const ROUTE_OPTIONS: { value: RouteChoice; label: string }[] = [
  { value: '', label: 'No routing (decompose only)' },
  { value: 'linear', label: 'Linear  0—1—2—…' },
  { value: 'all-to-all', label: 'All-to-all (no SWAPs needed)' },
];

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function Transpile() {
  const [circuit, setCircuit] = useState<ResolvedCircuit | null>(null);
  const [route, setRoute] = useState<RouteChoice>('linear');
  const [layout, setLayout] = useState<LayoutStrategy>('trivial');
  const [router, setRouter] = useState<RouterStrategy>('greedy');
  const transpile = useTranspile();

  const routing = route !== '';

  function handleRun() {
    if (!circuit) return;
    transpile.mutate({
      numQubits: circuit.numQubits,
      operations: circuit.operations,
      ...(routing ? { connectivity: route, layout, router } : {}),
    });
  }

  const result = transpile.data;

  // Count native operations by gate name for the histogram.
  const gateHistogram = useMemo(() => {
    if (!result) return [] as [string, number][];
    const counts = new Map<string, number>();
    for (const op of result.operations) counts.set(op.gate, (counts.get(op.gate) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [result]);
  const maxGate = gateHistogram.length ? gateHistogram[0][1] : 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transpile</h1>
        <p className="mt-1 text-muted-foreground">
          Rewrite a circuit into the hardware-native basis {'{rz, ry, cx}'} and route it onto a
          device — and watch the gate count grow.
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Configure</CardTitle>
          <CardDescription>
            Decomposition is exact but costs gates; routing adds SWAPs so every two-qubit gate acts
            on coupled qubits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CircuitSelector onChange={setCircuit} />

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Connectivity</label>
              <select
                className={selectClass}
                value={route}
                onChange={(e) => setRoute(e.target.value as RouteChoice)}
              >
                {ROUTE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Initial layout</label>
              <select
                className={selectClass}
                value={layout}
                disabled={!routing}
                onChange={(e) => setLayout(e.target.value as LayoutStrategy)}
              >
                <option value="trivial">Trivial (identity)</option>
                <option value="greedy">Greedy (seat interacting qubits close)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Router</label>
              <select
                className={selectClass}
                value={router}
                disabled={!routing}
                onChange={(e) => setRouter(e.target.value as RouterStrategy)}
              >
                <option value="greedy">Greedy (per-gate)</option>
                <option value="sabre">SABRE (lookahead)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleRun}
              disabled={!circuit}
              isLoading={transpile.isPending}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Transpile
            </Button>
          </div>

          {transpile.isError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {(transpile.error as Error)?.message ?? 'Transpilation failed.'}
            </p>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              Result
            </CardTitle>
            <CardDescription>Native basis: {result.basis.join(', ')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tile
                label="Gate count"
                value={
                  <span className="flex items-center gap-2">
                    {result.originalGateCount}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    {result.transpiledGateCount}
                  </span>
                }
                hint="original → native"
              />
              <Tile
                label="Fully native"
                value={
                  result.fullyNative ? (
                    <span className="flex items-center gap-1 text-green-500">
                      <Check className="h-5 w-5" /> yes
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-destructive">
                      <X className="h-5 w-5" /> no
                    </span>
                  )
                }
                hint={
                  result.unsupported.length
                    ? `unsupported: ${result.unsupported.join(', ')}`
                    : 'every gate decomposed'
                }
              />
              <Tile
                label="SWAPs inserted"
                value={routing ? (result.swapCount ?? 0) : '—'}
                hint={routing ? 'each expands to 3×cx' : 'no routing requested'}
              />
              <Tile
                label="Basis size"
                value={result.basis.length}
                hint="distinct native gate types"
              />
            </div>

            {/* Native gate histogram */}
            <div>
              <div className="mb-2 text-sm font-medium">Native gate breakdown</div>
              <div className="space-y-1">
                {gateHistogram.map(([gate, n]) => (
                  <div key={gate} className="flex items-center gap-2">
                    <span className="w-16 font-mono text-sm">{gate}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-accent">
                      <div
                        className="h-full rounded bg-primary"
                        style={{ width: `${(n / maxGate) * 100}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm tabular-nums">{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Routing layout — only when routed */}
            {routing && result.finalPermutation && (
              <div className="grid gap-4 sm:grid-cols-2">
                <LayoutTable
                  title="Initial layout"
                  hint="logical → physical wire at start"
                  perm={result.initialLayout}
                />
                <LayoutTable
                  title="Final permutation"
                  hint="logical → physical wire after routing"
                  perm={result.finalPermutation}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LayoutTable({ title, hint, perm }: { title: string; hint: string; perm?: number[] }) {
  if (!perm) return null;
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mb-2 text-xs text-muted-foreground">{hint}</div>
      <div className="flex flex-wrap gap-2">
        {perm.map((physical, logical) => (
          <span key={logical} className="rounded bg-accent px-2 py-1 font-mono text-xs">
            q{logical}
            <ArrowRight className="mx-1 inline h-3 w-3" />
            {physical}
          </span>
        ))}
      </div>
    </div>
  );
}
