/**
 * Qubit routing.
 *
 * Decomposing a circuit to a native gate set (see transpiler.service.ts) is only
 * half of fitting it to real hardware. The other half is *connectivity*: a
 * device only executes a two-qubit gate between qubits that are physically
 * coupled. A circuit that entangles qubits 0 and 2 on a line `0—1—2` cannot run
 * as written — the qubits must be brought adjacent by inserting SWAPs.
 *
 * This module routes a native circuit onto an arbitrary coupling graph. It
 * tracks a logical→physical mapping that SWAPs permute over time, and for every
 * two-qubit gate it moves one operand along a shortest path until the operands
 * are coupled, then emits the gate. SWAPs are emitted directly as `3×cx`, so the
 * output stays in the native basis.
 *
 * The routed circuit computes the same state as the original, but on a permuted
 * set of physical qubits: `finalPermutation[l]` is the physical qubit that holds
 * logical qubit `l` at the end (so a measurement of logical `l` is read from
 * physical `finalPermutation[l]`). This mirrors what real transpilers report as
 * a "final layout" rather than paying extra SWAPs to restore the original order.
 */

import { CircuitOperationSpec } from '../api/services/simulation-runner.service';

/** An undirected coupling map: each pair `[a, b]` is a hardware-coupled edge. */
export type CouplingMap = Array<[number, number]>;

export interface RouteResult {
  /** The routed circuit — every two-qubit gate acts on coupled physical qubits. */
  operations: CircuitOperationSpec[];
  /** `initialLayout[logical] = physical` qubit it started on (before any SWAP). */
  initialLayout: number[];
  /** `finalPermutation[logical] = physical` qubit holding it after routing. */
  finalPermutation: number[];
  /** Number of SWAPs inserted (each expands to 3 `cx`). */
  swapCount: number;
}

/** The line graph `0—1—2—…—(n−1)`. */
export function buildLinearCoupling(numQubits: number): CouplingMap {
  const edges: CouplingMap = [];
  for (let i = 0; i + 1 < numQubits; i++) edges.push([i, i + 1]);
  return edges;
}

/** Adjacency list for a coupling map, over physical qubits `0..numQubits−1`. */
function adjacency(numQubits: number, coupling: CouplingMap): number[][] {
  const adj: number[][] = Array.from({ length: numQubits }, () => []);
  for (const [a, b] of coupling) {
    if (a === b) continue;
    if (!adj[a].includes(b)) adj[a].push(b);
    if (!adj[b].includes(a)) adj[b].push(a);
  }
  return adj;
}

/**
 * Shortest path from `src` to `dst` (inclusive of both), via BFS. Returns the
 * sequence of physical qubits, or `null` if the graph is disconnected between
 * them.
 */
