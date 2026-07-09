/**
 * In-Memory Circuits Repository
 *
 * A process-local, Map-backed implementation of CircuitsRepository. Suitable
 * for development and tests; swap the provider binding in ApiModule for a
 * database-backed implementation without touching the controllers.
 */

import { Injectable } from '@nestjs/common';
import {
  CircuitsRepository,
  CreateCircuitInput,
  PaginatedCircuits,
  PaginationOptions,
  StoredCircuit,
  UpdateCircuitInput,
} from './circuits.repository';

@Injectable()
export class InMemoryCircuitsRepository extends CircuitsRepository {
  private readonly circuits = new Map<string, StoredCircuit>();
  private sequence = 0;

  async create(userId: string, input: CreateCircuitInput): Promise<StoredCircuit> {
    const now = new Date().toISOString();
    const circuit: StoredCircuit = {
      id: this.nextId(),
      userId,
      name: input.name,
      numQubits: input.numQubits,
      operations: this.cloneOperations(input.operations ?? []),
      createdAt: now,
      updatedAt: now,
    };
    this.circuits.set(circuit.id, circuit);
    return { ...circuit };
  }

  async findAll(userId: string, options: PaginationOptions): Promise<PaginatedCircuits> {
    // Map iteration preserves insertion order (oldest first); reverse for
    // newest-first. This is tie-free even for circuits created in the same ms.
    const owned = Array.from(this.circuits.values())
      .filter((c) => c.userId === userId)
      .reverse();

    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const start = (page - 1) * limit;
    const items = owned.slice(start, start + limit).map((c) => ({ ...c }));

    return { items, total: owned.length };
  }

  async findById(userId: string, id: string): Promise<StoredCircuit | null> {
    const circuit = this.circuits.get(id);
    if (!circuit || circuit.userId !== userId) {
      return null;
    }
    return { ...circuit };
  }

  async update(
    userId: string,
    id: string,
    patch: UpdateCircuitInput,
  ): Promise<StoredCircuit | null> {
    const circuit = this.circuits.get(id);
    if (!circuit || circuit.userId !== userId) {
      return null;
    }

    if (patch.name !== undefined) {
      circuit.name = patch.name;
    }
    if (patch.operations !== undefined) {
      circuit.operations = this.cloneOperations(patch.operations);
    }
    circuit.updatedAt = new Date().toISOString();

    this.circuits.set(id, circuit);
    return { ...circuit };
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const circuit = this.circuits.get(id);
    if (!circuit || circuit.userId !== userId) {
      return false;
    }
    return this.circuits.delete(id);
  }

  private nextId(): string {
    this.sequence += 1;
    return `circuit-${Date.now()}-${this.sequence}`;
  }

  private cloneOperations(operations: StoredCircuit['operations']): StoredCircuit['operations'] {
    return operations.map((op) => ({
      gate: op.gate,
      targets: [...op.targets],
      ...(op.params ? { params: [...op.params] } : {}),
    }));
  }
}
