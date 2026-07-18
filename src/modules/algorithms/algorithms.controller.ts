import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AlgorithmsService } from './algorithms.service';
import { PauliTerm } from './implementations/vqe';
import { JwtAuthGuard } from '../api/guards/jwt-auth.guard';
import { RateLimitGuard } from '../api/guards/rate-limit.guard';
import { IsArray, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

// Upper bound on qubit counts accepted by the API (matches the engines' limits).
const MAX_QUBITS = 16;

/**
 * DTO for QFT execution
 */
class QFTDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;
}

/**
 * DTO for Grover's search
 */
class GroverDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;

  @IsInt()
  @Min(0)
  markedItem!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  iterations?: number;
}

/**
 * DTO for VQE
 */
class VQEDto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;

  @IsArray()
  hamiltonian!: PauliTerm[];

  @IsOptional()
  @IsInt()
  @Min(1)
  maxIterations?: number;
}

/**
 * DTO for QAOA
 */
class QAOADto {
  @IsInt()
  @Min(1)
  @Max(MAX_QUBITS)
  n!: number;

  @IsArray()
  edges!: [number, number][];

  @IsOptional()
  @IsInt()
  @Min(1)
  p?: number;
}

/**
 * DTO for Teleportation
 */
class TeleportDto {
  @IsNumber()
  alpha!: number;

  @IsNumber()
  beta!: number;
}

/**
 * DTO for Shor's algorithm
 */
class ShorDto {
  @IsInt()
  @Min(2)
  N!: number;
}

/**
 * Controller for quantum algorithms API.
 * Provides endpoints for executing and analyzing quantum algorithms.
 */
@ApiTags('Algorithms')
@ApiBearerAuth('bearer')
@Controller('api/v1/algorithms')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class AlgorithmsController {
  constructor(private readonly algorithmsService: AlgorithmsService) {}

  /**
   * Get list of available quantum algorithms.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  getAlgorithms() {
    const algorithms = this.algorithmsService.getAvailableAlgorithms();
    return {
      count: algorithms.length,
      algorithms: algorithms.map((a) => ({
        name: a.name,
        description: a.description,
        category: a.category,
      })),
    };
  }

  /**
   * Execute Quantum Fourier Transform.
   */
  @Post('qft')
  @HttpCode(HttpStatus.OK)
  async executeQFT(@Body() dto: QFTDto) {
    const result = this.algorithmsService.executeQFT(dto.n);
    const output = result.output as {
      analysis: { qubitCount: number; gateCount: number; depth: number };
    };
    // Surface a lightweight scalar summary rather than the full circuit and
    // statevector objects (which are large and internal to the engine).
    return {
      algorithm: 'Quantum Fourier Transform',
      parameters: { n: dto.n },
      result: {
        executionTime: result.metrics.executionTimeMs,
        qubits: output.analysis.qubitCount,
        gateCount: output.analysis.gateCount,
        depth: output.analysis.depth,
        stateSize: result.measurements.size,
      },
    };
  }

  /**
   * Execute Grover's Search.
   */
  @Post('grover')
  @HttpCode(HttpStatus.OK)
  async executeGrover(@Body() dto: GroverDto) {
    const result = this.algorithmsService.executeGrover(dto.n, dto.markedItem, dto.iterations);
    return {
      algorithm: "Grover's Search",
      parameters: {
        n: dto.n,
        markedItem: dto.markedItem,
        iterations: dto.iterations,
      },
      result: {
        executionTime: result.metrics.executionTimeMs,
        successProbability: result.metrics.successProbability,
        optimalIterations: (result.output as { optimalIterations: number }).optimalIterations,
        output: result.output,
      },
    };
  }

  /**
   * Execute VQE.
   */
  @Post('vqe')
  @HttpCode(HttpStatus.OK)
  async executeVQE(@Body() dto: VQEDto) {
    const result = this.algorithmsService.executeVQE(dto.n, dto.hamiltonian, dto.maxIterations);
    const output = result.output as {
      optimalEnergy: number;
      iterations: number;
      convergenceHistory: number[];
    };
    return {
      algorithm: 'Variational Quantum Eigensolver',
      parameters: {
        n: dto.n,
        maxIterations: dto.maxIterations,
      },
      result: {
        executionTime: result.metrics.executionTimeMs,
        optimalEnergy: output.optimalEnergy,
        iterations: output.iterations,
        converged: output.convergenceHistory.length > 1,
      },
    };
  }

  /**
   * Get example Hamiltonians for VQE.
   */
  @Get('vqe/examples')
  getVQEEExamples() {
    return {
      examples: this.algorithmsService.getExampleHamiltonians(),
    };
  }

  /**
   * Execute QAOA.
   */
  @Post('qaoa')
  @HttpCode(HttpStatus.OK)
  async executeQAOA(@Body() dto: QAOADto) {
    const result = this.algorithmsService.executeQAOA(dto.n, dto.edges, dto.p ?? 1);
    const output = result.output as {
      maxExpectation: number;
      optimalGamma: number[];
      optimalBeta: number[];
      bestCutValue: number;
    };
    return {
      algorithm: 'Quantum Approximate Optimization Algorithm',
      parameters: {
        n: dto.n,
        edges: dto.edges,
        p: dto.p ?? 1,
      },
      result: {
        executionTime: result.metrics.executionTimeMs,
        maxExpectation: output.maxExpectation,
        bestCutValue: output.bestCutValue,
        optimalGamma: output.optimalGamma,
        optimalBeta: output.optimalBeta,
      },
    };
  }

  /**
   * Get example graphs for QAOA.
   */
  @Get('qaoa/examples')
  getQAOAExamples() {
    return {
      examples: this.algorithmsService.getExampleGraphs(),
    };
  }

  /**
   * Execute Quantum Teleportation.
   */
  @Post('teleport')
  @HttpCode(HttpStatus.OK)
  async executeTeleport(@Body() dto: TeleportDto) {
    const result = this.algorithmsService.executeTeleport([dto.alpha, dto.beta]);
    const output = result.output as {
      teleportedProbabilities: { prob0: number; prob1: number };
      fidelity: number;
      verified: boolean;
    };
    return {
      algorithm: 'Quantum Teleportation',
      parameters: {
        messageState: [dto.alpha, dto.beta],
      },
      result: {
        executionTime: result.metrics.executionTimeMs,
        teleportedProbabilities: output.teleportedProbabilities,
        fidelity: output.fidelity,
        verified: output.verified,
      },
    };
  }

  /**
   * Execute Shor's Algorithm.
   */
  @Post('shor')
  @HttpCode(HttpStatus.OK)
  async executeShor(@Body() dto: ShorDto) {
    const result = this.algorithmsService.executeShor(dto.N);
    const output = result.output as {
      factors: number[];
      period: number;
      attempts: number;
    };
    return {
      algorithm: "Shor's Algorithm",
      parameters: { N: dto.N },
      result: {
        executionTime: result.metrics.executionTimeMs,
        factors: output.factors,
        period: output.period,
        attempts: output.attempts,
      },
    };
  }

  /**
   * Verify an algorithm.
   */
  @Get(':name/verify')
  verifyAlgorithm(@Param('name') name: string) {
    const results = this.algorithmsService.verifyAlgorithm(name);
    return {
      algorithm: name,
      verificationResults: results,
    };
  }
}
