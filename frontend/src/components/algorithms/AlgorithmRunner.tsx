/**
 * Modal that collects an algorithm's parameters, runs it against the backend,
 * and shows the result. Parameter fields come from the algorithm catalog; VQE
 * and QAOA additionally require picking an example input.
 */

import { useMemo, useState } from 'react';
import { X, Play } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import {
  useQaoaExamples,
  useRunAlgorithm,
  useVqeExamples,
} from '@/api/hooks/useAlgorithms';
import type { AlgorithmSpec } from '@/lib/algorithmCatalog';
import type { PauliTerm, QaoaExample } from '@/types';
import { AlgorithmResultView } from './AlgorithmResultView';

interface AlgorithmRunnerProps {
  spec: AlgorithmSpec;
  onClose: () => void;
}

/** Number of qubits a Hamiltonian acts on = highest qubit index + 1. */
function inferQubits(hamiltonian: PauliTerm[]): number {
  let max = -1;
  for (const term of hamiltonian) {
    for (const q of term.qubits) max = Math.max(max, q);
  }
  return max + 1;
}

function apiErrorMessage(err: unknown): string {
  const maybe = err as { response?: { data?: { message?: unknown } }; message?: string };
  const message = maybe?.response?.data?.message;
  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string') return message;
  return maybe?.message ?? 'Something went wrong running this algorithm.';
}

