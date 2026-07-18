/**
 * Request DTOs for the algorithms API.
 *
 * Kept in a `.dto.ts` file so the @nestjs/swagger CLI plugin introspects their
 * properties into the OpenAPI schema (and so the global ValidationPipe accepts
 * and sanitizes the bodies). Validation is via class-validator.
 */

import { IsArray, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
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
