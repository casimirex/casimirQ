/**
 * Job domain model.
 *
 * A Job is an asynchronous unit of work submitted by a user. It is created in
 * the `queued` state, transitions to `running` while a processor executes it,
 * and settles in a terminal state (`completed`, `failed`, or `cancelled`).
 *
 * This module is pure domain: no framework, no I/O. Persistence and transport
 * live in the ports/adapters and interface layers.
 */

import { randomUUID } from 'crypto';

/** Lifecycle states of a job. */
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

/** The terminal states — a job in one of these will never change again. */
export const TERMINAL_STATUSES: readonly JobStatus[] = ['completed', 'failed', 'cancelled'];

/** Kinds of work the engine can run. New processors register new types. */
export type JobType = 'simulation';

/** A persisted job record. */
export interface Job {
  readonly id: string;
  readonly userId: string;
  readonly type: JobType;
  status: JobStatus;
  /** Progress in [0, 1]. */
  progress: number;
  /** Type-specific input, opaque to the engine. */
  readonly payload: unknown;
  /** Type-specific output, set on success. */
  result: unknown | null;
  /** Failure message, set on error. */
  error: string | null;
  readonly createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

/** Input required to create a new job. */
export interface NewJob {
  type: JobType;
  payload: unknown;
}

/** Whether a status is terminal (immutable). */
export function isTerminal(status: JobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Construct a fresh queued job for a user. */
export function createJob(userId: string, input: NewJob): Job {
  const now = new Date().toISOString();
  return {
    id: `job-${randomUUID()}`,
    userId,
    type: input.type,
    status: 'queued',
    progress: 0,
    payload: input.payload,
    result: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    finishedAt: null,
  };
}
