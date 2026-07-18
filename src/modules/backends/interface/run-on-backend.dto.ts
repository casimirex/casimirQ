/**
 * DTO for running a circuit on a backend.
 *
 * Decorated for the global ValidationPipe; `operations` and `noise` are passed
 * through to the runner / engine, which validate them.
 */

import { IsArray, IsInt, IsOptional, Min } from 'class-validator';
import { CircuitOperationSpec } from '../../api/services/simulation-runner.service';
import { NoiseSpec } from '../../simulation-engines/engines/density-matrix-engine/density-matrix-engine';

export class RunOnBackendDto {
  @IsInt()
  @Min(1)
  numQubits!: number;

  @IsOptional()
  @IsArray()
  operations?: CircuitOperationSpec[];

  @IsOptional()
  @IsInt()
  @Min(1)
  shots?: number;

  @IsOptional()
  @IsInt()
  seed?: number;

  @IsOptional()
  @IsArray()
  noise?: NoiseSpec[];
}
