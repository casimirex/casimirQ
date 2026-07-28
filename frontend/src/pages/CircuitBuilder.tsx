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
  GATE_DEFS,
  gateDef,
  gateWireCount,
  placementsToOperations,
  operationsToPlacements,
  type GatePlacement,
  type GateDef,
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
  meas: { bg: 'bg-slate-500', ring: 'ring-slate-300' },
};

// ---- Canvas geometry: gates snap onto horizontal qubit wires (lanes) ----
const LANE_GAP = 88; // vertical distance between qubit wires
const COL_GAP = 84; // horizontal distance between time steps
const ORIGIN_X = 96; // left margin, leaving room for |q⟩ labels
const TOP = 54; // y of the first wire
const GATE = 48; // gate tile size
const AMBER = '#f59e0b'; // control / target / connector / swap color
const WIRE_COLOR = '#2a3d5c';
const laneY = (q: number) => TOP + q * LANE_GAP;

/** How a single wire's symbol is drawn. */
type SymbolKind = 'tile' | 'dot' | 'plus' | 'x' | 'meter';
interface GateNodeData {
  kind: SymbolKind;
  gateType: string;
  label?: string;
  color?: string;
}

const amberGlow = (on: boolean) => (on ? '0 0 0 3px rgba(245,158,11,0.45)' : 'none');

/**
 * One wire's worth of a placed gate: a colored tile (single-qubit gates and
 * boxed controlled targets), a control/Z dot, a ⊕ target, or a ✕ swap mark.
 */
