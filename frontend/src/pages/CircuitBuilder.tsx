/**
 * Circuit Builder Page
 * Visual drag-and-drop circuit editor using React Flow.
 * Supports saving/loading circuits via the persistence API.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'react-flow-renderer';
import 'react-flow-renderer/dist/style.css';
import type { Connection, Edge, Node } from 'react-flow-renderer';
import { useCircuitStore } from '@/stores/circuitStore';
import {
  useSimulateCircuit,
  useCreateCircuit,
  useUpdateCircuit,
  useDeleteCircuit,
  useCircuits,
  useCircuit,
} from '@/api/hooks/useCircuits';
import { gatesToOperations, operationsToGateTypes } from '@/lib/circuitOperations';
import { SimulationResults } from '@/components/simulation/SimulationResults';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import {
  Play,
  Save,
  Redo,
  Undo,
  Trash2,
  Plus,
  Loader2,
  FolderOpen,
} from 'lucide-react';

// Gate types for the palette
const GATE_TYPES = [
  { type: 'h', name: 'H', color: 'h', description: 'Hadamard' },
  { type: 'x', name: 'X', color: 'x', description: 'Pauli-X' },
  { type: 'y', name: 'Y', color: 'y', description: 'Pauli-Y' },
  { type: 'z', name: 'Z', color: 'z', description: 'Pauli-Z' },
  { type: 'cnot', name: '⊕', color: 'cnot', description: 'CNOT' },
  { type: 's', name: 'S', color: 'h', description: 'Phase' },
  { type: 't', name: 'T', color: 'h', description: 'T' },
  { type: 'rx', name: 'Rx', color: 'x', description: 'Rotation X' },
  { type: 'ry', name: 'Ry', color: 'y', description: 'Rotation Y' },
  { type: 'rz', name: 'Rz', color: 'z', description: 'Rotation Z' },
];

/** Build a React Flow node for a placed gate. */
function makeGateNode(type: string, index: number): Node {
  const meta = GATE_TYPES.find((g) => g.type === type);
  return {
    id: `gate-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'default',
    position: { x: 100 + index * 80, y: 100 },
    data: { label: meta?.name || type, gateType: type },
    className: `gate-node gate-${meta?.color || 'h'}`,
  };
}

export function CircuitBuilder() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedGate] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const loadedIdRef = useRef<string | null>(null);

  const {
    canUndo,
    canRedo,
    undo,
    redo,
    numQubits,
    setNumQubits,
    circuitName,
    setCircuitName,
  } = useCircuitStore();

  const simulate = useSimulateCircuit();
  const createMut = useCreateCircuit();
  const updateMut = useUpdateCircuit();
  const deleteMut = useDeleteCircuit();
  const { data: listData } = useCircuits(1, 50);
  const circuitQuery = useCircuit(id ?? null);

  const saving = createMut.isPending || updateMut.isPending;

  // Load a stored circuit into the canvas when navigating to /circuits/:id.
  useEffect(() => {
    const circuit = circuitQuery.data;
    if (!circuit || loadedIdRef.current === circuit.id) {
      return;
    }
    loadedIdRef.current = circuit.id;
    setCurrentId(circuit.id);
    setCircuitName(circuit.name);
    setNumQubits(circuit.numQubits);
    const gateTypes = operationsToGateTypes(circuit.operations ?? []);
    setNodes(gateTypes.map((type, i) => makeGateNode(type, i)));
    setEdges([]);
  }, [circuitQuery.data, setCircuitName, setNumQubits, setNodes, setEdges]);

  // Reset to a blank builder on the "new circuit" route.
  useEffect(() => {
    if (!id) {
      loadedIdRef.current = null;
      setCurrentId(null);
    }
  }, [id]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  const addGate = (type: string) => {
    setNodes((nds: Node[]) => [...nds, makeGateNode(type, nds.length)]);
  };

  const collectGateTypes = (): string[] =>
    nodes
      .map((n) => (n.data as { gateType?: string })?.gateType)
      .filter((t): t is string => Boolean(t));

  const handleSimulate = () => {
    const operations = gatesToOperations(collectGateTypes(), numQubits);
    simulate.mutate({
      circuitId: currentId ?? 'circuit-builder',
      numQubits,
      operations,
      shots: 1024,
    });
  };

  const handleSave = () => {
    const operations = gatesToOperations(collectGateTypes(), numQubits);
    const name = circuitName.trim() || 'Untitled Circuit';

    if (currentId) {
      updateMut.mutate(
        { id: currentId, data: { name, operations } },
        {
          onSuccess: () => toast.success('Circuit updated'),
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createMut.mutate(
        { name, numQubits, operations },
        {
          onSuccess: (circuit) => {
            toast.success('Circuit saved');
            loadedIdRef.current = circuit.id;
            setCurrentId(circuit.id);
            navigate(`/circuits/${circuit.id}`);
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
  };

  const handleNew = () => {
    handleClear();
    setCircuitName('Untitled Circuit');
    loadedIdRef.current = null;
    setCurrentId(null);
    navigate('/circuits');
  };

  const handleDelete = (circuitId: string) => {
    // If deleting the circuit currently open, navigate to a blank builder
    // first so its detail query is no longer observed — otherwise removing it
    // from cache would trigger a refetch of the just-deleted resource (404).
    if (circuitId === currentId) {
      handleNew();
    }
    deleteMut.mutate(circuitId, {
      onSuccess: () => toast.success('Circuit deleted'),
      onError: (err) => toast.error(err.message),
    });
  };

  const savedCircuits = listData?.circuits ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Circuit Builder</h1>
          <p className="text-muted-foreground text-sm">
            {currentId ? `Editing saved circuit` : 'Design quantum circuits with drag and drop'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} onClick={handleNew}>
            New
          </Button>
          <Button
            variant="outline"
            leftIcon={<Undo className="h-4 w-4" />}
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            leftIcon={<Redo className="h-4 w-4" />}
            onClick={redo}
            disabled={!canRedo}
          >
            Redo
          </Button>
          <Button
            variant="outline"
            leftIcon={<Trash2 className="h-4 w-4" />}
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button
            leftIcon={
              saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />
            }
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : currentId ? 'Update' : 'Save'}
          </Button>
          <Button
            variant="quantum"
            leftIcon={
              simulate.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )
            }
            onClick={handleSimulate}
            disabled={nodes.length === 0 || simulate.isPending}
          >
            {simulate.isPending ? 'Simulating…' : 'Simulate'}
          </Button>
        </div>
      </div>

      {/* Name + qubit control */}
      <Card className="glass p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="min-w-[240px] flex-1">
            <Input
              label="Circuit name"
              value={circuitName}
              onChange={(e) => setCircuitName(e.target.value)}
              placeholder="Untitled Circuit"
            />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Qubits:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNumQubits(Math.max(1, numQubits - 1))}
              >
                -
              </Button>
              <span className="w-8 text-center font-mono">{numQubits}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setNumQubits(Math.min(20, numQubits + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Circuit canvas */}
      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Gate palette */}
        <Card className="glass p-4">
          <h3 className="text-sm font-semibold mb-3">Gates</h3>
          <div className="grid grid-cols-2 gap-2">
            {GATE_TYPES.map((gate) => (
              <button
                key={gate.type}
                onClick={() => addGate(gate.type)}
                className={`
                  gate-palette-item p-3 rounded-lg border transition-all
                  hover:scale-105 active:scale-95
                  ${selectedGate === gate.type ? 'ring-2 ring-primary' : ''}
                `}
              >
                <div className={`
                  w-8 h-8 mx-auto mb-1 rounded flex items-center justify-center
                  font-bold text-sm text-white
                  ${gate.color === 'h' ? 'bg-purple-500' : ''}
                  ${gate.color === 'x' ? 'bg-red-500' : ''}
                  ${gate.color === 'y' ? 'bg-green-500' : ''}
                  ${gate.color === 'z' ? 'bg-blue-500' : ''}
                  ${gate.color === 'cnot' ? 'bg-amber-500' : ''}
                `}>
                  {gate.name}
                </div>
                <span className="text-xs text-muted-foreground">
                  {gate.description}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* React Flow canvas */}
        <Card className="glass overflow-hidden" style={{ height: '600px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background color="hsl(var(--border))" gap={20} size={1} />
            <Controls />
          </ReactFlow>
        </Card>
      </div>

      {/* Saved circuits */}
      <Card className="glass p-4">
        <div className="mb-3 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Saved Circuits</h3>
          <span className="text-xs text-muted-foreground">({savedCircuits.length})</span>
        </div>
        {savedCircuits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved circuits yet. Build one and click Save.
          </p>
        ) : (
          <div className="space-y-2">
            {savedCircuits.map((circuit) => (
              <div
                key={circuit.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                  circuit.id === currentId ? 'border-primary/50 bg-primary/5' : 'border-border'
                }`}
              >
                <div>
                  <p className="font-medium">{circuit.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {circuit.numQubits} qubits • {circuit.operationCount} gates
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<FolderOpen className="h-4 w-4" />}
                    onClick={() => navigate(`/circuits/${circuit.id}`)}
                    disabled={circuit.id === currentId}
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={() => handleDelete(circuit.id)}
                    disabled={deleteMut.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Simulation results */}
      {simulate.error && (
        <Card className="glass border-red-500/30 p-4">
          <p className="text-sm text-red-500">
            Simulation failed: {simulate.error.message}
          </p>
        </Card>
      )}
      {simulate.data && !simulate.isPending && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Simulation Results</h2>
          <SimulationResults result={simulate.data} />
        </div>
      )}
    </div>
  );
}
