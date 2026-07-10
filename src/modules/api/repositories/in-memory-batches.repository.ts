/**
 * In-Memory Batches Repository
 */

import { Injectable } from '@nestjs/common';
import {
  BatchesRepository,
  CreateBatchInput,
  PaginatedBatches,
  PaginationOptions,
  StoredBatch,
} from './batches.repository';

@Injectable()
export class InMemoryBatchesRepository extends BatchesRepository {
  private readonly batches = new Map<string, StoredBatch>();
  private sequence = 0;

  async create(userId: string, input: CreateBatchInput): Promise<StoredBatch> {
    this.sequence += 1;
    const batch: StoredBatch = {
      id: `batch-${Date.now()}-${this.sequence}`,
      userId,
      ...input,
      entries: input.entries.map((e) => ({ ...e })),
      createdAt: new Date().toISOString(),
    };
    this.batches.set(batch.id, batch);
    return this.clone(batch);
  }

  async findById(userId: string, id: string): Promise<StoredBatch | null> {
    const batch = this.batches.get(id);
    if (!batch || batch.userId !== userId) {
      return null;
    }
    return this.clone(batch);
  }

  async findAll(userId: string, options: PaginationOptions): Promise<PaginatedBatches> {
    const owned = Array.from(this.batches.values())
      .filter((b) => b.userId === userId)
      .reverse();
    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    const start = (page - 1) * limit;
    return {
      items: owned.slice(start, start + limit).map((b) => this.clone(b)),
      total: owned.length,
    };
  }

  private clone(batch: StoredBatch): StoredBatch {
    return { ...batch, entries: batch.entries.map((e) => ({ ...e })) };
  }
}
