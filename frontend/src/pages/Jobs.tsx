/**
 * Jobs Page
 *
 * Submit asynchronous simulation jobs and watch them progress. The list polls
 * while any job is queued or running, so status and progress update live.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CircuitSelector, type ResolvedCircuit } from '@/components/CircuitSelector';
import { SimulationResults } from '@/components/simulation/SimulationResults';
import { useJobs, useSubmitJob, useCancelJob, useDeleteJob } from '@/api/hooks/useJobs';
import type { Job, JobStatus, SimulationEngine, SimulationResult } from '@/types';
import { Play, X, Trash2, Clock, CheckCircle, XCircle, Loader2, Ban } from 'lucide-react';

const ENGINES: SimulationEngine[] = ['auto', 'statevector', 'clifford', 'mps'];

const STATUS_STYLE: Record<JobStatus, { icon: typeof Clock; className: string }> = {
  queued: { icon: Clock, className: 'text-muted-foreground' },
  running: { icon: Loader2, className: 'text-primary' },
  completed: { icon: CheckCircle, className: 'text-green-500' },
  failed: { icon: XCircle, className: 'text-destructive' },
  cancelled: { icon: Ban, className: 'text-muted-foreground' },
};

/** Adapt a job's simulation result into the SimulationResults prop shape. */
function toResult(job: Job): SimulationResult | null {
  if (!job.result) return null;
  return {
    circuitId: '',
    jobId: job.id,
    status: 'completed',
    numQubits: job.result.numQubits,
    requestedEngine: job.result.requestedEngine,
    shots: job.result.shots,
    results: job.result.results,
    metadata: job.result.metadata,
  };
}

function StatusBadge({ status }: { status: JobStatus }) {
  const { icon: Icon, className } = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${className}`}>
      <Icon className={`h-4 w-4 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status}
    </span>
  );
}

export function Jobs() {
  const [circuit, setCircuit] = useState<ResolvedCircuit | null>(null);
  const [engine, setEngine] = useState<SimulationEngine>('auto');
  const [shots, setShots] = useState(1024);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useJobs(1, 20);
  const submit = useSubmitJob();
  const cancel = useCancelJob();
  const remove = useDeleteJob();

  function handleSubmit() {
    if (!circuit) return;
    submit.mutate({
      circuitName: circuit.name,
      numQubits: circuit.numQubits,
      operations: circuit.operations,
      engine,
      shots,
    });
  }

  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jobs</h1>
        <p className="mt-1 text-muted-foreground">
          Submit simulations asynchronously and track them as they run.
        </p>
      </div>

      {/* Submit form */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Submit a simulation job</CardTitle>
          <CardDescription>Runs in the background — the list below updates live.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
          <CircuitSelector onChange={setCircuit} />
          <div>
            <label className="mb-2 block text-sm font-medium">Engine</label>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={engine}
              onChange={(e) => setEngine(e.target.value as SimulationEngine)}
            >
              {ENGINES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Shots"
            type="number"
            min={1}
            className="w-28"
            value={shots}
            onChange={(e) => setShots(Number(e.target.value) || 1)}
          />
          <div className="flex items-end">
            <Button
              onClick={handleSubmit}
              disabled={!circuit}
              isLoading={submit.isPending}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Jobs list */}
      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground">Loading jobs…</p>}
        {!isLoading && jobs.length === 0 && (
          <Card className="glass">
            <CardContent className="py-8 text-center text-muted-foreground">
              No jobs yet — submit one above.
            </CardContent>
          </Card>
        )}
        {jobs.map((job) => {
          const result = toResult(job);
          const isOpen = expanded === job.id;
          return (
            <Card key={job.id} className="glass">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={job.status} />
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {job.id}
                      </span>
                    </div>
                    {job.error && <p className="mt-1 text-sm text-destructive">{job.error}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {job.status === 'completed' && result && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpanded(isOpen ? null : job.id)}
                      >
                        {isOpen ? 'Hide' : 'Result'}
                      </Button>
                    )}
                    {job.status === 'queued' && (
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<X className="h-4 w-4" />}
                        onClick={() => cancel.mutate(job.id)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Delete job"
                      onClick={() => remove.mutate(job.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar for active jobs */}
                {(job.status === 'running' || job.status === 'queued') && (
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-accent">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.round(job.progress * 100)}%` }}
                    />
                  </div>
                )}

                {isOpen && result && (
                  <div className="mt-4 border-t border-border pt-4">
                    <SimulationResults result={result} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
