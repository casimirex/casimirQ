/**
 * Circuit Builder Page
 * Visual drag-and-drop circuit editor using React Flow.
 * Supports saving/loading circuits via the persistence API.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
} from 'react-flow-renderer';
import 'react-flow-renderer/dist/style.css';
import type { Node, NodeProps, NodeTypes, ReactFlowInstance } from 'react-flow-renderer';
import { useCircuitStore } from '@/stores/circuitStore';
import {
  useSimulateCircuit,
  useCreateCircuit,
  useUpdateCircuit,
  useDeleteCircuit,
  useCircuits,
  useCircuit,
} from '@/api/hooks/useCircuits';
import {
  GATE_SPECS,
  placementsToOperations,
  operationsToPlacements,
  type GatePlacement,
} from '@/lib/circuitOperations';
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

/**
 * Single source of truth for gate colors, shared by the palette and the
 * placed-on-canvas nodes so the two can never drift apart.
 */
const GATE_COLORS: Record<string, { bg: string; ring: string }> = {
  h: { bg: 'bg-purple-500', ring: 'ring-purple-300' },
  x: { bg: 'bg-red-500', ring: 'ring-red-300' },
  y: { bg: 'bg-green-500', ring: 'ring-green-300' },
  z: { bg: 'bg-blue-500', ring: 'ring-blue-300' },
  cnot: { bg: 'bg-amber-500', ring: 'ring-amber-300' },
};

// ---- Canvas geometry: gates snap onto horizontal qubit wires (lanes) ----
const LANE_GAP = 88; // vertical distance between qubit wires
const COL_GAP = 84; // horizontal distance between time steps
const ORIGIN_X = 96; // left margin, leaving room for |q⟩ labels
const TOP = 54; // y of the first wire
const GATE = 48; // gate tile size
const AMBER = '#f59e0b'; // CNOT control/target/connector color (matches bg-amber-500)
const WIRE_COLOR = '#2a3d5c';
const laneY = (q: number) => TOP + q * LANE_GAP;

interface GateNodeData {
  role: 'single' | 'control' | 'target';
  gateType: string;
  qubit: number;
  label?: string;
  color?: string;
  /** target wire, so a control node can draw its connector */
  targetQubit?: number;
}

const amberGlow = (on: boolean) => (on ? '0 0 0 3px rgba(245,158,11,0.45)' : 'none');

/**
 * A placed gate. Single-qubit gates are a colored tile matching their palette
 * swatch. A CNOT is two independently-draggable nodes — a control dot and a ⊕
 * target — joined by a connector drawn from the control node.
 */
function GateNode({ data, selected }: NodeProps<GateNodeData>) {
  if (data.role === 'control') {
    const delta = ((data.targetQubit ?? data.qubit) - data.qubit) * LANE_GAP;
    return (
      <div style={{ width: GATE, height: GATE }} className="relative" title="CNOT control — drag to another wire">
        <div
          style={{
            position: 'absolute',
            left: GATE / 2 - 1,
            top: delta >= 0 ? GATE / 2 : GATE / 2 + delta,
            width: 2,
            height: Math.abs(delta),
            background: AMBER,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: GATE / 2 - 7,
            top: GATE / 2 - 7,
            width: 14,
            height: 14,
            borderRadius: '9999px',
            background: AMBER,
            boxShadow: amberGlow(selected),
          }}
        />
      </div>
    );
  }

  if (data.role === 'target') {
    return (
      <div style={{ width: GATE, height: GATE }} className="relative" title="CNOT target — drag to another wire">
        <div
          style={{
            position: 'absolute',
            left: GATE / 2 - 15,
            top: GATE / 2 - 15,
            width: 30,
            height: 30,
            borderRadius: '9999px',
            border: `2px solid ${AMBER}`,
            background: '#0f1b30',
            color: AMBER,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            boxShadow: amberGlow(selected),
          }}
        >
          ⊕
        </div>
      </div>
    );
  }

  const c = GATE_COLORS[data.color ?? 'h'] ?? GATE_COLORS.h;
  return (
    <div
      className={[
        'flex items-center justify-center rounded-lg font-mono text-base font-bold text-white shadow-lg',
        c.bg,
        selected ? `ring-2 ring-offset-2 ring-offset-background ${c.ring}` : '',
      ].join(' ')}
      style={{ width: GATE, height: GATE }}
      title={`${data.gateType.toUpperCase()} — drag to move, Delete to remove`}
    >
      {data.label}
    </div>
  );
}

/** A horizontal qubit wire with its |q⟩ label. Non-interactive background. */
function WireNode({ data }: NodeProps<{ label: string; width: number }>) {
  return (
    <div style={{ width: data.width, height: 20 }} className="pointer-events-none flex items-center">
      <span className="w-16 shrink-0 pr-3 text-right font-mono text-xs text-muted-foreground">
        |{data.label}⟩
      </span>
      <div className="h-px flex-1" style={{ background: WIRE_COLOR }} />
    </div>
  );
}

