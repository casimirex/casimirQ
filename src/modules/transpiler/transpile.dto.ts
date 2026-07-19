/**
 * DTO for a transpile request. Decorated for the global ValidationPipe.
 */

import { IsArray, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
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

  /**
   * Route the circuit onto this qubit connectivity, inserting SWAPs so every
   * two-qubit gate acts on coupled qubits. Omit (or 'all-to-all') to skip
   * routing.
   */
  @IsOptional()
  @IsIn(['all-to-all', 'linear'])
  connectivity?: 'all-to-all' | 'linear';

  /**
   * An explicit coupling map (`[[a, b], ...]` undirected edges), taking
   * precedence over `connectivity` for non-linear topologies.
   */
  @IsOptional()
  @IsArray()
  coupling?: Array<[number, number]>;
}
