/**
 * Circuits Repository
 *
 * Abstract persistence contract for user circuits. Concrete implementations
 * (in-memory today, a database tomorrow) are bound in the ApiModule, so the
 * controllers depend only on this interface.
 */

export interface CircuitOperationRecord {
  gate: string;
  targets: number[];
  params?: number[];
}

export interface StoredCircuit {
  id: string;
  userId: string;
  name: string;
  numQubits: number;
  operations: CircuitOperationRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCircuitInput {
  name: string;
  numQubits: number;
  operations?: CircuitOperationRecord[];
}

export interface UpdateCircuitInput {
  name?: string;
  operations?: CircuitOperationRecord[];
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedCircuits {
  items: StoredCircuit[];
  total: number;
}

/**
 * Persistence contract for circuits. All operations are scoped to a user so
 * that one user can never read or mutate another user's circuits.
 *
 * Methods are asynchronous so the contract fits both an in-memory store and a
 * database-backed implementation.
 */
export abstract class CircuitsRepository {
  abstract create(userId: string, input: CreateCircuitInput): Promise<StoredCircuit>;
  abstract findAll(userId: string, options: PaginationOptions): Promise<PaginatedCircuits>;
  abstract findById(userId: string, id: string): Promise<StoredCircuit | null>;
  abstract update(
    userId: string,
    id: string,
    patch: UpdateCircuitInput,
  ): Promise<StoredCircuit | null>;
  abstract delete(userId: string, id: string): Promise<boolean>;
}