function shortestPath(adj: number[][], src: number, dst: number): number[] | null {
  if (src === dst) return [src];
  const prev = new Array<number>(adj.length).fill(-1);
  const seen = new Array<boolean>(adj.length).fill(false);
  const queue = [src];
  seen[src] = true;
  while (queue.length > 0) {
    const q = queue.shift() as number;
    for (const n of adj[q]) {
      if (seen[n]) continue;
      seen[n] = true;
      prev[n] = q;
      if (n === dst) {
        const path = [dst];
        for (let at = q; at !== src; at = prev[at]) path.push(at);
        path.push(src);
        return path.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}

/** Shortest-path distances from `src` to every physical qubit (BFS). */
function bfsDistances(adj: number[][], src: number): number[] {
  const dist = new Array<number>(adj.length).fill(Infinity);
  dist[src] = 0;
  const queue = [src];
  while (queue.length > 0) {
    const q = queue.shift() as number;
    for (const n of adj[q]) {
      if (dist[n] === Infinity) {
        dist[n] = dist[q] + 1;
        queue.push(n);
      }
    }
  }
  return dist;
}

/**
 * Symmetric interaction weights: `weight[a][b]` counts the two-qubit gates
 * acting on logical qubits `a` and `b`. This is the graph routing must satisfy —
 * qubits that interact a lot want to sit close together on the device.
 */
function interactionWeights(operations: CircuitOperationSpec[], numQubits: number): number[][] {
  const w = Array.from({ length: numQubits }, () => new Array<number>(numQubits).fill(0));
  for (const op of operations) {
    const t = op.targets ?? [];
    if (t.length === 2) {
      w[t[0]][t[1]]++;
      w[t[1]][t[0]]++;
    }
  }
  return w;
}

/**
 * Choose an initial logical→physical layout that places interacting qubits near
 * each other, so routing has fewer SWAPs to insert. A greedy heuristic (not
 * guaranteed optimal): seat the busiest logical qubit on the most central
 * physical qubit, then place the rest one at a time, each on the free physical
 * qubit that minimizes its weighted distance to already-placed partners.
 *
 * Returns `layout[logical] = physical`. Falls back to the identity when the
 * circuit has no two-qubit gates (nothing to optimize).
 */
export function chooseInitialLayout(
  numQubits: number,
  coupling: CouplingMap,
  operations: CircuitOperationSpec[],
): number[] {
  const weight = interactionWeights(operations, numQubits);
  const degree = weight.map((row) => row.reduce((a, b) => a + b, 0));
  if (degree.every((d) => d === 0)) {
    return Array.from({ length: numQubits }, (_, i) => i);
  }

  const adj = adjacency(numQubits, coupling);
  const dist = Array.from({ length: numQubits }, (_, p) => bfsDistances(adj, p));
  // Centrality: smaller total distance to all other qubits = more central.
  const centrality = dist.map((row) => row.reduce((a, b) => a + (b === Infinity ? 0 : b), 0));

  // Place busiest logical qubits first (tie-break by index for determinism).
  const order = Array.from({ length: numQubits }, (_, i) => i).sort(
    (a, b) => degree[b] - degree[a] || a - b,
  );

  const layout = new Array<number>(numQubits).fill(-1);
  const placed: number[] = [];
  const used = new Array<boolean>(numQubits).fill(false);

  for (const q of order) {
    let best = -1;
    let bestCost = Infinity;
    for (let p = 0; p < numQubits; p++) {
      if (used[p]) continue;
      // Weighted distance from candidate p to every already-placed partner.
      let cost = 0;
      for (const l of placed) {
        const d = dist[p][layout[l]];
        cost += weight[q][l] * (d === Infinity ? numQubits : d);
      }
      // Tie-break toward more central seats, then lower physical index.
      if (
        cost < bestCost ||
        (cost === bestCost && best !== -1 && centrality[p] < centrality[best])
      ) {
        best = p;
        bestCost = cost;
      }
    }
    layout[q] = best;
    used[best] = true;
    placed.push(q);
  }

  return layout;
}

/**
 * Route a native circuit onto a coupling graph, inserting SWAPs so that every
 * two-qubit gate acts on coupled qubits.
 */
export function routeCircuit(
  operations: CircuitOperationSpec[],
  numQubits: number,
  coupling: CouplingMap,
  initialLayout?: number[],
): RouteResult {
  const adj = adjacency(numQubits, coupling);

  // loc[logical] = current physical location; inv is its inverse. Start from the
  // given initial layout (identity when none is provided).
  const layout = initialLayout ?? Array.from({ length: numQubits }, (_, i) => i);
  const loc = layout.slice();
  const inv = new Array<number>(numQubits);
  for (let l = 0; l < numQubits; l++) inv[loc[l]] = l;

  const out: CircuitOperationSpec[] = [];
  let swapCount = 0;

  const emitSwap = (physA: number, physB: number) => {
    // SWAP(a,b) as three CX keeps the circuit in the native basis.
    out.push({ gate: 'cx', targets: [physA, physB] });
    out.push({ gate: 'cx', targets: [physB, physA] });
    out.push({ gate: 'cx', targets: [physA, physB] });
    // The logical qubits sitting on these physical wires exchange places.
    const la = inv[physA];
    const lb = inv[physB];
    inv[physA] = lb;
    inv[physB] = la;
    loc[la] = physB;
    loc[lb] = physA;
    swapCount++;
  };

  for (const op of operations) {
    const targets = op.targets ?? [];

    // Single-qubit and structural ops: just relabel to physical wires.
    if (targets.length <= 1) {
      out.push({ ...op, targets: targets.map((q) => loc[q]) });
      continue;
    }

    // Two-qubit gate on logical (a, b). Bring b adjacent to a along a shortest
    // physical path, then emit on the (now coupled) physical wires.
    const [a, b] = targets;
    const pathTo = () => shortestPath(adj, loc[b], loc[a]);
    let path = pathTo();
    if (path === null) {
      throw new Error(`coupling graph does not connect qubits ${a} and ${b}`);
    }
    // Walk b one hop toward a until they are neighbors (path length 2).
    while (path.length > 2) {
      emitSwap(loc[b], path[1]);
      path = pathTo() as number[];
    }
    out.push({ ...op, targets: [loc[a], loc[b]] });
  }

  return {
    operations: out,
    initialLayout: layout.slice(),
    finalPermutation: loc.slice(),
    swapCount,
  };
}

// --- SABRE lookahead router ---

/** Lookahead weight for the extended set (SABRE `W`). */
const SABRE_W = 0.5;
/** Per-swap decay increment, discouraging repeatedly swapping the same qubits. */
const SABRE_DECAY = 0.001;
/** Max gates in the lookahead (extended) set. */
const SABRE_EXTENDED_SIZE = 20;

/** Whether an op is a two-qubit gate that must act on coupled qubits. */
function needsRouting(op: CircuitOperationSpec): boolean {
  const t = op.targets ?? [];
  return t.length === 2 && op.gate !== 'measure' && op.gate !== 'barrier';
}

/**
 * Route a native circuit onto a coupling graph with a SABRE-style lookahead
 * (Li, Ding & Xie 2019). Rather than walking one operand of each gate to the
 * other in isolation (see `routeCircuit`), it maintains a *front layer* of gates
 * whose predecessors have all executed and, when none can run, inserts the SWAP
 * that most reduces a distance heuristic across the front layer plus a decayed
 * lookahead window — so a single SWAP can serve several upcoming gates.
 *
 * The heuristic for a candidate SWAP is
 *   score = max(decay[u], decay[v]) · [ mean_{g∈F} dist(g) + W·mean_{g∈E} dist(g) ]
 * evaluated with the SWAP tentatively applied; `decay` rises for recently-swapped
 * qubits to break oscillation. A greedy fallback guarantees forward progress.
 */
export function routeCircuitSabre(
  operations: CircuitOperationSpec[],
  numQubits: number,
  coupling: CouplingMap,
  initialLayout?: number[],
): RouteResult {
  const adj = adjacency(numQubits, coupling);
  const dist = Array.from({ length: numQubits }, (_, p) => bfsDistances(adj, p));

  const layout = initialLayout ?? Array.from({ length: numQubits }, (_, i) => i);
  const loc = layout.slice();
  const inv = new Array<number>(numQubits);
  for (let l = 0; l < numQubits; l++) inv[loc[l]] = l;

  const ops = operations;
  const n = ops.length;

  // Dependency DAG: within each qubit's timeline, consecutive gates are ordered.
  const chains: number[][] = Array.from({ length: numQubits }, () => []);
  ops.forEach((op, i) => {
    for (const q of op.targets ?? []) chains[q].push(i);
  });
  const inDegree = new Array<number>(n).fill(0);
  const succ = new Map<number, Array<[number, number]>>(); // op -> [(qubit, nextOp)]
  for (let q = 0; q < numQubits; q++) {
    const chain = chains[q];
    for (let k = 0; k < chain.length; k++) {
      const i = chain[k];
      if (k > 0) inDegree[i]++;
      if (k + 1 < chain.length) {
        const list = succ.get(i) ?? [];
        list.push([q, chain[k + 1]]);
        succ.set(i, list);
      }
    }
  }

  const front = new Set<number>();
  for (let i = 0; i < n; i++) if (inDegree[i] === 0) front.add(i);

  const out: CircuitOperationSpec[] = [];
  let swapCount = 0;
  const decay = new Array<number>(numQubits).fill(1);
  let swapsSinceExec = 0;

  const applyLocSwap = (u: number, v: number) => {
    const lu = inv[u];
    const lv = inv[v];
    inv[u] = lv;
    inv[v] = lu;
    loc[lu] = v;
    loc[lv] = u;
  };
  const emitSwap = (u: number, v: number) => {
    out.push(
      { gate: 'cx', targets: [u, v] },
      { gate: 'cx', targets: [v, u] },
      { gate: 'cx', targets: [u, v] },
    );
    applyLocSwap(u, v);
    swapCount++;
    decay[u] += SABRE_DECAY;
    decay[v] += SABRE_DECAY;
    swapsSinceExec++;
  };
  const executable = (g: number): boolean => {
    const op = ops[g];
    if (!needsRouting(op)) return true;
    const [a, b] = op.targets;
    return dist[loc[a]][loc[b]] === 1;
  };
  const executeReady = (): boolean => {
    const ready = [...front].filter(executable).sort((x, y) => x - y);
    if (ready.length === 0) return false;
    for (const g of ready) {
      const t = ops[g].targets ?? [];
      out.push({ ...ops[g], targets: t.map((q) => loc[q]) });
      front.delete(g);
      for (const [, nx] of succ.get(g) ?? []) {
        if (--inDegree[nx] === 0) front.add(nx);
      }
    }
    decay.fill(1);
    swapsSinceExec = 0;
    return true;
  };
  const extendedSet = (): number[] => {
    const e: number[] = [];
    const seen = new Set<number>();
    const queue = [...front];
    while (queue.length > 0 && e.length < SABRE_EXTENDED_SIZE) {
      for (const [, nx] of succ.get(queue.shift() as number) ?? []) {
        if (seen.has(nx)) continue;
        seen.add(nx);
        if (needsRouting(ops[nx])) e.push(nx);
        queue.push(nx);
      }
    }
    return e;
  };
  const heuristic = (extended: number[]): number => {
    let h = 0;
    let cnt = 0;
    for (const g of front) {
      if (!needsRouting(ops[g])) continue;
      const [a, b] = ops[g].targets;
      h += dist[loc[a]][loc[b]];
      cnt++;
    }
    if (cnt > 0) h /= cnt;
    if (extended.length > 0) {
      let e = 0;
      for (const g of extended) {
        const [a, b] = ops[g].targets;
        e += dist[loc[a]][loc[b]];
      }
      h += SABRE_W * (e / extended.length);
    }
    return h;
  };
  const forceRoute = (g: number) => {
    // Greedy fallback: walk one operand along a shortest path. Guarantees the
    // gate becomes adjacent, so the router always makes progress.
    const [a, b] = ops[g].targets;
    let path = shortestPath(adj, loc[b], loc[a]);
    if (path === null) {
      throw new Error(`coupling graph does not connect qubits ${a} and ${b}`);
    }
    while (path.length > 2) {
      emitSwap(loc[b], path[1]);
      path = shortestPath(adj, loc[b], loc[a]) as number[];
    }
  };

  while (front.size > 0) {
    if (executeReady()) continue;

    const frontRouting = [...front].filter((g) => needsRouting(ops[g]));

    // Safety valve: if lookahead is thrashing, force one gate through greedily.
    if (swapsSinceExec > numQubits * numQubits) {
      forceRoute(frontRouting[0]);
      swapsSinceExec = 0;
      continue;
    }

    // Candidate SWAPs: coupling edges incident to a front gate's operands.
    const candidates = new Map<string, [number, number]>();
    for (const g of frontRouting) {
      for (const lq of ops[g].targets) {
        const p = loc[lq];
        for (const nb of adj[p]) {
          const key = p < nb ? `${p}-${nb}` : `${nb}-${p}`;
          candidates.set(key, [Math.min(p, nb), Math.max(p, nb)]);
        }
      }
    }

    const extended = extendedSet();
    let best: [number, number] | null = null;
    let bestScore = Infinity;
    for (const [u, v] of candidates.values()) {
      applyLocSwap(u, v);
      const score = Math.max(decay[u], decay[v]) * heuristic(extended);
      applyLocSwap(u, v); // revert
      if (score < bestScore - 1e-12) {
        bestScore = score;
        best = [u, v];
      }
    }

    if (best === null) {
      forceRoute(frontRouting[0]);
      swapsSinceExec = 0;
      continue;
    }
    emitSwap(best[0], best[1]);
  }

  return {
    operations: out,
    initialLayout: layout.slice(),
    finalPermutation: loc.slice(),
    swapCount,
  };
}