function GateNode({ data, selected }: NodeProps<GateNodeData>) {
  const box = { width: GATE, height: GATE } as const;

  if (data.kind === 'dot') {
    return (
      <div style={box} className="relative" title={`${data.gateType.toUpperCase()} — drag to move`}>
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

  if (data.kind === 'plus') {
    return (
      <div style={box} className="relative" title={`${data.gateType.toUpperCase()} target — drag to move`}>
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

  if (data.kind === 'x') {
    return (
      <div style={box} className="relative" title="SWAP — drag to move">
        <svg width={GATE} height={GATE} style={{ position: 'absolute', inset: 0 }}>
          <line x1={GATE / 2 - 8} y1={GATE / 2 - 8} x2={GATE / 2 + 8} y2={GATE / 2 + 8} stroke={AMBER} strokeWidth={2.6} />
          <line x1={GATE / 2 - 8} y1={GATE / 2 + 8} x2={GATE / 2 + 8} y2={GATE / 2 - 8} stroke={AMBER} strokeWidth={2.6} />
          {selected && <circle cx={GATE / 2} cy={GATE / 2} r={13} fill="none" stroke={AMBER} strokeWidth={1.5} strokeDasharray="3 2" />}
        </svg>
      </div>
    );
  }

  if (data.kind === 'meter') {
    return (
      <div style={box} className="relative" title="Measure — drag to move, Delete to remove">
        <div
          className={selected ? 'ring-2 ring-offset-2 ring-offset-background ring-slate-300' : ''}
          style={{
            position: 'absolute',
            left: GATE / 2 - 17,
            top: GATE / 2 - 17,
            width: 34,
            height: 34,
            borderRadius: 8,
            background: '#334155',
            border: '1px solid #64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width={22} height={16} viewBox="0 0 22 16">
            <path d="M 3 13 A 8 8 0 0 1 19 13" fill="none" stroke="#e2e8f0" strokeWidth={1.6} />
            <line x1={11} y1={13} x2={17} y2={4.5} stroke="#e2e8f0" strokeWidth={1.6} />
          </svg>
        </div>
      </div>
    );
  }

  // tile
  const c = GATE_COLORS[data.color ?? 'h'] ?? GATE_COLORS.h;
  return (
    <div
      className={[
        'flex items-center justify-center rounded-lg font-mono font-bold text-white shadow-lg',
        (data.label?.length ?? 1) > 2 ? 'text-sm' : 'text-base',
        c.bg,
        selected ? `ring-2 ring-offset-2 ring-offset-background ${c.ring}` : '',
      ].join(' ')}
      style={box}
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

/** The vertical connector joining the wires of a multi-qubit gate. */
function LinkNode({ data }: NodeProps<{ height: number }>) {
  return <div style={{ width: 2, height: data.height, background: AMBER }} />;
}

/** A dashed marker showing a pending (not-yet-complete) multi-qubit placement. */
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

const nodeTypes: NodeTypes = { gate: GateNode, wire: WireNode, link: LinkNode, ghost: GhostNode };

/** Top-left of a gate tile centered on (wire, column). */
const gatePos = (wire: number, column: number) => ({
  x: ORIGIN_X + column * COL_GAP - GATE / 2,
  y: laneY(wire) - GATE / 2,
});

/**
 * The per-wire symbols for a placed gate, in `wires` order (so index i maps to
 * `placement.wires[i]`). Drives both rendering and drag/index bookkeeping.
 */
function gateSymbols(def: GateDef, wires: number[]): { wire: number; kind: SymbolKind }[] {
  const boxOrKind: SymbolKind =
    def.targetKind === 'plus' ? 'plus' : def.targetKind === 'dot' ? 'dot' : 'tile';
  switch (def.shape) {
    case 'single':
      return [{ wire: wires[0], kind: 'tile' }];
    case 'measure':
      return [{ wire: wires[0], kind: 'meter' }];
    case 'controlled':
      return [{ wire: wires[0], kind: 'dot' }, { wire: wires[1], kind: boxOrKind }];
    case 'swap':
      return [{ wire: wires[0], kind: 'x' }, { wire: wires[1], kind: 'x' }];
    case 'cc':
      return [{ wire: wires[0], kind: 'dot' }, { wire: wires[1], kind: 'dot' }, { wire: wires[2], kind: boxOrKind }];
    case 'cswap':
      return [{ wire: wires[0], kind: 'dot' }, { wire: wires[1], kind: 'x' }, { wire: wires[2], kind: 'x' }];
  }
}

/**
 * Turn explicitly-placed gates into React Flow nodes: one per qubit wire, then
 * for each placement a connector (multi-wire) plus one draggable symbol node per
 * wire it touches.
 */
function buildFlowNodes(
  placements: GatePlacement[],
  numQubits: number,
  pending: { gateType: string; wires: number[]; column: number } | null,
): Node[] {
  const maxCol = placements.reduce((m, p) => Math.max(m, p.column), pending?.column ?? 0);
  const width = ORIGIN_X + Math.max(maxCol + 2, 8) * COL_GAP;

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
    const def = gateDef(p.gateType);
    if (!def || p.wires.length !== gateWireCount(def.shape)) continue;
    if (p.wires.some((w) => w < 0 || w >= numQubits)) continue;

    if (p.wires.length > 1) {
      const lo = Math.min(...p.wires);
      const hi = Math.max(...p.wires);
      gates.push({
        id: `${p.id}::link`,
        type: 'link',
        position: { x: ORIGIN_X + p.column * COL_GAP - 1, y: laneY(lo) },
        data: { height: (hi - lo) * LANE_GAP },
        draggable: false,
        selectable: false,
        zIndex: 1,
      });
    }

    gateSymbols(def, p.wires).forEach((sym, i) => {
      gates.push({
        id: `${p.id}::w${i}`,
        type: 'gate',
        position: gatePos(sym.wire, p.column),
        data: {
          kind: sym.kind,
          gateType: p.gateType,
          label: sym.kind === 'tile' ? def.label : undefined,
          color: def.color,
        },
        zIndex: 2,
      });
    });
  }

  const extras: Node[] = [];
  if (pending) {
    pending.wires.forEach((w, i) => {
      extras.push({
        id: `ghost-${i}`,
        type: 'ghost',
        position: gatePos(w, pending.column),
        data: {},
        draggable: false,
        selectable: false,
        zIndex: 3,
      });
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
  // A partially-placed multi-qubit gate: wires clicked so far, at a fixed column.
  const [pending, setPending] = useState<{ gateType: string; wires: number[]; column: number } | null>(
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
  // Fetch a large page so personal circuits still appear even alongside the
  // many seeded "Library · " circuits (which are filtered out below).
  const { data: listData } = useCircuits(1, 500);
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
    setPending(null);
    setActiveGate(null);
  }, [circuitQuery.data, setCircuitName, setNumQubits]);

  // Reset to a blank builder on the "new circuit" route.
  useEffect(() => {
    if (!id) {
      loadedIdRef.current = null;
      setCurrentId(null);
    }
  }, [id]);

  // Re-layout whenever placements, qubit count, or the pending gate change.
  useEffect(() => {
    setFlowNodes(buildFlowNodes(placements, numQubits, pending));
  }, [placements, numQubits, pending, setFlowNodes]);

  const makeId = () => `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Toggle which palette gate we're about to place.
  const selectGate = (type: string) => {
    setActiveGate((prev) => (prev === type ? null : type));
    setPending(null);
  };

  // Add a completed placement, clearing anything it would overlap.
  const addPlacement = (def: GateDef, wires: number[], column: number) => {
    setPlacements((prev) => [
      ...prev.filter((p) => !(p.column === column && p.wires.some((w) => wires.includes(w)))),
      { id: makeId(), gateType: def.type, column, wires, param: def.hasParam ? def.defaultParam : undefined },
    ]);
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

  // Place the active gate. Single-qubit gates land in one click; multi-qubit
  // gates collect their wires across clicks (all sharing the first column).
  const handlePaneClick = (event: React.MouseEvent) => {
    if (!activeGate) return;
    const def = gateDef(activeGate);
    const cell = cellFromEvent(event);
    if (!def || !cell) return;

    const need = gateWireCount(def.shape);
    if (need === 1) {
      addPlacement(def, [cell.qubit], cell.column);
      return;
    }
    if (numQubits < need) {
      toast.error(`Add more qubits — ${def.label} needs ${need} wires`);
      return;
    }
    if (!pending || pending.gateType !== activeGate) {
      setPending({ gateType: activeGate, wires: [cell.qubit], column: cell.column });
      return;
    }
    if (pending.wires.includes(cell.qubit)) return; // each wire must be distinct
    const wires = [...pending.wires, cell.qubit];
    if (wires.length < need) {
      setPending({ ...pending, wires });
      return;
    }
    addPlacement(def, wires, pending.column);
    setPending(null);
  };

  // Snap a dragged symbol to the nearest wire/column and update its placement.
  const handleNodeDragStop = (_event: React.MouseEvent, node: Node) => {
    const [pid, tag] = node.id.split('::');
    if (!tag || !tag.startsWith('w')) return; // only symbol nodes carry a wire
    const wireIndex = Number(tag.slice(1));
    const column = Math.max(0, Math.round((node.position.x + GATE / 2 - ORIGIN_X) / COL_GAP));
    const wire = Math.min(numQubits - 1, Math.max(0, Math.round((node.position.y + GATE / 2 - TOP) / LANE_GAP)));

    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== pid) return p;
        // If the new wire collides with another of this gate's wires, only move
        // the whole gate's column; otherwise reassign this symbol's wire too.
        if (p.wires.some((w, idx) => idx !== wireIndex && w === wire)) {
          return { ...p, column };
        }
        const wires = p.wires.slice();
        wires[wireIndex] = wire;
        return { ...p, wires, column };
      }),
    );
  };

  // Delete key removes selected gates (deleting either half removes a CNOT).
  const handleNodesDelete = (deleted: Node[]) => {
    const ids = new Set(deleted.map((n) => n.id.split('::')[0]));
    setPlacements((prev) => prev.filter((p) => !ids.has(p.id)));
  };

  const handleSimulate = () => {
    // Measure gates are read-out annotations: the engine already samples every
    // qubit per shot, so we drop explicit `measure` ops (whose mid-circuit
    // collapse would otherwise pin every shot to a single outcome).
    const operations = placementsToOperations(placements, numQubits).filter(
      (op) => op.gate !== 'measure',
    );
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
    setPending(null);
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

  // Exclude the seeded Circuit Library entries — they live under their own nav.
  const savedCircuits = (listData?.circuits ?? []).filter((c) => !c.name.startsWith('Library · '));

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
      {(() => {
        if (!activeGate) return null;
        const def = gateDef(activeGate);
        if (!def) return null;
        const need = gateWireCount(def.shape);
        let msg: string;
        if (need === 1) {
          msg = `Click a qubit wire to place ${def.label}. Drag placed gates to move them; select one and press Delete to remove.`;
        } else {
          const roles =
            def.shape === 'swap'
              ? ['first', 'second']
              : def.shape === 'cswap'
                ? ['control', 'first swap', 'second swap']
                : def.shape === 'cc'
                  ? ['control 1', 'control 2', 'target']
                  : ['control', 'target'];
          const next = pending && pending.gateType === activeGate ? pending.wires.length : 0;
          msg = `${def.description}: click the ${roles[next]} qubit wire${next < need - 1 ? ', then continue' : ''}.`;
        }
        return (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary">
            {msg}
          </div>
        );
      })()}

      {/* Circuit canvas */}
      <div className="grid grid-cols-[200px_1fr] gap-4">
        {/* Gate palette */}
        <Card className="glass p-4">
          <h3 className="text-sm font-semibold mb-3">Gates</h3>
          <div className="grid max-h-[540px] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {GATE_DEFS.map((gate) => (
              <button
                key={gate.type}
                onClick={() => selectGate(gate.type)}
                title={gate.description}
                className={`
                  gate-palette-item p-2.5 rounded-lg border transition-all
                  hover:scale-105 active:scale-95
                  ${activeGate === gate.type ? 'ring-2 ring-primary' : ''}
                `}
              >
                <div className={`
                  w-8 h-8 mx-auto mb-1 flex items-center justify-center
                  font-bold text-white
                  ${gate.label.length > 2 ? 'text-[10px]' : 'text-sm'}
                  ${gate.type === 'cnot' ? 'rounded-full' : 'rounded'}
                  ${GATE_COLORS[gate.color]?.bg ?? 'bg-purple-500'}
                `}>
                  {gate.label}
                </div>
                <span className="block truncate text-[11px] text-muted-foreground">
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
