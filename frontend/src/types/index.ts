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

// Job types
export interface Job {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: string;
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  result?: unknown;
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
