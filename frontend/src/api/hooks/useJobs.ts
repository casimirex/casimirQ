/**
 * Async job engine hooks.
 *
 * Submitting a simulation returns immediately with a queued job; the list query
 * polls while any job is still queued/running so progress updates live.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Job, JobListResponse, SimulationEngine, SimulationOperation } from '@/types';

const JOBS_KEY = 'jobs';

export interface SubmitJobInput {
  circuitName?: string;
  numQubits: number;
  operations?: SimulationOperation[];
  engine?: SimulationEngine;
  /** Run on a specific backend; omit for the default runner. */
  backendId?: string;
  shots?: number;
}

/** List the current user's jobs, polling while any are still active. */
export function useJobs(page = 1, limit = 20) {
  return useQuery({
    queryKey: [JOBS_KEY, { page, limit }],
    queryFn: () => api.get<JobListResponse>(`/jobs?page=${page}&limit=${limit}`),
    refetchInterval: (query) => {
      const active = query.state.data?.jobs.some(
        (j) => j.status === 'queued' || j.status === 'running',
      );
      return active ? 800 : false;
    },
  });
}

/** Submit an asynchronous simulation job. */
export function useSubmitJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitJobInput) => api.post<Job>('/jobs', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [JOBS_KEY] });
    },
  });
}

/** Cancel a still-queued job. */
export function useCancelJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Job>(`/jobs/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [JOBS_KEY] });
    },
  });
}

/** Delete a job. */
export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/jobs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [JOBS_KEY] });
    },
  });
}