export function AlgorithmRunner({ spec, onClose }: AlgorithmRunnerProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      spec.fields.map((f) => {
        if (f.kind === 'bool') return [f.key, String(f.default)];
        if (f.kind === 'select') return [f.key, f.default];
        if (f.kind === 'intList' || f.kind === 'floatList') return [f.key, f.default];
        return [f.key, f.optional ? '' : String(f.default)];
      }),
    ),
  );
  const [exampleKey, setExampleKey] = useState<string>('');
  const [presetIndex, setPresetIndex] = useState(0);

  const vqeExamples = useVqeExamples();
  const qaoaExamples = useQaoaExamples();
  const run = useRunAlgorithm();

  const examples = useMemo(() => {
    if (spec.usesExample === 'vqe') return vqeExamples.data?.examples;
    if (spec.usesExample === 'qaoa') return qaoaExamples.data?.examples;
    return undefined;
  }, [spec.usesExample, vqeExamples.data, qaoaExamples.data]);

  const exampleKeys = examples ? Object.keys(examples) : [];
  const selectedExampleKey = exampleKey || exampleKeys[0] || '';

  function setField(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    run.reset();
  }

  type BuildResult =
    | { ok: true; body: Record<string, unknown> }
    | { ok: false; error: string };

  function buildBody(): BuildResult {
    const body: Record<string, unknown> = {};

    for (const f of spec.fields) {
      const raw = values[f.key];

      if (f.kind === 'bool') {
        body[f.key] = raw === 'true';
        continue;
      }
      if (f.optional && (raw === '' || raw == null)) continue;

      if (f.kind === 'select') {
        body[f.key] = f.numeric ? Number(raw) : raw;
        continue;
      }
      if (f.kind === 'intList' || f.kind === 'floatList') {
        const parts = raw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '');
        if (parts.length === 0) return { ok: false, error: `Please enter ${f.label}.` };
        const nums = parts.map((s) => (f.kind === 'intList' ? parseInt(s, 10) : parseFloat(s)));
        if (nums.some((x) => Number.isNaN(x)))
          return { ok: false, error: `${f.label} must be a comma-separated list of numbers.` };
        body[f.key] = nums;
        continue;
      }

      if (f.kind === 'int' || f.kind === 'float') {
        const num = f.kind === 'int' ? parseInt(raw, 10) : parseFloat(raw);
        if (Number.isNaN(num))
          return { ok: false, error: `Please enter a value for “${f.label}”.` };
        if (f.min != null && num < f.min)
          return { ok: false, error: `${f.label} must be ≥ ${f.min}.` };
        if (f.max != null && num > f.max)
          return { ok: false, error: `${f.label} must be ≤ ${f.max}.` };
        body[f.key] = num;
      }
    }

    if (spec.presets) {
      const opt = spec.presets.options[presetIndex];
      if (!opt) return { ok: false, error: `Pick a ${spec.presets.label.toLowerCase()}.` };
      Object.assign(body, opt.body);
    }

    if (spec.usesExample === 'vqe') {
      const hamiltonian = examples?.[selectedExampleKey] as PauliTerm[] | undefined;
      if (!hamiltonian) return { ok: false, error: 'Pick an example Hamiltonian to run VQE.' };
      body.hamiltonian = hamiltonian;
      body.n = inferQubits(hamiltonian);
    }

    if (spec.usesExample === 'qaoa') {
      const graph = examples?.[selectedExampleKey] as QaoaExample | undefined;
      if (!graph) return { ok: false, error: 'Pick an example graph to run QAOA.' };
      body.n = graph.n;
      body.edges = graph.edges;
    }

    return { ok: true, body };
  }

  const [localError, setLocalError] = useState<string | null>(null);

  function handleRun() {
    const result = buildBody();
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setLocalError(null);
    run.mutate({ slug: spec.slug, body: result.body });
  }

  const examplesLoading =
    (spec.usesExample === 'vqe' && vqeExamples.isLoading) ||
    (spec.usesExample === 'qaoa' && qaoaExamples.isLoading);

  const Icon = spec.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Run ${spec.name}`}
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{spec.name}</h3>
              <p className="text-xs text-muted-foreground">Complexity: {spec.complexity}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">{spec.description}</p>

        <div className="space-y-4">
          {spec.usesExample && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                {spec.usesExample === 'vqe' ? 'Example Hamiltonian' : 'Example graph'}
              </label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedExampleKey}
                disabled={examplesLoading}
                onChange={(e) => {
                  setExampleKey(e.target.value);
                  run.reset();
                }}
              >
                {examplesLoading && <option>Loading…</option>}
                {exampleKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          )}

          {spec.presets && (
            <div>
              <label className="mb-2 block text-sm font-medium">{spec.presets.label}</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={String(presetIndex)}
                onChange={(e) => {
                  setPresetIndex(Number(e.target.value));
                  run.reset();
                }}
              >
                {spec.presets.options.map((o, i) => (
                  <option key={o.label} value={i}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {spec.fields.map((f) => {
            if (f.kind === 'bool') {
              return (
                <label key={f.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-input"
                    checked={values[f.key] === 'true'}
                    onChange={(e) => setField(f.key, String(e.target.checked))}
                  />
                  <span>
                    <span className="font-medium">{f.label}</span>
                    {f.help && <span className="block text-xs text-muted-foreground">{f.help}</span>}
                  </span>
                </label>
              );
            }

            if (f.kind === 'select') {
              return (
                <div key={f.key}>
                  <label className="mb-2 block text-sm font-medium">{f.label}</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={values[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                  >
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {f.help && <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>}
                </div>
              );
            }

            if (f.kind === 'int' || f.kind === 'float') {
              return (
                <Input
                  key={f.key}
                  label={f.label + (f.optional ? ' (optional)' : '')}
                  type="number"
                  inputMode={f.kind === 'int' ? 'numeric' : 'decimal'}
                  step={f.kind === 'int' ? 1 : 'any'}
                  min={f.min}
                  max={f.max}
                  value={values[f.key]}
                  placeholder={f.optional ? 'auto' : undefined}
                  helperText={f.help}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              );
            }

            // intList / floatList — a comma-separated text field.
            return (
              <Input
                key={f.key}
                label={f.label + (f.optional ? ' (optional)' : '')}
                type="text"
                inputMode={f.kind === 'intList' ? 'numeric' : 'decimal'}
                value={values[f.key]}
                placeholder={String(f.default)}
                helperText={f.help}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            );
          })}
        </div>

        {(localError || run.isError) && (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {localError ?? apiErrorMessage(run.error)}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleRun}
            isLoading={run.isPending}
            leftIcon={<Play className="h-4 w-4" />}
          >
            {run.isPending ? 'Running…' : 'Run'}
          </Button>
        </div>

        {run.isSuccess && run.data && (
          <div className="mt-6 border-t border-border pt-4">
            <AlgorithmResultView
              algorithm={run.data.algorithm}
              parameters={run.data.parameters}
              result={run.data.result}
            />
          </div>
        )}
      </div>
    </div>
  );
}
