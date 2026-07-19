/**
 * Simulation history API hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { SimulationListResponse, SimulationRunDetail } from '@/types';

const SIMULATIONS_KEY = 'simulations';

/**
 * List the current user's simulation runs (most recent first).
 */
export function useSimulations(page = 1, limit = 20) {
  return useQuery({
    queryKey: [SIMULATIONS_KEY, { page, limit }],
    queryFn: () =>
      api.get<SimulationListResponse>(`/simulations?page=${page}&limit=${limit}`),
  });
}

/**
 * Fetch a single simulation run (including results).
 */
export function useSimulation(id: string | null) {
  return useQuery({
    queryKey: [SIMULATIONS_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      return api.get<SimulationRunDetail>(`/simulations/${id}`);
    },
    enabled: !!id,
  });
}

/**
 * Delete a simulation run from history.
 */
export function useDeleteSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/simulations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SIMULATIONS_KEY] });
    },
  });
}
