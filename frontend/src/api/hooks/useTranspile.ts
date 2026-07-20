/**
 * Transpilation hook.
 *
 * Rewrites a circuit into the native gate basis {rz, ry, cx} and, when a
 * connectivity is given, routes it with SWAPs. Returns the native operations,
 * gate-count growth, and — when routed — the qubit layout and SWAP count.
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { TranspileRequest, TranspileResult } from '@/types';

/** Transpile a circuit into the native basis, optionally routing it. */
export function useTranspile() {
  return useMutation({
    mutationFn: (input: TranspileRequest) => api.post<TranspileResult>('/transpile', input),
  });
}
