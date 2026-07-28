/**
 * Circuit Library
 *
 * A read-only reference gallery of the basic building-block circuits from the
 * catalogue, grouped by category. Each entry is a real saved circuit (seeded
 * under the "Library · " name prefix and verified on the engine); "Open in
 * Builder" loads it into the Circuit Builder. Kept separate from the user's own
 * saved circuits.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Library, ArrowRight, Cpu, Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useCircuits } from '@/api/hooks/useCircuits';
import catalog from '@/data/basicCircuits.json';

interface CatalogCircuit {
  key: string;
  cat: number;
  name: string;
  desc: string;
  n: number;
  gates: number;
  savedName: string;
}

export function CircuitLibrary() {
  const { data, isLoading } = useCircuits(1, 500);

  // Join catalogue entries to their persisted circuit ids (by saved name).
  const idByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.circuits ?? []) map.set(c.name, c.id);
    return map;
  }, [data]);

  const circuits = catalog.circuits as CatalogCircuit[];
  const total = circuits.length;
  const available = circuits.filter((c) => idByName.has(c.savedName)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Library className="h-6 w-6 text-primary" />
            Circuit Library
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            The atomic building blocks of quantum computation — {total} verified circuits you can
            open in the builder. Separate from your own saved circuits.
          </p>
        </div>
        <div className="hidden shrink-0 rounded-lg border border-border bg-card px-4 py-2 text-center sm:block">
          <div className="text-2xl font-bold text-primary">{isLoading ? '…' : available}</div>
          <div className="text-xs text-muted-foreground">available now</div>
        </div>
      </div>

      {/* Categories */}
      {catalog.categories.map((cat) => {
        const items = circuits.filter((c) => c.cat === cat.id);
        if (items.length === 0) return null;
        return (
          <section key={cat.id}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="text-lg font-semibold">
                <span className="mr-2 font-mono text-primary/60">{cat.id}</span>
                {cat.label}
              </h2>
              <span className="text-sm text-muted-foreground">{cat.blurb}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => {
                const id = idByName.get(c.savedName);
                return (
                  <Card key={c.key} className="flex flex-col p-4 transition-colors hover:border-primary/50">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-tight">{c.name}</h3>
                      <span className="shrink-0 rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {c.n}q · {c.gates}g
                      </span>
                    </div>
                    <p className="mb-3 flex-1 text-sm text-muted-foreground">{c.desc}</p>
                    {id ? (
                      <Link
                        to={`/circuits/${id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        <Cpu className="h-4 w-4" /> Open in Builder
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
                        Not seeded
                      </span>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Conceptual (not simulable on this engine) */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Conceptual entries</h2>
          <span className="text-sm text-muted-foreground">
            in the catalogue but not expressible as a concrete circuit on this engine
          </span>
        </div>
        <Card className="p-4">
          <ul className="grid gap-2 sm:grid-cols-2">
            {catalog.conceptual.map((c) => (
              <li key={c.name} className="text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground"> — {c.why}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
