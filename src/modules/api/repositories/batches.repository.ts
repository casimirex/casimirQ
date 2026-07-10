/**
 * Batches Repository
 *
 * Persistence contract for batch executions — a batch runs several stored
 * circuits and links to the resulting simulation runs. Scoped per user.
 */

export interface BatchEntry {
  circuitId: string;
  circuitName: string;
  simulationId: string | null;
  status: 'completed' | 'failed';
  error?: string;
}

export interface StoredBatch {
  id: string;
  userId: string;
  status: 'completed' | 'partial' | 'failed';
  total: number;
  succeeded: number;
  failed: number;
  entries: BatchEntry[];
  createdAt: string;
}

export interface CreateBatchInput {
  status: StoredBatch['status'];
  total: number;
  succeeded: number;
  failed: number;
  entries: BatchEntry[];
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedBatches {
  items: StoredBatch[];
  total: number;
}

export abstract class BatchesRepository {
  abstract create(userId: string, input: CreateBatchInput): Promise<StoredBatch>;
  abstract findById(userId: string, id: string): Promise<StoredBatch | null>;
  abstract findAll(userId: string, options: PaginationOptions): Promise<PaginatedBatches>;
}
