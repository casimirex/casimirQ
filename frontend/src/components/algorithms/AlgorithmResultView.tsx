/**
 * Renders the `result` payload from an algorithm run as readable key/value rows.
 * The payload shape differs per algorithm, so values are formatted generically:
 * numbers are rounded, booleans shown as Yes/No, arrays joined, and nested
 * objects expanded one level.
 */

interface AlgorithmResultViewProps {
  algorithm: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
}

function titleCase(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  // Keep small magnitudes readable without losing signal.
  if (Math.abs(n) < 1) return n.toFixed(4);
  return n.toFixed(4).replace(/\.?0+$/, '');
}

function formatScalar(value: unknown): string {
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null) return '—';
  return String(value);
}

function ValueCell({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return <span className="font-mono text-sm">[{value.map(formatScalar).join(', ')}]</span>;
  }
  if (value && typeof value === 'object') {
    return (
      <div className="space-y-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-sm">
            <span className="text-muted-foreground">{titleCase(k)}</span>
            <span className="font-mono">{formatScalar(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="font-mono text-sm">{formatScalar(value)}</span>;
}

export function AlgorithmResultView({
  algorithm,
  parameters,
  result,
}: AlgorithmResultViewProps) {
  const execMs = result.executionTime;
  const rows = Object.entries(result).filter(([k]) => k !== 'executionTime' && k !== 'output');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{algorithm}</h4>
        {typeof execMs === 'number' && (
          <span className="text-xs text-muted-foreground">
            {execMs < 1 ? `${(execMs * 1000).toFixed(0)} µs` : `${execMs.toFixed(2)} ms`}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {rows.length === 0 && (
          <div className="px-4 py-3 text-sm text-muted-foreground">
            Completed with no scalar outputs.
          </div>
        )}
        {rows.map(([key, value]) => (
          <div key={key} className="flex items-start justify-between gap-4 px-4 py-3">
            <span className="text-sm text-muted-foreground">{titleCase(key)}</span>
            <div className="text-right">
              <ValueCell value={value} />
            </div>
          </div>
        ))}
      </div>

      {Object.keys(parameters).length > 0 && (
        <p className="text-xs text-muted-foreground">
          Parameters:{' '}
          {Object.entries(parameters)
            .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
            .map(([k, v]) => `${titleCase(k)}=${formatScalar(v)}`)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}
