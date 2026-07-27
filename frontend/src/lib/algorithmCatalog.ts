/**
 * Catalog of the quantum algorithms exposed by the backend `/algorithms` API.
 *
 * The list here mirrors exactly what the server can execute (see
 * `AlgorithmsService.getAvailableAlgorithms`). Each entry declares the input
 * fields the UI should collect so the Algorithms page can build a run request
 * without hard-coding per-algorithm forms.
 */

import {
  Atom,
  Binary,
  Calculator,
  Clock,
  Fingerprint,
  Footprints,
  Gauge,
  Key,
  Search,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type { AlgorithmCategory } from '@/types';
import type { AlgorithmSlug } from '@/api/hooks/useAlgorithms';

interface FieldBase {
  key: string;
  label: string;
  /** Optional fields may be left blank, in which case they are omitted. */
  optional?: boolean;
  help?: string;
}

/** A plain numeric input. */
export interface NumberField extends FieldBase {
  kind: 'int' | 'float';
  default: number;
  min?: number;
  max?: number;
}

/** A dropdown of fixed choices; `numeric` coerces the value to a number. */
export interface SelectField extends FieldBase {
  kind: 'select';
  default: string;
  options: { label: string; value: string }[];
  numeric?: boolean;
}

/** A boolean toggle. */
export interface BoolField extends FieldBase {
  kind: 'bool';
  default: boolean;
}

/** A comma-separated list of numbers (e.g. `"1.57, 1.05"`). */
export interface ListField extends FieldBase {
  kind: 'intList' | 'floatList';
  default: string;
}

export type AlgorithmField = NumberField | SelectField | BoolField | ListField;

/** A named bundle of request fields merged in when selected (e.g. a Hamiltonian). */
export interface PresetOption {
  label: string;
  body: Record<string, unknown>;
}

export interface AlgorithmSpec {
  slug: AlgorithmSlug;
  name: string;
  description: string;
  category: AlgorithmCategory;
  complexity: string;
  icon: LucideIcon;
  /** Inputs collected from the user. */
  fields: AlgorithmField[];
  /** If set, the run also requires picking an example input of this kind. */
  usesExample?: 'vqe' | 'qaoa';
  /** If set, the run requires picking a preset that supplies extra body fields. */
  presets?: { label: string; options: PresetOption[] };
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
    description:
      'Factors integers via genuine quantum order finding (phase estimation of modular multiplication).',
    category: 'cryptography',
    complexity: 'O((log N)³)',
    icon: Key,
    fields: [
      {
        key: 'N',
        label: 'Number to factor (N)',
        kind: 'int',
        default: 15,
        min: 2,
        max: 32,
        help: 'Odd composite. Capped at 32 by the simulator’s qubit budget (e.g. 15, 21).',
      },
    ],
  },
  {
    slug: 'deutsch-jozsa',
    name: 'Deutsch-Jozsa',
    description:
      'Decides whether a boolean oracle is constant or balanced with a single query — the first exponential quantum speedup.',
    category: 'fundamental',
    complexity: 'O(1) queries',
    icon: Binary,
    fields: [
      { key: 'n', label: 'Qubits (n)', kind: 'int', default: 3, min: 1, max: 15 },
      {
        key: 'oracle',
        label: 'Oracle type',
        kind: 'select',
        default: 'balanced',
        options: [
          { label: 'Balanced', value: 'balanced' },
          { label: 'Constant', value: 'constant' },
        ],
      },
      {
        key: 'mask',
        label: 'Balanced mask',
        kind: 'int',
        default: 0,
        min: 1,
        optional: true,
        help: 'Parity mask for a balanced oracle (blank = all ones).',
      },
      {
        key: 'value',
        label: 'Constant value',
        kind: 'select',
        default: '0',
        numeric: true,
        options: [
          { label: '0', value: '0' },
          { label: '1', value: '1' },
        ],
        help: 'Output of a constant oracle (ignored when balanced).',
      },
    ],
  },
  {
    slug: 'bernstein-vazirani',
    name: 'Bernstein-Vazirani',
    description: 'Recovers a hidden bit string s from f(x)=s·x with a single oracle query.',
    category: 'fundamental',
    complexity: 'O(1) queries',
    icon: Fingerprint,
    fields: [
      { key: 'n', label: 'Qubits (n)', kind: 'int', default: 5, min: 1, max: 15 },
      {
        key: 'secret',
        label: 'Hidden string s',
        kind: 'int',
        default: 21,
        min: 0,
        help: 'The secret to recover (0 ≤ s < 2ⁿ).',
      },
    ],
  },
  {
    slug: 'simon',
    name: "Simon's Algorithm",
    description:
      'Finds the hidden period of a 2-to-1 function with exponential speedup — the ancestor of Shor’s period finding.',
    category: 'fundamental',
    complexity: 'O(n) queries',
    icon: Waves,
    fields: [
      { key: 'n', label: 'Qubits (n)', kind: 'int', default: 3, min: 1, max: 8 },
      {
        key: 'secret',
        label: 'Hidden period s',
        kind: 'int',
        default: 6,
        min: 0,
        help: 'The period to recover (0 ≤ s < 2ⁿ). Uses 2n qubits total.',
      },
    ],
  },
  {
    slug: 'phase-estimation',
    name: 'Quantum Phase Estimation',
    description:
      'Estimates the eigenphase of a unitary to t bits of precision — the subroutine behind Shor and HHL.',
    category: 'fundamental',
    complexity: 'O(t²)',
    icon: Gauge,
    fields: [
      {
        key: 'phi',
        label: 'Eigenphase φ',
        kind: 'float',
        default: 0.375,
        min: 0,
        max: 0.999,
        help: '0 ≤ φ < 1 (exact when φ is a multiple of 1/2ᵗ).',
      },
      {
        key: 'precision',
        label: 'Counting qubits (t)',
        kind: 'int',
        default: 4,
        min: 1,
        max: 15,
      },
    ],
  },
  {
    slug: 'amplitude-amplification',
    name: 'Quantum Amplitude Amplification',
    description:
      'Grover generalised to an arbitrary state preparation — amplifies the good-state probability toward 1.',
    category: 'search',
    complexity: 'O(1/√a)',
    icon: TrendingUp,
    fields: [
      {
        key: 'angles',
        label: 'Prep angles (RY, per qubit)',
        kind: 'floatList',
        default: '1.5708, 1.0472, 1.2566',
        help: 'Comma-separated RY angles; the count sets the qubit number.',
      },
      {
        key: 'goodStates',
        label: 'Good states',
        kind: 'intList',
        default: '7',
        help: 'Comma-separated basis states to amplify.',
      },
      {
        key: 'iterations',
        label: 'Iterations',
        kind: 'int',
        default: 0,
        min: 0,
        optional: true,
        help: 'Leave blank to use the optimal count.',
      },
    ],
  },
  {
    slug: 'quantum-walk',
    name: 'Quantum Walk',
    description:
      'A discrete-time coined walk on a cycle — spreads ballistically (∝ T) versus a classical walk’s √T.',
    category: 'search',
    complexity: 'σ ∝ T',
    icon: Footprints,
    fields: [
      { key: 'n', label: 'Position qubits (n)', kind: 'int', default: 5, min: 1, max: 15 },
      { key: 'steps', label: 'Steps', kind: 'int', default: 10, min: 0, max: 64 },
      {
        key: 'start',
        label: 'Start node',
        kind: 'int',
        default: 0,
        min: 0,
        optional: true,
        help: 'Blank = cycle midpoint 2ⁿ⁻¹.',
      },
      {
        key: 'symmetricCoin',
        label: 'Symmetric coin',
        kind: 'bool',
        default: true,
        help: 'Prepare (|0⟩+i|1⟩)/√2 for a symmetric distribution.',
      },
    ],
  },
  {
    slug: 'hamiltonian-simulation',
    name: 'Hamiltonian Simulation',
    description:
      'Trotterized time evolution e^{-iHt} of a Pauli-sum Hamiltonian — the core of digital quantum simulation.',
    category: 'fundamental',
    complexity: 'O(r · L)',
    icon: Clock,
    presets: {
      label: 'Hamiltonian',
      options: [
        {
          label: 'Single spin (H = X)',
          body: { n: 1, terms: [{ coefficient: 1, paulis: ['X'], qubits: [0] }] },
        },
        {
          label: 'Non-commuting (H = X + Z)',
          body: {
            n: 1,
            terms: [
              { coefficient: 1, paulis: ['X'], qubits: [0] },
              { coefficient: 1, paulis: ['Z'], qubits: [0] },
            ],
          },
        },
        {
          label: 'Two-qubit (H = ZZ, from |11⟩)',
          body: {
            n: 2,
            terms: [{ coefficient: 1, paulis: ['Z', 'Z'], qubits: [0, 1] }],
            initialOnes: [0, 1],
          },
        },
      ],
    },
    fields: [
      { key: 'time', label: 'Evolution time t', kind: 'float', default: 1.0 },
      {
        key: 'steps',
        label: 'Trotter steps',
        kind: 'int',
        default: 20,
        min: 1,
        max: 1000,
        optional: true,
      },
      {
        key: 'order',
        label: 'Trotter order',
        kind: 'select',
        default: '1',
        numeric: true,
        options: [
          { label: '1 — Lie-Trotter', value: '1' },
          { label: '2 — symmetric Suzuki', value: '2' },
        ],
      },
    ],
  },
  {
    slug: 'hhl',
    name: 'HHL Algorithm',
    description:
      'Solves the linear system A x = b (canonical 2×2 A = 1.5·I + 0.5·X), preparing |x⟩ ∝ A⁻¹|b⟩.',
    category: 'fundamental',
    complexity: 'O(log N · κ²/ε)',
    icon: Calculator,
    fields: [
      { key: 'b0', label: 'RHS b₀', kind: 'float', default: 1 },
      { key: 'b1', label: 'RHS b₁', kind: 'float', default: 0 },
    ],
  },
];
