/**
 * Dashboard Page
 * Main dashboard with overview of circuits and activity
 */

import { Link } from 'react-router-dom';
import { useCircuits } from '@/api/hooks/useCircuits';
import type { CircuitSummary } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Cpu,
  Play,
  Clock,
  Plus,
  ChevronRight,
  Activity,
} from 'lucide-react';

export function Dashboard() {
  const { data: circuitsData, isLoading } = useCircuits();

  const circuits = circuitsData?.circuits ?? [];
  const recentCircuits = circuits.slice(0, 5);
  const totalQubits = recentCircuits.reduce(
    (sum: number, c: CircuitSummary) => sum + (c.numQubits || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to casimirQ Quantum Circuit Simulator
          </p>
        </div>
        <Link to="/circuits">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            New Circuit
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Circuits</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{circuitsData?.pagination?.total || circuits.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recentCircuits.length} created recently
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Qubits</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQubits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all circuits
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Simulations</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              Run your first simulation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Circuits */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Circuits</CardTitle>
              <CardDescription>Your recently created circuits</CardDescription>
            </div>
            <Link to="/circuits" className="inline-flex">
              <Button variant="ghost" size="sm">
                View all
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading circuits...
            </div>
          ) : recentCircuits.length === 0 ? (
            <div className="text-center py-8">
              <Cpu className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground mb-4">No circuits yet</p>
              <Link to="/circuits">
                <Button>Create your first circuit</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCircuits.map((circuit: CircuitSummary) => (
                <Link
                  key={circuit.id}
                  to={`/circuits/${circuit.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Cpu className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{circuit.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {circuit.numQubits} qubits • {circuit.operationCount} gates
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-muted-foreground text-sm">
                    <Clock className="mr-1 h-4 w-4" />
                    {circuit.updatedAt ? new Date(circuit.updatedAt).toLocaleDateString() : 'N/A'}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
