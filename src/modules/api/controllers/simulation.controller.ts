/**
 * Simulation API Controller
 *
 * REST endpoints for quantum simulation management
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';

@Controller('api/v1/simulations')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class SimulationController {
  /**
   * List all simulations
   */
  @Get()
  async listSimulations(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return {
      simulations: [],
      filter: { status },
      pagination: {
        page,
        limit,
        total: 0,
      },
    };
  }

  /**
   * Get simulation details
   */
  @Get(':id')
  async getSimulation(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return {
      id,
      circuitId: 'circuit-1',
      status: 'completed',
      method: 'statevector',
      shots: 1024,
      results: {
        statevector: [],
        probabilities: {},
      },
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Run new simulation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async runSimulation(
    @Body() body: {
      circuitId: string;
      method?: string;
      shots?: number;
      parameters?: Record<string, number>;
    },
    @Request() req: any,
  ) {
    return {
      id: 'sim-' + Date.now(),
      circuitId: body.circuitId,
      status: 'queued',
      method: body.method || 'statevector',
      shots: body.shots || 1024,
      estimatedTime: 5000,
    };
  }

  /**
   * Get simulation results
   */
  @Get(':id/results')
  async getResults(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return {
      id,
      status: 'completed',
      results: {
        statevector: [],
        probabilities: {},
        samples: [],
      },
      metadata: {
        executionTime: 1000,
        memoryUsed: 1024,
      },
    };
  }

  /**
   * Compare multiple simulations
   */
  @Post('compare')
  async compareSimulations(
    @Body() body: {
      simulationIds: string[];
      metric: string;
    },
    @Request() req: any,
  ) {
    return {
      comparison: {
        metric: body.metric,
        results: body.simulationIds.map(id => ({
          id,
          value: 0,
        })),
      },
    };
  }
}
