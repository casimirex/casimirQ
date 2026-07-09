/**
 * SimulationResults
 * Renders the results of a completed circuit simulation: a probability
 * distribution, sampled measurement counts, and the raw statevector.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import type { SimulationResult } from '@/types';

interface SimulationResultsProps {
  result: SimulationResult;
}

/** Format an amplitude a + bi with fixed precision. */
function formatComplex(re: number, im: number): string {
  const r = re.toFixed(4);
  const i = Math.abs(im).toFixed(4);
  const sign = im < 0 ? '-' : '+';
  return `${r} ${sign} ${i}i`;
}

export function SimulationResults({ result }: SimulationResultsProps) {
  const { results, metadata, numQubits, requestedEngine, shots } = result;

  const probabilityRows = Object.entries(results.probabilities).sort(
    ([, a], [, b]) => b - a
  );
  const maxProbability = probabilityRows.reduce((max, [, p]) => Math.max(max, p), 0) || 1;

  return (
    <div className="space-y-4">
      {/* Summary metadata */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Engine" value={requestedEngine} />
        <Stat label="Qubits" value={String(numQubits)} />
        <Stat label="Shots" value={shots.toLocaleString()} />
        <Stat label="Time" value={`${metadata.executionTimeMs.toFixed(2)} ms`} />
      </div>

      {/* Probability distribution */}
      <Card glass>
        <CardHeader>
          <CardTitle>Probability Distribution</CardTitle>
          <CardDescription>
            Measurement probability for each computational basis state
          </CardDescription>
        </CardHeader>
        <CardContent>
          {probabilityRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No non-zero amplitudes.</p>
          ) : (
            <div className="space-y-2">
              {probabilityRows.map(([state, probability]) => {
                const count = results.counts[state] ?? 0;
                return (
                  <div key={state} className="flex items-center gap-3">
                    <code className="w-20 shrink-0 font-mono text-sm">|{state}⟩</code>
                    <div className="relative h-6 flex-1 overflow-hidden rounded bg-accent/40">
                      <div
                        className="absolute inset-y-0 left-0 rounded bg-primary/70"
                        style={{ width: `${(probability / maxProbability) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right font-mono text-sm">
                      {(probability * 100).toFixed(1)}%
                    </span>
                    <span className="w-16 shrink-0 text-right font-mono text-xs text-muted-foreground">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statevector */}
      <Card glass>
        <CardHeader>
          <CardTitle>Statevector</CardTitle>
          <CardDescription>Complex amplitudes of the final state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">State</th>
                  <th className="py-2 pr-4 font-medium">Amplitude</th>
                  <th className="py-2 font-medium text-right">Probability</th>
                </tr>
              </thead>
              <tbody>
                {results.statevector.map((amp) => (
                  <tr key={amp.state} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-mono">|{amp.state}⟩</td>
                    <td className="py-2 pr-4 font-mono">{formatComplex(amp.re, amp.im)}</td>
                    <td className="py-2 text-right font-mono">
                      {(amp.probability * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card glass>
      <CardContent className="pt-6">
        <div className="truncate text-lg font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
