/**
 * Density-matrix noise simulation hook.
 *
 * Runs a circuit under noise on the server's density-matrix engine and returns
 * purity, fidelity, probabilities, and sampled counts.
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { NoiseChannelConfig, NoiseSimulationResult, SimulationOperation } from '@/types';

export interface NoiseSimulationInput {
  numQubits: number;
  operations?: SimulationOperation[];
  noise?: NoiseChannelConfig[];
  shots?: number;
  computeFidelity?: boolean;
}

/** Run a density-matrix noise simulation. */
export function useNoiseSimulation() {
  return useMutation({
    mutationFn: (input: NoiseSimulationInput) =>
      api.post<NoiseSimulationResult>('/advanced/noise/simulate', input),
  });
}
