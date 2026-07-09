/**
 * Circuit Builder Store
 * Zustand store for circuit building state
 */

import { create } from 'zustand';
import type { CircuitNode, CircuitEdge, GateNodeData } from '@/types';
import { generateId } from '@/lib/utils';

interface CircuitState {
  // Circuit metadata
  circuitName: string;
  numQubits: number;

  // React Flow state
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  selectedNode: string | null;

  // History for undo/redo
  history: { nodes: CircuitNode[]; edges: CircuitEdge[] }[];
  historyIndex: number;

  // Actions
  setCircuitName: (name: string) => void;
  setNumQubits: (count: number) => void;

  // Node actions
  addNode: (gate: string, qubits: number[], position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<GateNodeData>) => void;

  // Edge actions
  addEdge: (source: string, target: string) => void;
  removeEdge: (edgeId: string) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveToHistory: () => void;

  // Circuit operations
  clearCircuit: () => void;
  loadCircuit: (nodes: CircuitNode[], edges: CircuitEdge[]) => void;
  exportToJSON: () => string;
}

const MAX_HISTORY = 50;

export const useCircuitStore = create<CircuitState>()((set, get) => ({
  // Initial state
  circuitName: 'Untitled Circuit',
  numQubits: 3,
  nodes: [],
  edges: [],
  selectedNode: null,
  history: [{ nodes: [], edges: [] }],
  historyIndex: 0,

  // Metadata actions
  setCircuitName: (name: string) => set({ circuitName: name }),
  setNumQubits: (count: number) => set({ numQubits: count }),

  // Node actions
  addNode: (gate: string, qubits: number[], position: { x: number; y: number }) => {
    const newNode: CircuitNode = {
      id: generateId(),
      type: 'gate',
      position,
      data: {
        label: gate.toUpperCase(),
        gate,
        qubits,
      },
    };

    set((state) => {
      const newNodes = [...state.nodes, newNode];
      return { nodes: newNodes, selectedNode: newNode.id };
    });

    get().saveToHistory();
  },

  removeNode: (nodeId: string) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNode: state.selectedNode === nodeId ? null : state.selectedNode,
    }));

    get().saveToHistory();
  },

  selectNode: (nodeId: string | null) => set({ selectedNode: nodeId }),

  updateNodeData: (nodeId: string, data: Partial<GateNodeData>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    }));

    get().saveToHistory();
  },

  // Edge actions
  addEdge: (source: string, target: string) => {
    const newEdge: CircuitEdge = {
      id: `${source}-${target}`,
      source,
      target,
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
    }));

    get().saveToHistory();
  },

  removeEdge: (edgeId: string) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    }));

    get().saveToHistory();
  },

  // History actions
  saveToHistory: () => {
    const { nodes, edges, historyIndex } = get();

    set((state) => {
      // Remove any future history if we're not at the end
      const newHistory = state.history.slice(0, historyIndex + 1);

      // Add new state
      newHistory.push({ nodes: [...nodes], edges: [...edges] });

      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    const { historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const { nodes, edges } = get().history[newIndex];
      set({
        nodes: [...nodes],
        edges: [...edges],
        historyIndex: newIndex,
        selectedNode: null,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const { nodes, edges } = history[newIndex];
      set({
        nodes: [...nodes],
        edges: [...edges],
        historyIndex: newIndex,
        selectedNode: null,
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // Circuit operations
  clearCircuit: () => {
    set({
      nodes: [],
      edges: [],
      selectedNode: null,
    });

    get().saveToHistory();
  },

  loadCircuit: (nodes: CircuitNode[], edges: CircuitEdge[]) => {
    set({ nodes, edges, selectedNode: null });
    get().saveToHistory();
  },

  exportToJSON: () => {
    const { circuitName, numQubits, nodes, edges } = get();
    return JSON.stringify({
      name: circuitName,
      numQubits,
      nodes,
      edges,
    }, null, 2);
  },
}));
