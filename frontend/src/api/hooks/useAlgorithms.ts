/**
 * Quantum algorithms API hooks.
 *
 * Wraps the backend `/algorithms` endpoints: listing the available algorithms,
 * fetching example inputs (VQE Hamiltonians / QAOA graphs), and executing an
 * algorithm with user-supplied parameters.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type {
  AlgorithmListResponse,
  AlgorithmRunResponse,
  QaoaExamplesResponse,
  VqeExamplesResponse,
} from '@/types';

const ALGORITHMS_KEY = 'algorithms';

/** Slugs of the executable algorithm endpoints (`POST /algorithms/<slug>`). */
export type AlgorithmSlug = 'qft' | 'grover' | 'vqe' | 'qaoa' | 'teleport' | 'shor';

/**
 * List the algorithms the backend can run.
 */
export function useAlgorithms() {
  return useQuery({
    queryKey: [ALGORITHMS_KEY, 'list'],
    queryFn: () => api.get<AlgorithmListResponse>('/algorithms'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the example Hamiltonians used to seed a VQE run.
 */
export function useVqeExamples() {
  return useQuery({
    queryKey: [ALGORITHMS_KEY, 'vqe-examples'],
    queryFn: () => api.get<VqeExamplesResponse>('/algorithms/vqe/examples'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch the example graphs used to seed a QAOA run.
 */
export function useQaoaExamples() {
  return useQuery({
    queryKey: [ALGORITHMS_KEY, 'qaoa-examples'],
    queryFn: () => api.get<QaoaExamplesResponse>('/algorithms/qaoa/examples'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Execute an algorithm. The body shape depends on the algorithm; callers build
 * it from the algorithm catalog (see `lib/algorithmCatalog.ts`).
 */
export function useRunAlgorithm() {
  return useMutation({
    mutationFn: ({ slug, body }: { slug: AlgorithmSlug; body: Record<string, unknown> }) =>
      api.post<AlgorithmRunResponse>(`/algorithms/${slug}`, body),
  });
}
