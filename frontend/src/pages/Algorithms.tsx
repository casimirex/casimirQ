/**
 * Algorithms Page
 *
 * Library of the quantum algorithms the backend can execute. Each card runs the
 * real `/algorithms/<slug>` endpoint via a parameter modal and shows the result.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Play, AlertCircle } from 'lucide-react';
import { useAlgorithms } from '@/api/hooks/useAlgorithms';
import { ALGORITHM_CATALOG, CATEGORY_LABELS, type AlgorithmSpec } from '@/lib/algorithmCatalog';
import { AlgorithmRunner } from '@/components/algorithms/AlgorithmRunner';
import type { AlgorithmCategory } from '@/types';

const CATEGORY_FILTERS: Array<'all' | AlgorithmCategory> = [
  'all',
  'fundamental',
  'search',
  'optimization',
  'cryptography',
];

export function Algorithms() {
  const [category, setCategory] = useState<'all' | AlgorithmCategory>('all');
  const [active, setActive] = useState<AlgorithmSpec | null>(null);

  // Availability comes from the backend so we only offer algorithms it can run.
  const { data, isError } = useAlgorithms();
  const availableNames = useMemo(
    () => new Set((data?.algorithms ?? []).map((a) => a.name)),
    [data],
  );
  const backendReady = data !== undefined;

  const visible = ALGORITHM_CATALOG.filter(
    (a) => category === 'all' || a.category === category,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Quantum Algorithms</h1>
        <p className="mt-1 text-muted-foreground">
          Run real quantum algorithms on the simulation engines and inspect their results.
        </p>
      </div>

      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Couldn’t reach the algorithms service. You can still browse the catalog below.
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((cat) => (
          <Button
            key={cat}
            variant={cat === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(cat)}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Algorithm grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visible.map((algo) => {
          const Icon = algo.icon;
          // Once the backend has responded, disable anything it doesn't list.
          const runnable = !backendReady || availableNames.has(algo.name);
          return (
            <Card key={algo.slug} className="glass transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full bg-accent px-2 py-1 text-xs text-muted-foreground">
                    {CATEGORY_LABELS[algo.category]}
                  </span>
                </div>
                <CardTitle className="mt-3 text-lg">{algo.name}</CardTitle>
                <CardDescription>{algo.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Complexity: {algo.complexity}</span>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={!runnable}
                  leftIcon={<Play className="h-4 w-4" />}
                  onClick={() => setActive(algo)}
                >
                  {runnable ? 'Run' : 'Unavailable'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {active && <AlgorithmRunner spec={active} onClose={() => setActive(null)} />}
    </div>
  );
}
