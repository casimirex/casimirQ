/**
 * In-Memory Simulations Repository
 *
 * Process-local, Map-backed implementation of SimulationsRepository for
 * development and tests. Swap the ApiModule binding for a database-backed
 * implementation without touching the controllers.
 */

import { Injectable } from '@nestjs/common';
import {
  CreateSimulationInput,
  PaginatedSimulations,
  PaginationOptions,
  SimulationsRepository,
  StoredSimulation,
} from './simulations.repository';

@Injectable()
export class InMemorySimulationsRepository extends SimulationsRepository {
  private readonly simulations = new Map<string, StoredSimulation>();
  private sequence = 0;

  async create(userId: string, input: CreateSimulationInput): Promise<StoredSimulation> {
    this.sequence += 1;
    const simulation: StoredSimulation = {
      id: `sim-${Date.now()}-${this.sequence}`,
      userId,
      ...input,
      results: this.cloneResults(input.results),
      createdAt: new Date().toISOString(),
    };
    this.simulations.set(simulation.id, simulation);
    return this.clone(simulation);
  }

  async findAll(userId: string, options: PaginationOptions): Promise<PaginatedSimulations> {
    // Insertion order is oldest-first; reverse for newest-first (tie-free).
    const owned = Array.from(this.simulations.values())
      .filter((s) => s.userId === userId)
      .reverse();

    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const start = (page - 1) * limit;
    return {
      items: owned.slice(start, start + limit).map((s) => this.clone(s)),
      total: owned.length,
    };
  }

  async findById(userId: string, id: string): Promise<StoredSimulation | null> {
    const simulation = this.simulations.get(id);
    if (!simulation || simulation.userId !== userId) {
      return null;
    }
    return this.clone(simulation);
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const simulation = this.simulations.get(id);
    if (!simulation || simulation.userId !== userId) {
      return false;
    }
    return this.simulations.delete(id);
  }

  private clone(simulation: StoredSimulation): StoredSimulation {
    return { ...simulation, results: this.cloneResults(simulation.results) };
  }

  private cloneResults(results: StoredSimulation['results']): StoredSimulation['results'] {
    return {
      statevector: results.statevector.map((a) => ({ ...a })),
      probabilities: { ...results.probabilities },
      counts: { ...results.counts },
    };
  }
}
