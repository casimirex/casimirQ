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

  /**
   * Initial-placement strategy when routing. `'greedy'` seats interacting
   * qubits near each other to cut SWAPs; `'trivial'` (default) starts from the
   * identity placement.
   */
  @IsOptional()
  @IsIn(['trivial', 'greedy'])
  layout?: 'trivial' | 'greedy';

  /**
   * SWAP-insertion strategy when routing. `'sabre'` uses a lookahead heuristic
   * that usually inserts fewer SWAPs; `'greedy'` (default) walks one operand of
   * each gate along a shortest path.
   */
  @IsOptional()
  @IsIn(['greedy', 'sabre'])
  router?: 'greedy' | 'sabre';
}
