/**
 * Simulations Page
 * List of simulation jobs and results
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  RotateCw,
  Filter,
} from 'lucide-react';

// Mock simulation jobs
const mockJobs = [
  {
    id: '1',
    circuitId: 'circuit-1',
    circuitName: 'Bell State',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    executionTime: 1250,
  },
  {
    id: '2',
    circuitId: 'circuit-2',
    circuitName: 'Grover Search',
    status: 'running',
    createdAt: new Date(Date.now() - 600000).toISOString(),
    executionTime: null,
  },
  {
    id: '3',
    circuitId: 'circuit-3',
    circuitName: 'QFT 4-qubit',
    status: 'queued',
    createdAt: new Date(Date.now() - 120000).toISOString(),
    executionTime: null,
  },
];

const statusIcons = {
  completed: <CheckCircle className="h-5 w-5 text-green-500" />,
  running: <RotateCw className="h-5 w-5 text-blue-500 animate-spin" />,
  queued: <Clock className="h-5 w-5 text-amber-500" />,
  failed: <XCircle className="h-5 w-5 text-red-500" />,
};

const statusStyles = {
  completed: 'bg-green-500/10 text-green-500 border-green-500/20',
  running: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  queued: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  failed: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export function Simulations() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Simulations</h1>
          <p className="text-muted-foreground mt-1">
            Run and monitor quantum circuit simulations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            Filter
          </Button>
          <Button leftIcon={<Play className="h-4 w-4" />}>
            New Simulation
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Total Simulations</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">8</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">2</div>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-500">2</div>
            <p className="text-xs text-muted-foreground">Queued</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs list */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Recent Simulations</CardTitle>
          <CardDescription>View simulation results and logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {statusIcons[job.status as keyof typeof statusIcons]}
                  <div>
                    <p className="font-medium">{job.circuitName}</p>
                    <p className="text-sm text-muted-foreground">
                      Circuit ID: {job.circuitId}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      statusStyles[job.status as keyof typeof statusStyles]
                    }`}
                  >
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{new Date(job.createdAt).toLocaleString()}</p>
                    {job.executionTime && (
                      <p>{(job.executionTime / 1000).toFixed(2)}s</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