/** A dashed marker showing where a pending CNOT control has been placed. */
function GhostNode() {
  return (
    <div style={{ width: GATE, height: GATE }} className="relative">
      <div
        style={{
          position: 'absolute',
          left: GATE / 2 - 9,
          top: GATE / 2 - 9,
          width: 18,
          height: 18,
          borderRadius: '9999px',
          border: `2px dashed ${AMBER}`,
        }}
      />
    </div>
  );
}

const nodeTypes: NodeTypes = { gate: GateNode, wire: WireNode, ghost: GhostNode };

/** Map a placement's (qubit, column) to the top-left of its gate tile. */
const gatePos = (qubit: number, column: number) => ({
  x: ORIGIN_X + column * COL_GAP - GATE / 2,
  y: laneY(qubit) - GATE / 2,
});

/**
 * Turn explicitly-placed gates into React Flow nodes, one per wire plus the
 * gate nodes. Each single-qubit gate is one node; each CNOT is a control node
 * and a target node (both draggable) at the same column.
 */
function buildFlowNodes(
  placements: GatePlacement[],
  numQubits: number,
  pending: { qubit: number; column: number } | null,
): Node[] {
  const maxCol = placements.reduce((m, p) => Math.max(m, p.column), pending?.column ?? 0);
  const cols = Math.max(maxCol + 2, 8);
  const width = ORIGIN_X + cols * COL_GAP;

  const wires: Node[] = Array.from({ length: numQubits }, (_, q) => ({
    id: `wire-${q}`,
    type: 'wire',
    position: { x: 0, y: laneY(q) - 10 },
    data: { label: `q${q}`, width },
    draggable: false,
    selectable: false,
    connectable: false,
    zIndex: 0,
  }));

  const gates: Node[] = [];
  for (const p of placements) {
    const spec = GATE_SPECS[p.gateType];
    if (!spec || p.qubit < 0 || p.qubit >= numQubits) continue;

    if (spec.arity === 2) {
      if (p.target == null || p.target < 0 || p.target >= numQubits) continue;
      gates.push({
        id: `${p.id}::c`,
        type: 'gate',
        position: gatePos(p.qubit, p.column),
        data: { role: 'control', gateType: p.gateType, qubit: p.qubit, targetQubit: p.target },
        zIndex: 2,
      });
      gates.push({
        id: `${p.id}::t`,
        type: 'gate',
        position: gatePos(p.target, p.column),
        data: { role: 'target', gateType: p.gateType, qubit: p.target },
        zIndex: 2,
      });
    } else {
      const meta = GATE_TYPES.find((g) => g.type === p.gateType);
      gates.push({
        id: p.id,
        type: 'gate',
        position: gatePos(p.qubit, p.column),
        data: {
          role: 'single',
          label: meta?.name ?? p.gateType,
          color: meta?.color ?? 'h',
          gateType: p.gateType,
          qubit: p.qubit,
        },
        zIndex: 2,
      });
    }
  }

  const extras: Node[] = [];
  if (pending) {
    extras.push({
      id: 'ghost',
      type: 'ghost',
      position: gatePos(pending.qubit, pending.column),
      data: {},
      draggable: false,
      selectable: false,
      zIndex: 3,
    });
  }

  return [...wires, ...gates, ...extras];
}

