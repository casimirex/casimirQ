/**
 * Simulations Page
 * Real simulation-run history, backed by the persistence API.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSimulations, useSimulation, useDeleteSimulation } from '@/api/hooks/useSimulations';
import { SimulationResults } from '@/components/simulation/SimulationResults';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { SimulationRunSummary, SimulationResult } from '@/types';
import { Play, CheckCircle, XCircle, Cpu, Clock, Trash2 } from 'lucide-react';

/** Adapt a stored run's detail into the shape SimulationResults expects. */
function toResultProps(detail: {
  id: string;
  circuitId: string | null;
  engine: SimulationResult['requestedEngine'];
  shots: number;
  numQubits: number;
  status: 'completed' | 'failed';
  executionTimeMs: number;
  results: SimulationResult['results'];
}): SimulationResult {
  return {
    circuitId: detail.circuitId ?? '',
    jobId: detail.id,
    status: 'completed',
    numQubits: detail.numQubits,
    requestedEngine: detail.engine,
    shots: detail.shots,
    results: detail.results,
    metadata: { executionTimeMs: detail.executionTimeMs, memoryUsageBytes: 0 },
  };
}

export function Simulations() {
  const { data, isLoading } = useSimulations(1, 50);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: selected } = useSimulation(selectedId);
  const remove = useDeleteSimulation();

  const handleDelete = (id: string) => {
    if (id === selectedId) setSelectedId(null);
    remove.mutate(id);
  };

  const runs = data?.simulations ?? [];
  const total = data?.pagination.total ?? runs.length;
  const completed = runs.filter((r) => r.status === 'completed').length;
  const failed = runs.filter((r) => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Simulations</h1>
          <p className="text-muted-foreground mt-1">Your quantum circuit simulation runs</p>
        </div>
        <Link to="/circuits">
          <Button leftIcon={<Play className="h-4 w-4" />}>New Simulation</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Total Runs</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{completed}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{failed}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Runs list */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Recent Simulations</CardTitle>
          <CardDescription>Select a run to view its results</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading simulations…</div>
          ) : runs.length === 0 ? (
            <div className="py-8 text-center">
              <Cpu className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="mb-4 text-muted-foreground">No simulations yet</p>
              <Link to="/circuits">
                <Button>Build and run a circuit</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {runs.map((run: SimulationRunSummary) => (
                <div
                  key={run.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50 ${
                    run.id === selectedId ? 'border-primary/50 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {run.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">{run.circuitName}</p>
                      <p className="text-sm text-muted-foreground">
                        {run.engine} • {run.numQubits} qubits • {run.shots.toLocaleString()} shots
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-muted-foreground">
                      <p className="flex items-center justify-end gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {run.executionTimeMs.toFixed(2)} ms
                      </p>
                      <p>{new Date(run.createdAt).toLocaleString()}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(run.id === selectedId ? null : run.id)}
                    >
                      {run.id === selectedId ? 'Hide' : 'View'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete simulation"
                      disabled={remove.isPending}
                      onClick={() => handleDelete(run.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected run results */}
      {selectedId && selected && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">
            Results — {selected.circuitName}
          </h2>
          <SimulationResults result={toResultProps(selected)} />
        </div>
      )}
    </div>
  );
}
