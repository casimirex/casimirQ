/**
 * DTO for a transpile request. Decorated for the global ValidationPipe.
 */

import { IsArray, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CircuitOperationSpec } from '../api/services/simulation-runner.service';

const MAX_QUBITS = 24;

export class TranspileDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  numQubits!: number;

  @IsOptional()
  @IsArray()
  operations?: CircuitOperationSpec[];
}