export function CircuitBuilder() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [placements, setPlacements] = useState<GatePlacement[]>([]);
  const [activeGate, setActiveGate] = useState<string | null>(null);
  const [pendingControl, setPendingControl] = useState<{ qubit: number; column: number } | null>(
    null,
  );
  const [currentId, setCurrentId] = useState<string | null>(null);
  const loadedIdRef = useRef<string | null>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    setPlacements(
      operationsToPlacements(circuit.operations ?? [], (i) => `p-load-${circuit.id}-${i}`),
    );
    setPendingControl(null);
    setActiveGate(null);
  }, [circuitQuery.data, setCircuitName, setNumQubits]);

  // Reset to a blank builder on the "new circuit" route.
  useEffect(() => {
    if (!id) {
      loadedIdRef.current = null;
      setCurrentId(null);
    }
  }, [id]);

  // Re-layout whenever placements, qubit count, or the pending CNOT change.
  useEffect(() => {
    setFlowNodes(buildFlowNodes(placements, numQubits, pendingControl));
  }, [placements, numQubits, pendingControl, setFlowNodes]);

  const makeId = () => `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Toggle which palette gate we're about to place.
  const selectGate = (type: string) => {
    setActiveGate((prev) => (prev === type ? null : type));
    setPendingControl(null);
  };

  // Convert a canvas click into the nearest (qubit, column) cell.
  const cellFromEvent = (event: React.MouseEvent): { qubit: number; column: number } | null => {
    const inst = rfInstance.current;
    const wrap = wrapperRef.current;
    if (!inst || !wrap) return null;
    const b = wrap.getBoundingClientRect();
    const pos = inst.project({ x: event.clientX - b.left, y: event.clientY - b.top });
    const column = Math.max(0, Math.round((pos.x - ORIGIN_X) / COL_GAP));
    const qubit = Math.min(numQubits - 1, Math.max(0, Math.round((pos.y - TOP) / LANE_GAP)));
    return { qubit, column };
  };

  // Place the active gate where the user clicked empty canvas.
  const handlePaneClick = (event: React.MouseEvent) => {
    if (!activeGate) return;
    const spec = GATE_SPECS[activeGate];
    const cell = cellFromEvent(event);
    if (!spec || !cell) return;

    if (spec.arity === 2) {
      if (numQubits < 2) {
        toast.error('Add a second qubit before placing a CNOT');
        return;
      }
      if (!pendingControl) {
        setPendingControl({ qubit: cell.qubit, column: cell.column });
        return;
      }
      if (cell.qubit === pendingControl.qubit) return; // target must differ from control
      const control = pendingControl;
      setPlacements((prev) => [
        ...prev.filter(
          (p) =>
            !(p.column === control.column && (p.qubit === control.qubit || p.qubit === cell.qubit)),
        ),
        {
          id: makeId(),
          gateType: 'cnot',
          qubit: control.qubit,
          target: cell.qubit,
          column: control.column,
        },
      ]);
      setPendingControl(null);
      return;
    }

    // single-qubit: replace anything already sitting on this exact cell
    setPlacements((prev) => [
      ...prev.filter((p) => !(p.column === cell.column && p.qubit === cell.qubit)),
      {
        id: makeId(),
        gateType: activeGate,
        qubit: cell.qubit,
        column: cell.column,
        param: spec.hasParam ? spec.defaultParam : undefined,
      },
    ]);
  };

  // Snap a dragged gate to the nearest wire/column and update its placement.
  const handleNodeDragStop = (_event: React.MouseEvent, node: Node) => {
    const centerX = node.position.x + GATE / 2;
    const centerY = node.position.y + GATE / 2;
    const column = Math.max(0, Math.round((centerX - ORIGIN_X) / COL_GAP));
    const qubit = Math.min(numQubits - 1, Math.max(0, Math.round((centerY - TOP) / LANE_GAP)));
    const [pid, role] = node.id.split('::');

    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== pid) return p;
        if (role === 'c') return { ...p, qubit, column };
        if (role === 't') return qubit === p.qubit ? p : { ...p, target: qubit }; // keep control/target distinct
        return { ...p, qubit, column };
      }),
    );
  };

  // Delete key removes selected gates (deleting either half removes a CNOT).
  const handleNodesDelete = (deleted: Node[]) => {
    const ids = new Set(deleted.map((n) => n.id.split('::')[0]));
    setPlacements((prev) => prev.filter((p) => !ids.has(p.id)));
  };

  const handleSimulate = () => {
    const operations = placementsToOperations(placements, numQubits);
    simulate.mutate({
      circuitId: currentId ?? 'circuit-builder',
      numQubits,
      operations,
      circuitName: circuitName.trim() || 'Untitled Circuit',
      shots: 1024,
    });
  };

  const handleSave = () => {
    const operations = placementsToOperations(placements, numQubits);
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
    setPlacements([]);
    setPendingControl(null);
    setActiveGate(null);
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
            disabled={placements.length === 0 || simulate.isPending}
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

      {/* Placement hint */}
      {activeGate && (
        <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary">
          {GATE_SPECS[activeGate]?.arity === 2
            ? pendingControl
              ? 'CNOT — now click the target qubit wire (must differ from the control).'
              : 'CNOT — click the control qubit wire, then click the target qubit wire.'
            : `Click a qubit wire to place ${activeGate.toUpperCase()}. Drag placed gates to move them; select one and press Delete to remove.`}
        </div>
      )}

      {/* Circuit canvas */}
      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Gate palette */}
        <Card className="glass p-4">
          <h3 className="text-sm font-semibold mb-3">Gates</h3>
          <div className="grid grid-cols-2 gap-2">
            {GATE_TYPES.map((gate) => (
              <button
                key={gate.type}
                onClick={() => selectGate(gate.type)}
                className={`
                  gate-palette-item p-3 rounded-lg border transition-all
                  hover:scale-105 active:scale-95
                  ${activeGate === gate.type ? 'ring-2 ring-primary' : ''}
                `}
              >
                <div className={`
                  w-8 h-8 mx-auto mb-1 flex items-center justify-center
                  font-bold text-sm text-white
                  ${gate.color === 'cnot' ? 'rounded-full' : 'rounded'}
                  ${GATE_COLORS[gate.color]?.bg ?? 'bg-purple-500'}
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
          <div ref={wrapperRef} className="h-full w-full">
            <ReactFlow
              nodes={flowNodes}
              edges={[]}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onInit={(inst) => {
                rfInstance.current = inst;
              }}
              onPaneClick={handlePaneClick}
              onNodeDragStop={handleNodeDragStop}
              onNodesDelete={handleNodesDelete}
              nodesConnectable={false}
              deleteKeyCode={['Delete', 'Backspace']}
              fitView
              minZoom={0.3}
            >
              <Background color="hsl(var(--border))" gap={20} size={1} />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
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
