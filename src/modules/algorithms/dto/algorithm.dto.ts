/**
 * Request DTOs for the algorithms API.
 *
 * Kept in a `.dto.ts` file so the @nestjs/swagger CLI plugin introspects their
 * properties into the OpenAPI schema (and so the global ValidationPipe accepts
 * and sanitizes the bodies). Validation is via class-validator.
 */

import { IsArray, IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
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
  @IsInt()
  @Min(2)
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
