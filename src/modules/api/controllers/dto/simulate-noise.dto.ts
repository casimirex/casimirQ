/**
 * DTO for a density-matrix noise simulation request.
 *
 * Decorated for the global ValidationPipe (whitelist + forbidNonWhitelisted).
 * `operations` and `noise` are passed through to the runner / engine, which
 * validate gate names, targets, and channel parameters.
 */

import { IsArray, IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CircuitOperationSpec } from '../../services/simulation-runner.service';
import { NoiseSpec } from '../../../simulation-engines/engines/density-matrix-engine/density-matrix-engine';

// The density-matrix engine holds a 4^n matrix, so keep n small.
const MAX_QUBITS = 10;

export class SimulateNoiseDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  numQubits!: number;

  @IsOptional()
  @IsArray()
  operations?: CircuitOperationSpec[];

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

  @IsOptional()
  @IsBoolean()
  computeFidelity?: boolean;
}
