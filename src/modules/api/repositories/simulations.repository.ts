/**
 * Simulations Repository
 *
 * Persistence contract for simulation runs (the history shown on the
 * Simulations page). Concrete implementations (in-memory, Postgres) are bound
 * in the ApiModule, so controllers depend only on this interface.
 */

export interface SimulationResults {
  statevector: Array<{ state: string; re: number; im: number; probability: number }>;
  probabilities: Record<string, number>;
  counts: Record<string, number>;
}

export interface StoredSimulation {
  id: string;
  userId: string;
  circuitId: string | null;
  circuitName: string;
  engine: string;
  shots: number;
  numQubits: number;
  status: 'completed' | 'failed';
  results: SimulationResults;
  executionTimeMs: number;
  createdAt: string;
}

export interface CreateSimulationInput {
  circuitId: string | null;
  circuitName: string;
  engine: string;
  shots: number;
  numQubits: number;
  status: 'completed' | 'failed';
  results: SimulationResults;
  executionTimeMs: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedSimulations {
  items: StoredSimulation[];
  total: number;
}

/**
 * Persistence contract for simulation runs, scoped to a user.
 */
export abstract class SimulationsRepository {
  abstract create(userId: string, input: CreateSimulationInput): Promise<StoredSimulation>;
  abstract findAll(userId: string, options: PaginationOptions): Promise<PaginatedSimulations>;
  abstract findById(userId: string, id: string): Promise<StoredSimulation | null>;
  abstract delete(userId: string, id: string): Promise<boolean>;
}
