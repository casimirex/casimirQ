/**
 * Circuit API Hooks
 * React Query hooks for circuit CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import type {
  Circuit,
  CircuitOperation,
  CircuitListResponse,
  SimulationOperation,
  SimulationResult,
  SimulationEngine,
} from '@/types';

const CIRCUITS_KEY = 'circuits';

/**
 * Get all circuits with pagination
 */
export function useCircuits(page = 1, limit = 20) {
  return useQuery({
    queryKey: [CIRCUITS_KEY, { page, limit }],
    queryFn: async () => {
      const response = await api.get<CircuitListResponse>(
        `/circuits?page=${page}&limit=${limit}`
      );
      return response;
    },
  });
}

/**
 * Get a single circuit by ID
 */
export function useCircuit(id: string | null) {
  return useQuery({
    queryKey: [CIRCUITS_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const response = await api.get<Circuit>(`/circuits/${id}`);
      return response;
    },
    enabled: !!id,
  });
}

/**
 * Create a new circuit
 */
export function useCreateCircuit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      numQubits: number;
      operations?: CircuitOperation[];
    }) => {
      const response = await api.post<Circuit>('/circuits', data);
      return response;
    },
    onSuccess: () => {
      // Invalidate circuits list
      queryClient.invalidateQueries({ queryKey: [CIRCUITS_KEY] });
    },
  });
}

/**
 * Update an existing circuit
 */
export function useUpdateCircuit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Circuit>;
    }) => {
      const response = await api.put<Circuit>(`/circuits/${id}`, data);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific circuit and list
      queryClient.invalidateQueries({
        queryKey: [CIRCUITS_KEY, variables.id],
      });
      queryClient.invalidateQueries({ queryKey: [CIRCUITS_KEY] });
    },
  });
}

/**
 * Delete a circuit
 */
export function useDeleteCircuit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/circuits/${id}`);
      return id;
    },
    onSuccess: (id) => {
      // Drop the deleted circuit's detail cache so no observer refetches it
      // (which would 404). Only invalidate list queries (object second key),
      // not detail queries (string second key).
      queryClient.removeQueries({ queryKey: [CIRCUITS_KEY, id] });
      queryClient.invalidateQueries({
        queryKey: [CIRCUITS_KEY],
        predicate: (query) => typeof query.queryKey[1] !== 'string',
      });
    },
  });
}

/**
 * Input for running a simulation. The circuit definition is sent inline
 * (numQubits + operations) since circuits are not yet persisted server-side.
 */
export interface SimulateCircuitInput {
  circuitId: string;
  numQubits: number;
  operations: SimulationOperation[];
  engine?: SimulationEngine;
  shots?: number;
  seed?: number;
}

/**
 * Simulate a circuit. Returns real results synchronously (the backend runs
 * the circuit on the statevector engine and returns statevector,
 * probabilities and sampled measurement counts).
 */
export function useSimulateCircuit() {
  return useMutation<SimulationResult, Error, SimulateCircuitInput>({
    mutationFn: async ({ circuitId, numQubits, operations, engine, shots, seed }) => {
      return api.post<SimulationResult>(`/circuits/${circuitId}/simulate`, {
        numQubits,
        operations,
        engine,
        shots,
        seed,
      });
    },
  });
}
