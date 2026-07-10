/**
 * Advanced Orchestration Controller
 *
 * Batch execution (run many stored circuits, recording each as a simulation and
 * linking them under a persisted batch) and analysis pipelines (run an ordered
 * set of named stages over a stored circuit). Per-user scoped.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { EngineType } from '../../simulation-engines/simulation-engines.service';
import { SimulationRunnerService } from '../services/simulation-runner.service';
import { CircuitDiagramService } from '../../visualization/services/circuit-diagram.service';
import { CircuitOptimizerService } from '../../performance/services/circuit-optimizer.service';
import { CircuitsRepository } from '../repositories/circuits.repository';
import { SimulationsRepository } from '../repositories/simulations.repository';
import { BatchesRepository, BatchEntry, StoredBatch } from '../repositories/batches.repository';

const PIPELINE_STAGES = ['validate', 'optimize', 'diagram', 'simulate'] as const;
type PipelineStageType = (typeof PIPELINE_STAGES)[number];

@Controller('api/v1/advanced')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class AdvancedOrchestrationController {
  constructor(
    private readonly batches: BatchesRepository,
    private readonly circuits: CircuitsRepository,
    private readonly simulations: SimulationsRepository,
    private readonly simulationRunner: SimulationRunnerService,
    private readonly circuitDiagram: CircuitDiagramService,
    private readonly optimizer: CircuitOptimizerService,
  ) {}

  /**
   * Execute a batch of stored circuits, recording each run and the batch.
   */
  @Post('batch/execute')
  @HttpCode(HttpStatus.CREATED)
  async batchExecute(
    @Body()
    body: { circuitIds: string[]; shots?: number; engine?: EngineType; seed?: number },
    @Request() req: any,
  ) {
    const userId = this.userId(req);
    if (!Array.isArray(body.circuitIds) || body.circuitIds.length === 0) {
      throw new BadRequestException('circuitIds must be a non-empty array');
    }

    const entries: BatchEntry[] = [];
    for (const circuitId of body.circuitIds) {
      const circuit = await this.circuits.findById(userId, circuitId);
      if (!circuit) {
        entries.push({
          circuitId,
          circuitName: circuitId,
          simulationId: null,
          status: 'failed',
          error: 'Circuit not found',
        });
        continue;
      }
      try {
        const run = this.simulationRunner.run(
          { numQubits: circuit.numQubits, operations: circuit.operations },
          { engine: body.engine, shots: body.shots, seed: body.seed },
        );
        const sim = await this.simulations.create(userId, {
          circuitId: circuit.id,
          circuitName: circuit.name,
          engine: run.requestedEngine,
          shots: run.shots,
          numQubits: run.numQubits,
          status: run.status,
          results: run.results,
          executionTimeMs: run.metadata.executionTimeMs,
        });
        entries.push({
          circuitId: circuit.id,
          circuitName: circuit.name,
          simulationId: sim.id,
          status: 'completed',
        });
      } catch (err) {
        entries.push({
          circuitId: circuit.id,
          circuitName: circuit.name,
          simulationId: null,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const succeeded = entries.filter((e) => e.status === 'completed').length;
    const failed = entries.length - succeeded;
    const batch = await this.batches.create(userId, {
      status: failed === 0 ? 'completed' : succeeded === 0 ? 'failed' : 'partial',
      total: entries.length,
      succeeded,
      failed,
      entries,
    });

    return toBatchSummary(batch);
  }

  /**
   * Get a batch's results, resolving each entry's recorded simulation.
   */
  @Get('batch/:batchId/results')
  async getBatchResults(@Param('batchId') batchId: string, @Request() req: any) {
    const userId = this.userId(req);
    const batch = await this.batches.findById(userId, batchId);
    if (!batch) {
      throw new NotFoundException(`Batch ${batchId} not found`);
    }

    const results = await Promise.all(
      batch.entries.map(async (entry) => {
        const sim = entry.simulationId
          ? await this.simulations.findById(userId, entry.simulationId)
          : null;
        return {
          circuitId: entry.circuitId,
          circuitName: entry.circuitName,
          status: entry.status,
          error: entry.error,
          simulationId: entry.simulationId,
          probabilities: sim?.results.probabilities ?? null,
          executionTimeMs: sim?.executionTimeMs ?? null,
        };
      }),
    );

    return { ...toBatchSummary(batch), results };
  }

  /**
   * Run an analysis pipeline (ordered named stages) over a stored circuit.
   */
  @Post('pipeline/run')
  async runPipeline(
    @Body() body: { circuitId: string; stages: Array<{ type: string }>; shots?: number },
    @Request() req: any,
  ) {
    const userId = this.userId(req);
    if (!Array.isArray(body.stages) || body.stages.length === 0) {
      throw new BadRequestException('stages must be a non-empty array');
    }
    for (const stage of body.stages) {
      if (!PIPELINE_STAGES.includes(stage.type as PipelineStageType)) {
        throw new BadRequestException(
          `Unknown stage "${stage.type}"; supported: ${PIPELINE_STAGES.join(', ')}`,
        );
      }
    }

    const stored = await this.circuits.findById(userId, body.circuitId);
    if (!stored) {
      throw new NotFoundException(`Circuit ${body.circuitId} not found`);
    }
    const circuit = this.simulationRunner.buildCircuit({
      numQubits: stored.numQubits,
      operations: stored.operations,
    });

    const start = performance.now();
    const stageResults = [];
    for (const stage of body.stages) {
      const t0 = performance.now();
      let result: unknown;
      let success = true;
      let error: string | undefined;
      try {
        switch (stage.type as PipelineStageType) {
          case 'validate':
            result = { valid: true, numQubits: circuit.numQubits, gateCount: circuit.gateCount() };
            break;
          case 'optimize':
            result = this.optimizer.optimize(circuit);
            break;
          case 'diagram':
            result = { format: 'svg', bytes: this.circuitDiagram.generateSVG(circuit).length };
            break;
          case 'simulate': {
            const run = this.simulationRunner.run(
              { numQubits: stored.numQubits, operations: stored.operations },
              { shots: body.shots },
            );
            result = {
              probabilities: run.results.probabilities,
              executionTimeMs: run.metadata.executionTimeMs,
            };
            break;
          }
        }
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
      }
      stageResults.push({
        stage: stage.type,
        durationMs: performance.now() - t0,
        success,
        ...(success ? { result } : { error }),
      });
    }

    return {
      circuitId: body.circuitId,
      stages: stageResults,
      totalMs: performance.now() - start,
    };
  }

  private userId(req: any): string {
    return req?.user?.userId ?? 'anonymous';
  }
}

function toBatchSummary(batch: StoredBatch) {
  return {
    batchId: batch.id,
    status: batch.status,
    total: batch.total,
    succeeded: batch.succeeded,
    failed: batch.failed,
    createdAt: batch.createdAt,
  };
}
