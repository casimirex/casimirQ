import { describe, it, expect, beforeEach } from 'vitest';
import { useCircuitStore } from './circuitStore';

const reset = () =>
  useCircuitStore.setState({
    circuitName: 'Untitled Circuit',
    numQubits: 3,
    nodes: [],
    edges: [],
    selectedNode: null,
    history: [{ nodes: [], edges: [] }],
    historyIndex: 0,
  });

const store = () => useCircuitStore.getState();
const pos = { x: 0, y: 0 };

describe('circuitStore', () => {
  beforeEach(reset);

  it('adds a node and selects it', () => {
    store().addNode('h', [0], pos);
    expect(store().nodes).toHaveLength(1);
    expect(store().nodes[0].data.gate).toBe('h');
    expect(store().selectedNode).toBe(store().nodes[0].id);
  });

  it('removes a node and its connected edges', () => {
    store().addNode('h', [0], pos);
    const id = store().nodes[0].id;
    store().addEdge(id, 'other');
    store().removeNode(id);
    expect(store().nodes).toHaveLength(0);
    expect(store().edges).toHaveLength(0);
    expect(store().selectedNode).toBeNull();
  });

  it('updates node data', () => {
    store().addNode('rx', [0], pos);
    const id = store().nodes[0].id;
    store().updateNodeData(id, { params: [Math.PI] });
    expect(store().nodes[0].data.params).toEqual([Math.PI]);
  });

  describe('undo/redo', () => {
    it('canUndo/canRedo reflect history position', () => {
      expect(store().canUndo()).toBe(false);
      expect(store().canRedo()).toBe(false);
      store().addNode('h', [0], pos);
      expect(store().canUndo()).toBe(true);
      expect(store().canRedo()).toBe(false);
    });

    it('undo restores the previous state and redo re-applies it', () => {
      store().addNode('h', [0], pos);
      store().addNode('x', [1], pos);
      expect(store().nodes).toHaveLength(2);

      store().undo();
      expect(store().nodes).toHaveLength(1);
      expect(store().canRedo()).toBe(true);

      store().redo();
      expect(store().nodes).toHaveLength(2);
    });

    it('a new action after undo truncates the redo branch', () => {
      store().addNode('h', [0], pos);
      store().addNode('x', [1], pos);
      store().undo(); // back to 1 node
      store().addNode('z', [2], pos); // new branch
      expect(store().nodes).toHaveLength(2);
      expect(store().canRedo()).toBe(false);
    });

    it('caps history at 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        store().addNode('h', [0], pos);
      }
      expect(store().history.length).toBeLessThanOrEqual(50);
    });
  });

  it('clearCircuit empties the canvas', () => {
    store().addNode('h', [0], pos);
    store().clearCircuit();
    expect(store().nodes).toHaveLength(0);
    expect(store().selectedNode).toBeNull();
  });

  it('setNumQubits and setCircuitName update metadata', () => {
    store().setNumQubits(5);
    store().setCircuitName('My Circuit');
    expect(store().numQubits).toBe(5);
    expect(store().circuitName).toBe('My Circuit');
  });

  it('exportToJSON serializes name, qubits, nodes and edges', () => {
    store().setCircuitName('Bell');
    store().setNumQubits(2);
    store().addNode('h', [0], pos);
    const json = JSON.parse(store().exportToJSON());
    expect(json).toMatchObject({ name: 'Bell', numQubits: 2 });
    expect(json.nodes).toHaveLength(1);
  });
});
