/**
 * DTO for submitting an asynchronous simulation job.
 *
 * Decorated with class-validator so the global ValidationPipe (whitelist +
 * forbidNonWhitelisted) accepts and sanitizes the body. `operations` is passed
 * through to the simulation runner, which validates gate names and targets.
 */

import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CircuitOperationSpec } from '../../api/services/simulation-runner.service';

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

  @IsOptional()
  @IsInt()
  @Min(1)
  shots?: number;

  @IsOptional()
  @IsInt()
  seed?: number;
}
