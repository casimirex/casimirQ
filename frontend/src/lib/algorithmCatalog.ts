/**
 * Catalog of the quantum algorithms exposed by the backend `/algorithms` API.
 *
 * The list here mirrors exactly what the server can execute (see
 * `AlgorithmsService.getAvailableAlgorithms`). Each entry declares the input
 * fields the UI should collect so the Algorithms page can build a run request
 * without hard-coding per-algorithm forms.
 */

import { Atom, Key, Search, Send, Share2, Sparkles, type LucideIcon } from 'lucide-react';
import type { AlgorithmCategory } from '@/types';
import type { AlgorithmSlug } from '@/api/hooks/useAlgorithms';

export interface NumberField {
  key: string;
  label: string;
  kind: 'int' | 'float';
  default: number;
  min?: number;
  max?: number;
  /** Optional fields may be left blank, in which case they are omitted. */
  optional?: boolean;
  help?: string;
}

export interface AlgorithmSpec {
  slug: AlgorithmSlug;
  name: string;
  description: string;
  category: AlgorithmCategory;
  complexity: string;
  icon: LucideIcon;
  /** Plain numeric inputs collected from the user. */
  fields: NumberField[];
  /** If set, the run also requires picking an example input of this kind. */
  usesExample?: 'vqe' | 'qaoa';
}

export const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
  fundamental: 'Fundamental',
  search: 'Search',
  optimization: 'Optimization',
  cryptography: 'Cryptography',
};

const MAX_QUBITS = 16;

export const ALGORITHM_CATALOG: AlgorithmSpec[] = [
  {
    slug: 'qft',
    name: 'Quantum Fourier Transform',
    description:
      'Transforms a quantum state into the Fourier basis — the workhorse behind phase estimation and Shor’s algorithm.',
    category: 'fundamental',
    complexity: 'O(n²)',
    icon: Sparkles,
    fields: [
      { key: 'n', label: 'Qubits (n)', kind: 'int', default: 3, min: 1, max: MAX_QUBITS },
    ],
  },
  {
    slug: 'grover',
    name: "Grover's Search",
    description: 'Finds a marked item in an unstructured database with a quadratic speedup.',
    category: 'search',
    complexity: 'O(√N)',
    icon: Search,
    fields: [
      { key: 'n', label: 'Qubits (n)', kind: 'int', default: 4, min: 1, max: MAX_QUBITS },
      {
        key: 'markedItem',
        label: 'Marked item',
        kind: 'int',
        default: 9,
        min: 0,
        help: 'The basis state to search for (0 ≤ item < 2ⁿ).',
      },
      {
        key: 'iterations',
        label: 'Iterations',
        kind: 'int',
        default: 0,
        min: 1,
        optional: true,
        help: 'Leave blank to use the optimal ≈ π/4·√N iterations.',
      },
    ],
  },
  {
    slug: 'vqe',
    name: 'Variational Quantum Eigensolver',
    description:
      'A hybrid quantum–classical loop that estimates the ground-state energy of a Hamiltonian.',
    category: 'optimization',
    complexity: 'Iterative',
    icon: Atom,
    usesExample: 'vqe',
    fields: [
      {
        key: 'maxIterations',
        label: 'Max iterations',
        kind: 'int',
        default: 100,
        min: 1,
        optional: true,
      },
    ],
  },
  {
    slug: 'qaoa',
    name: 'Quantum Approximate Optimization Algorithm',
    description: 'Finds approximate solutions to combinatorial problems such as MaxCut.',
    category: 'optimization',
    complexity: 'Iterative',
    icon: Share2,
    usesExample: 'qaoa',
    fields: [
      {
        key: 'p',
        label: 'Layers (p)',
        kind: 'int',
        default: 1,
        min: 1,
        help: 'Number of QAOA layers (circuit depth).',
      },
    ],
  },
  {
    slug: 'teleport',
    name: 'Quantum Teleportation',
    description: 'Transfers an unknown qubit state across a shared entangled pair.',
    category: 'fundamental',
    complexity: 'O(1)',
    icon: Send,
    fields: [
      { key: 'alpha', label: 'Amplitude α', kind: 'float', default: 0.6 },
      { key: 'beta', label: 'Amplitude β', kind: 'float', default: 0.8 },
    ],
  },
  {
    slug: 'shor',
    name: "Shor's Algorithm",
    description: 'Factors integers in polynomial time via quantum period finding.',
    category: 'cryptography',
    complexity: 'O((log N)³)',
    icon: Key,
    fields: [{ key: 'N', label: 'Number to factor (N)', kind: 'int', default: 15, min: 2 }],
  },
];
