/**
 * Execution backends hook — lists the available targets (simulators, emulated
 * device, real hardware) and their capabilities/availability.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { BackendListResponse } from '@/types';

const BACKENDS_KEY = 'backends';

/** List the available execution backends. */
export function useBackends() {
  return useQuery({
    queryKey: [BACKENDS_KEY],
    queryFn: () => api.get<BackendListResponse>('/backends'),
    staleTime: 5 * 60 * 1000,
  });
}
