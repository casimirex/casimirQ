/**
 * Circuits API Controller
 *
 * REST endpoints for circuit CRUD operations and simulation.
 * Circuits are persisted per-user via CircuitsRepository.
 */

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { EngineType } from '../../simulation-engines/simulation-engines.service';
import {
  CircuitOperationSpec,
  SimulationRunnerService,
} from '../services/simulation-runner.service';
import { CircuitsRepository, StoredCircuit } from '../repositories/circuits.repository';
import { SimulationsRepository } from '../repositories/simulations.repository';

@ApiTags('Circuits')
@ApiBearerAuth('bearer')
@Controller('api/v1/circuits')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class CircuitsController {
  constructor(
    private readonly simulationRunner: SimulationRunnerService,
    private readonly circuits: CircuitsRepository,
    private readonly simulations: SimulationsRepository,
  ) {}

  /**
   * List all circuits for the authenticated user.
   */
  @Get()
  async listCircuits(@Request() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const { items, total } = await this.circuits.findAll(this.userId(req), {
      page: pageNum,
      limit: limitNum,
    });

    return {
      circuits: items.map(toCircuitSummary),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum)),
      },
    };
  }

  /**
   * Get a circuit by ID (owned by the authenticated user).
   */
  @Get(':id')
  async getCircuit(@Param('id') id: string, @Request() req: any) {
    const circuit = await this.circuits.findById(this.userId(req), id);
    if (!circuit) {
      throw new NotFoundException(`Circuit ${id} not found`);
    }
    return toCircuitDetail(circuit);
  }

  /**
   * Create and persist a new circuit.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCircuit(
    @Body()
    body: { name?: string; numQubits?: number; operations?: CircuitOperationSpec[] },
    @Request() req: any,
  ) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      throw new BadRequestException('name is required');
    }
    if (body.numQubits === undefined) {
      throw new BadRequestException('numQubits is required');
    }

    // Validate the circuit is well-formed and runnable before persisting.
    this.simulationRunner.buildCircuit({
      numQubits: body.numQubits,
      operations: body.operations,
    });

    const created = await this.circuits.create(this.userId(req), {
      name: body.name,
      numQubits: body.numQubits,
      operations: body.operations,
    });

    return toCircuitDetail(created);
  }

  /**
   * Update a circuit's name and/or operations.
   */
  @Put(':id')
  async updateCircuit(
    @Param('id') id: string,
    @Body() body: { name?: string; operations?: CircuitOperationSpec[] },
    @Request() req: any,
  ) {
    const userId = this.userId(req);
    const existing = await this.circuits.findById(userId, id);
    if (!existing) {
      throw new NotFoundException(`Circuit ${id} not found`);
    }

    // If operations change, validate them against the circuit's qubit count.
    if (body.operations !== undefined) {
      this.simulationRunner.buildCircuit({
        numQubits: existing.numQubits,
        operations: body.operations,
      });
    }

    const updated = await this.circuits.update(userId, id, {
      name: body.name,
      operations: body.operations,
    });

    // Guarded above, but keep the type-checker and races honest.
    if (!updated) {
      throw new NotFoundException(`Circuit ${id} not found`);
    }
    return toCircuitDetail(updated);
  }

  /**
   * Delete a circuit.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCircuit(@Param('id') id: string, @Request() req: any) {
    const deleted = await this.circuits.delete(this.userId(req), id);
    if (!deleted) {
      throw new NotFoundException(`Circuit ${id} not found`);
    }
  }

  /**
   * Simulate a circuit and return real results (statevector, probabilities
   * and sampled measurement counts).
   *
   * The circuit is resolved in one of two ways:
   *  - inline: the request body carries `numQubits` (+ `operations`), used as-is
   *  - stored: otherwise the persisted circuit `:id` is loaded and simulated
   */
  @Post(':id/simulate')
  async simulateCircuit(
    @Param('id') id: string,
    @Body()
    body: {
      numQubits?: number;
      operations?: CircuitOperationSpec[];
      engine?: EngineType;
      method?: EngineType;
      shots?: number;
      seed?: number;
      circuitName?: string;
    },
    @Request() req: any,
  ) {
    const userId = this.userId(req);
    let spec: { numQubits: number; operations?: CircuitOperationSpec[] };
    let circuitName = body.circuitName?.trim() || 'Ad-hoc circuit';
    let circuitId: string | null = null;

    if (body.numQubits !== undefined) {
      spec = { numQubits: body.numQubits, operations: body.operations };
    } else {
      const stored = await this.circuits.findById(userId, id);
      if (!stored) {
        throw new NotFoundException(`Circuit ${id} not found`);
      }
      spec = { numQubits: stored.numQubits, operations: stored.operations };
      circuitName = stored.name;
      circuitId = stored.id;
    }

    const run = this.simulationRunner.run(spec, {
      engine: body.engine,
      method: body.method,
      shots: body.shots,
      seed: body.seed,
    });

    // Record the run so it appears in simulation history.
    const record = await this.simulations.create(userId, {
      circuitId,
      circuitName,
      engine: run.requestedEngine,
      shots: run.shots,
      numQubits: run.numQubits,
      status: run.status,
      results: run.results,
      executionTimeMs: run.metadata.executionTimeMs,
    });

    return {
      circuitId: id,
      jobId: record.id,
      ...run,
    };
  }

  private userId(req: any): string {
    return req?.user?.userId ?? 'anonymous';
  }
}

function toCircuitSummary(circuit: StoredCircuit) {
  return {
    id: circuit.id,
    name: circuit.name,
    numQubits: circuit.numQubits,
    operationCount: circuit.operations.length,
    createdAt: circuit.createdAt,
    updatedAt: circuit.updatedAt,
  };
}

function toCircuitDetail(circuit: StoredCircuit) {
  return {
    id: circuit.id,
    name: circuit.name,
    numQubits: circuit.numQubits,
    operations: circuit.operations,
    operationCount: circuit.operations.length,
    createdAt: circuit.createdAt,
    updatedAt: circuit.updatedAt,
  };
}
