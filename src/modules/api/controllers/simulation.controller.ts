/**
 * Simulation API Controller
 *
 * REST endpoints for simulation history and running simulations of stored
 * circuits. Backed by SimulationsRepository (persisted per-user).
 */

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { EngineType } from '../../simulation-engines/simulation-engines.service';
import { SimulationRunnerService } from '../services/simulation-runner.service';
import { CircuitsRepository } from '../repositories/circuits.repository';
import { SimulationsRepository, StoredSimulation } from '../repositories/simulations.repository';

@ApiTags('Simulations')
@ApiBearerAuth('bearer')
@Controller('api/v1/simulations')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class SimulationController {
  constructor(
    private readonly simulations: SimulationsRepository,
    private readonly circuits: CircuitsRepository,
    private readonly simulationRunner: SimulationRunnerService,
  ) {}

  /**
   * List the authenticated user's simulation runs (most recent first).
   */
  @Get()
  async listSimulations(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const { items, total } = await this.simulations.findAll(this.userId(req), {
      page: pageNum,
      limit: limitNum,
    });
    return {
      simulations: items.map(toSummary),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    };
  }

  /**
   * Get a simulation run (including results).
   */
  @Get(':id')
  async getSimulation(@Param('id') id: string, @Request() req: any) {
    const simulation = await this.simulations.findById(this.userId(req), id);
    if (!simulation) {
      throw new NotFoundException(`Simulation ${id} not found`);
    }
    return toDetail(simulation);
  }

  /**
   * Get just the results of a simulation run.
   */
  @Get(':id/results')
  async getResults(@Param('id') id: string, @Request() req: any) {
    const simulation = await this.simulations.findById(this.userId(req), id);
    if (!simulation) {
      throw new NotFoundException(`Simulation ${id} not found`);
    }
    return {
      id: simulation.id,
      status: simulation.status,
      results: simulation.results,
      metadata: { executionTimeMs: simulation.executionTimeMs },
    };
  }

  /**
   * Run a new simulation of a stored circuit and record it.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async runSimulation(
    @Body()
    body: {
      circuitId: string;
      engine?: EngineType;
      method?: EngineType;
      shots?: number;
      seed?: number;
    },
    @Request() req: any,
  ) {
    const userId = this.userId(req);
    const circuit = await this.circuits.findById(userId, body.circuitId);
    if (!circuit) {
      throw new NotFoundException(`Circuit ${body.circuitId} not found`);
    }

    const run = this.simulationRunner.run(
      { numQubits: circuit.numQubits, operations: circuit.operations },
      { engine: body.engine, method: body.method, shots: body.shots, seed: body.seed },
    );

    const record = await this.simulations.create(userId, {
      circuitId: circuit.id,
      circuitName: circuit.name,
      engine: run.requestedEngine,
      shots: run.shots,
      numQubits: run.numQubits,
      status: run.status,
      results: run.results,
      executionTimeMs: run.metadata.executionTimeMs,
    });

    return toDetail(record);
  }

  /**
   * Delete a simulation run from history.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSimulation(@Param('id') id: string, @Request() req: any) {
    const deleted = await this.simulations.delete(this.userId(req), id);
    if (!deleted) {
      throw new NotFoundException(`Simulation ${id} not found`);
    }
  }

  private userId(req: any): string {
    return req?.user?.userId ?? 'anonymous';
  }
}

function toSummary(simulation: StoredSimulation) {
  return {
    id: simulation.id,
    circuitId: simulation.circuitId,
    circuitName: simulation.circuitName,
    engine: simulation.engine,
    shots: simulation.shots,
    numQubits: simulation.numQubits,
    status: simulation.status,
    executionTimeMs: simulation.executionTimeMs,
    createdAt: simulation.createdAt,
  };
}

function toDetail(simulation: StoredSimulation) {
  return {
    ...toSummary(simulation),
    results: simulation.results,
  };
}
