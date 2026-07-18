/**
 * DTO for submitting an asynchronous simulation job.
 *
 * Decorated with class-validator so the global ValidationPipe (whitelist +
 * forbidNonWhitelisted) accepts and sanitizes the body. `operations` is passed
 * through to the simulation runner, which validates gate names and targets.
 */

import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CircuitOperationSpec } from '../../api/services/simulation-runner.service';
import { NoiseSpec } from '../../simulation-engines/engines/density-matrix-engine/density-matrix-engine';

const MAX_QUBITS = 24;

export class SubmitSimulationJobDto {
  @IsOptional()
  @IsString()
  circuitName?: string;

  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  numQubits!: number;

  @IsOptional()
  @IsArray()
  operations?: CircuitOperationSpec[];

  @IsOptional()
  @IsString()
  engine?: string;

  /** Run on a specific backend (see `GET /backends`). Defaults to the runner. */
  @IsOptional()
  @IsString()
  backendId?: string;

  /** Noise channels, for backends that support them. */
  @IsOptional()
  @IsArray()
  noise?: NoiseSpec[];

  @IsOptional()
  @IsInt()
  @Min(1)
  shots?: number;

  @IsOptional()
  @IsInt()
  seed?: number;
}
