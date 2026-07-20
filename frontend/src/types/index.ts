/**
 * casimirQ Frontend Types
 */

// Circuit types
export interface Circuit {
  id: string;
  name: string;
  numQubits: number;
  operations: CircuitOperation[];
  createdAt: string;
  updatedAt?: string;
}

export interface CircuitOperation {
  id?: string;
  gate: string;
  targets: number[];
  params?: number[];
  controls?: number[];
}

/** Lightweight circuit shape returned by the list endpoint. */
export interface CircuitSummary {
  id: string;
  name: string;
  numQubits: number;
  operationCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Response from GET /circuits. */
export interface CircuitListResponse {
  circuits: CircuitSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CircuitNode {
  id: string;
  type: 'gate' | 'input' | 'output';
  position: { x: number; y: number };
  data: GateNodeData;
}

export interface GateNodeData {
  label: string;
  gate: string;
  qubits: number[];
  params?: number[];
  color?: string;
}

export interface CircuitEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'step' | 'smoothstep';
}

// Simulation types
export type SimulationEngine = 'statevector' | 'clifford' | 'mps' | 'auto';

/** A single operation in the circuit spec sent to the simulate endpoint. */
export interface SimulationOperation {
  gate: string;
  targets: number[];
  params?: number[];
}

/** Request body for POST /circuits/:id/simulate. */
export interface SimulationRequest {
  numQubits: number;
  operations: SimulationOperation[];
  engine?: SimulationEngine;
  shots?: number;
  seed?: number;
}

/** A non-negligible statevector amplitude, as returned by the backend. */
export interface SimulationAmplitude {
  /** Computational basis state as a bit string (qubit 0 = most significant). */
  state: string;
  re: number;
  im: number;
  probability: number;
}

/** Response from POST /circuits/:id/simulate (results are synchronous). */
export interface SimulationResult {
  circuitId: string;
  jobId: string;
  status: 'completed';
  numQubits: number;
  requestedEngine: SimulationEngine;
  shots: number;
  results: {
    statevector: SimulationAmplitude[];
    probabilities: Record<string, number>;
    counts: Record<string, number>;
  };
  metadata: {
    executionTimeMs: number;
    memoryUsageBytes: number;
  };
}

/** A device qubit connectivity to route onto (POST /transpile). */
export type Connectivity = 'linear' | 'all-to-all';
/** Initial-placement strategy used before routing. */
export type LayoutStrategy = 'trivial' | 'greedy';
/** SWAP-insertion strategy used during routing. */
export type RouterStrategy = 'greedy' | 'sabre';

/** Request body for POST /transpile. */
export interface TranspileRequest {
  numQubits: number;
  operations: SimulationOperation[];
  connectivity?: Connectivity;
  coupling?: number[][];
  layout?: LayoutStrategy;
  router?: RouterStrategy;
}

/** Response from POST /transpile. */
export interface TranspileResult {
  operations: SimulationOperation[];
  basis: string[];
  originalGateCount: number;
  transpiledGateCount: number;
  fullyNative: boolean;
  unsupported: string[];
  /** Present when routed: finalPermutation[logical] = physical wire holding it. */
  finalPermutation?: number[];
  /** Present when routed: initialLayout[logical] = physical wire it started on. */
  initialLayout?: number[];
  /** Number of SWAPs inserted by routing (each expands to 3×cx). */
  swapCount?: number;
}

/** Results payload shared by simulate responses and stored runs. */
export interface SimulationResultsPayload {
  statevector: SimulationAmplitude[];
  probabilities: Record<string, number>;
  counts: Record<string, number>;
}

/** A persisted simulation run (summary row on the Simulations page). */
export interface SimulationRunSummary {
  id: string;
  circuitId: string | null;
  circuitName: string;
  engine: SimulationEngine;
  shots: number;
  numQubits: number;
  status: 'completed' | 'failed';
  executionTimeMs: number;
  createdAt: string;
}

/** A persisted simulation run including its results. */
export interface SimulationRunDetail extends SimulationRunSummary {
  results: SimulationResultsPayload;
}

/** Response from GET /simulations. */
export interface SimulationListResponse {
  simulations: SimulationRunSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Complex {
  real: number;
  imaginary: number;
}

// Auth types
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Job types (async job engine)
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** The result payload of a completed simulation job. */
export interface SimulationJobResult {
  status: string;
  numQubits: number;
  requestedEngine: SimulationEngine;
  shots: number;
  results: SimulationResult['results'];
  metadata: { executionTimeMs: number; memoryUsageBytes: number };
}

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  result?: SimulationJobResult | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
}

// Density-matrix noise simulation
export interface NoiseChannelConfig {
  type: 'depolarizing' | 'amplitude_damping' | 'phase_damping' | 'bit_flip' | 'phase_flip';
  params: { p?: number; gamma?: number; lambda?: number };
}

export interface NoiseSimulationResult {
  engine: string;
  numQubits: number;
  purity: number;
  fidelity?: number;
  probabilities: Record<string, number>;
  counts: Record<string, number>;
  executionTimeMs: number;
}

// Execution backends
export interface BackendCapabilities {
  maxQubits: number;
  nativeGates: string[];
  supportsNoise: boolean;
  connectivity: string;
  simulated: boolean;
}

export interface Backend {
  id: string;
  name: string;
  type: string;
  description: string;
  available: boolean;
  capabilities: BackendCapabilities;
}

export interface BackendListResponse {
  backends: Backend[];
}

// Gate types
export interface GateDefinition {
  name: string;
  symbol: string;
  description: string;
  numQubits: number;
  params?: string[];
  color: string;
  category: 'single' | 'multi' | 'rotation' | 'measurement';
}

// Visualization types
export interface BlochSphereData {
  theta: number;
  phi: number;
  x: number;
  y: number;
  z: number;
}

export interface HistogramData {
  labels: string[];
  values: number[];
}

// Error correction types
export interface QECCode {
  id: string;
  name: string;
  n: number;
  k: number;
  d: number;
  description: string;
}

// Noise types
export interface NoiseChannel {
  id: string;
  name: string;
  params: string[];
  description: string;
}

// ML types
export interface VQERequest {
  hamiltonian: number[][];
  ansatz: string;
  optimizer?: string;
  maxIterations?: number;
}

export interface VQEResult {
  energy: number;
  parameters: number[];
  iterations: number;
  converged: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket types
export interface WebSocketMessage {
  event: string;
  data: unknown;
  timestamp: number;
}

export interface JobStatusMessage {
  jobId: string;
  status: string;
  progress: number;
  result?: unknown;
  error?: string;
}

// UI types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface Modal {
  id: string;
  title: string;
  content: React.ReactNode;
  onClose?: () => void;
}

// Algorithms
export type AlgorithmCategory =
  | 'fundamental'
  | 'search'
  | 'optimization'
  | 'cryptography';

export interface AlgorithmSummary {
  name: string;
  description: string;
  category: AlgorithmCategory;
}

export interface AlgorithmListResponse {
  count: number;
  algorithms: AlgorithmSummary[];
}

/** A single execution result (the `result` payload shape varies per algorithm). */
export interface AlgorithmRunResponse {
  algorithm: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
}

/** A single weighted Pauli term acting on a set of qubits. */
export interface PauliTerm {
  coefficient: number;
  paulis: string[];
  qubits: number[];
}

/** A VQE example Hamiltonian is a sum of Pauli terms. */
export type VqeExample = PauliTerm[];

export interface QaoaExample {
  n: number;
  edges: [number, number][];
}

export type VqeExamplesResponse = { examples: Record<string, VqeExample> };
export type QaoaExamplesResponse = { examples: Record<string, QaoaExample> };
