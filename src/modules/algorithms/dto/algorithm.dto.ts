/**
 * Request DTOs for the algorithms API.
 *
 * Kept in a `.dto.ts` file so the @nestjs/swagger CLI plugin introspects their
 * properties into the OpenAPI schema (and so the global ValidationPipe accepts
 * and sanitizes the bodies). Validation is via class-validator.
 */

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PauliTerm } from '../implementations/vqe';

// Upper bound on qubit counts accepted by the API (matches the engines' limits).
const MAX_QUBITS = 16;

/** DTO for QFT execution. */
export class QFTDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;
}

/** DTO for Grover's search. */
export class GroverDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;

  @IsInt()
  @Min(0)
  markedItem!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  iterations?: number;
}

/** DTO for VQE. */
export class VQEDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;

  @IsArray()
  hamiltonian!: PauliTerm[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxIterations?: number;
}

/** DTO for QAOA. */
export class QAOADto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;

  @IsArray()
  edges!: [number, number][];

  @IsOptional()
  @IsInt()
  @Min(1)
  p?: number;
}

/** DTO for Teleportation. */
export class TeleportDto {
  @IsNumber()
  alpha!: number;

  @IsNumber()
  beta!: number;
}

/** DTO for Shor's algorithm. */
export class ShorDto {
  // Genuine quantum order finding builds an O(3·⌈log₂N⌉)-qubit circuit run on
  // the statevector simulator, so N is capped by the qubit budget.
  @IsInt()
  @Min(2)
  @Max(32)
  N!: number;
}

/** DTO for the Deutsch-Jozsa algorithm. */
export class DeutschJozsaDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS - 1) // one qubit is reserved for the ancilla
  n!: number;

  /** Which kind of oracle to interrogate. */
  @IsIn(['constant', 'balanced'])
  oracle!: 'constant' | 'balanced';

  /** For a constant oracle: the value f returns for every input (default 0). */
  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  value?: 0 | 1;

  /** For a balanced oracle: the parity mask defining f(x)=(mask·x) mod 2. */
  @IsOptional()
  @IsInt()
  @Min(1)
  mask?: number;
}

/** DTO for the Bernstein-Vazirani algorithm. */
export class BernsteinVaziraniDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS - 1)
  n!: number;

  /** The hidden bit string s, as an integer in [0, 2^n). */
  @IsInt()
  @Min(0)
  secret!: number;
}

/** DTO for Simon's algorithm. */
export class SimonDto {
  @IsInt()
  @Min(1)
  @Max(Math.floor(MAX_QUBITS / 2)) // total qubits = 2n
  n!: number;

  /** The hidden period s, as an integer in [0, 2^n). */
  @IsInt()
  @Min(0)
  secret!: number;
}

/** DTO for the HHL linear-system solver (canonical 2×2 A = 1.5·I + 0.5·X). */
export class HHLDto {
  /** Amplitude of |0⟩ in the right-hand side b (need not be normalised). */
  @IsNumber()
  b0!: number;

  /** Amplitude of |1⟩ in the right-hand side b (need not be normalised). */
  @IsNumber()
  b1!: number;
}

/** DTO for Trotterized Hamiltonian simulation. */
export class HamiltonianSimulationDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;

  /** The Hamiltonian as a sum of weighted Pauli strings. */
  @IsArray()
  @ArrayMinSize(1)
  terms!: PauliTerm[];

  /** Total evolution time t. */
  @IsNumber()
  time!: number;

  /** Number of Trotter steps r (default 1). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  steps?: number;

  /** Trotter order: 1 = Lie-Trotter, 2 = symmetric Suzuki (default 1). */
  @IsOptional()
  @IsIn([1, 2])
  order?: 1 | 2;

  /** Qubits to flip to |1⟩ before evolving (default: |0…0⟩). */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  initialOnes?: number[];
}

/** DTO for a discrete-time quantum walk. */
export class QuantumWalkDto {
  /** Number of position qubits (cycle length N = 2^n). */
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS - 1) // one qubit is the coin
  n!: number;

  /** Number of walk steps. */
  @IsInt()
  @Min(0)
  @Max(64)
  steps!: number;

  /** Starting node (default: cycle midpoint 2^{n-1}). */
  @IsOptional()
  @IsInt()
  @Min(0)
  start?: number;

  /** Prepare the coin in (|0⟩+i|1⟩)/√2 for a symmetric distribution (default true). */
  @IsOptional()
  @IsBoolean()
  symmetricCoin?: boolean;
}

/** DTO for Quantum Amplitude Amplification. */
export class AmplitudeAmplificationDto {
  /** Per-qubit RY angles defining the state preparation A. Length = qubit count. */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_QUBITS)
  @IsNumber({}, { each: true })
  angles!: number[];

  /** Basis states (integers) considered "good" and to be amplified. */
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  goodStates!: number[];

  /** Optional override for the number of Q iterations (default: optimal). */
  @IsOptional()
  @IsInt()
  @Min(0)
  iterations?: number;
}

/** DTO for Quantum Phase Estimation. */
export class PhaseEstimationDto {
  /** The true eigenphase φ ∈ [0, 1) of U = P(2πφ) to estimate. */
  @IsNumber()
  @Min(0)
  phi!: number;

  /** Number of counting qubits (bits of precision). */
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS - 1) // one qubit holds the eigenstate
  precision!: number;
}
