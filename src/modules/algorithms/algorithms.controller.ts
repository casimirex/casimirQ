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
import { JwtAuthGuard } from '../api/guards/jwt-auth.guard';
import { RateLimitGuard } from '../api/guards/rate-limit.guard';
import {
  BernsteinVaziraniDto,
  DeutschJozsaDto,
  GroverDto,
  AmplitudeAmplificationDto,
  HamiltonianSimulationDto,
  PhaseEstimationDto,
  QAOADto,
  QFTDto,
  QuantumWalkDto,
  ShorDto,
  SimonDto,
  TeleportDto,
  VQEDto,
} from './dto/algorithm.dto';

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
   * Execute Deutsch-Jozsa: decide whether an oracle is constant or balanced.
   */
  @Post('deutsch-jozsa')
  @HttpCode(HttpStatus.OK)
  async executeDeutschJozsa(@Body() dto: DeutschJozsaDto) {
    const oracle =
      dto.oracle === 'balanced'
        ? ({ kind: 'balanced', mask: dto.mask ?? (1 << dto.n) - 1 } as const)
        : ({ kind: 'constant', value: dto.value ?? 0 } as const);
    const result = this.algorithmsService.executeDeutschJozsa(dto.n, oracle);
    const output = result.output as {
      decision: string;
      expected: string;
      correct: boolean;
      allZeroProbability: number;
    };
    return {
      algorithm: 'Deutsch-Jozsa',
      parameters: { n: dto.n, oracle: dto.oracle, value: dto.value, mask: dto.mask },
      result: {
        executionTime: result.metrics.executionTimeMs,
        decision: output.decision,
        expected: output.expected,
        correct: output.correct,
        allZeroProbability: output.allZeroProbability,
      },
    };
  }

  /**
   * Execute Bernstein-Vazirani: recover a hidden bit string in one query.
   */
  @Post('bernstein-vazirani')
  @HttpCode(HttpStatus.OK)
  async executeBernsteinVazirani(@Body() dto: BernsteinVaziraniDto) {
    const result = this.algorithmsService.executeBernsteinVazirani(dto.n, dto.secret);
    const output = result.output as {
      secret: number;
      recovered: number;
      recoveredBits: string;
      correct: boolean;
    };
    return {
      algorithm: 'Bernstein-Vazirani',
      parameters: { n: dto.n, secret: dto.secret },
      result: {
        executionTime: result.metrics.executionTimeMs,
        secret: output.secret,
        recovered: output.recovered,
        recoveredBits: output.recoveredBits,
        correct: output.correct,
        successProbability: result.metrics.successProbability,
      },
    };
  }

  /**
   * Execute Simon's algorithm: find the hidden period of a 2-to-1 function.
   */
  @Post('simon')
  @HttpCode(HttpStatus.OK)
  async executeSimon(@Body() dto: SimonDto) {
    const result = this.algorithmsService.executeSimon(dto.n, dto.secret);
    const output = result.output as {
      secret: number;
      recovered: number;
      recoveredBits: string;
      correct: boolean;
      equationCount: number;
    };
    return {
      algorithm: "Simon's Algorithm",
      parameters: { n: dto.n, secret: dto.secret },
      result: {
        executionTime: result.metrics.executionTimeMs,
        secret: output.secret,
        recovered: output.recovered,
        recoveredBits: output.recoveredBits,
        correct: output.correct,
        equationCount: output.equationCount,
      },
    };
  }

  /**
   * Execute Quantum Phase Estimation: estimate a unitary's eigenphase.
   */
  @Post('phase-estimation')
  @HttpCode(HttpStatus.OK)
  async executePhaseEstimation(@Body() dto: PhaseEstimationDto) {
    const result = this.algorithmsService.executePhaseEstimation(dto.phi, dto.precision);
    const output = result.output as {
      truePhase: number;
      estimatedPhase: number;
      measuredInteger: number;
      precisionBits: number;
      error: number;
      bestProbability: number;
    };
    return {
      algorithm: 'Quantum Phase Estimation',
      parameters: { phi: dto.phi, precision: dto.precision },
      result: {
        executionTime: result.metrics.executionTimeMs,
        truePhase: output.truePhase,
        estimatedPhase: output.estimatedPhase,
        measuredInteger: output.measuredInteger,
        precisionBits: output.precisionBits,
        error: output.error,
        bestProbability: output.bestProbability,
      },
    };
  }

  /**
   * Execute Quantum Amplitude Amplification.
   */
  @Post('amplitude-amplification')
  @HttpCode(HttpStatus.OK)
  async executeAmplitudeAmplification(@Body() dto: AmplitudeAmplificationDto) {
    const result = this.algorithmsService.executeAmplitudeAmplification(
      dto.angles,
      dto.goodStates,
      dto.iterations,
    );
    const output = result.output as {
      initialProbability: number;
      finalProbability: number;
      theoreticalProbability: number;
      iterations: number;
      amplification: number;
    };
    return {
      algorithm: 'Quantum Amplitude Amplification',
      parameters: {
        qubits: dto.angles.length,
        goodStates: dto.goodStates,
        iterations: dto.iterations,
      },
      result: {
        executionTime: result.metrics.executionTimeMs,
        initialProbability: output.initialProbability,
        finalProbability: output.finalProbability,
        theoreticalProbability: output.theoreticalProbability,
        iterations: output.iterations,
        amplification: output.amplification,
      },
    };
  }

  /**
   * Execute a discrete-time quantum walk on a cycle.
   */
  @Post('quantum-walk')
  @HttpCode(HttpStatus.OK)
  async executeQuantumWalk(@Body() dto: QuantumWalkDto) {
    const result = this.algorithmsService.executeQuantumWalk(dto.n, dto.steps, {
      start: dto.start,
      symmetricCoin: dto.symmetricCoin,
    });
    const output = result.output as {
      steps: number;
      start: number;
      nodes: number;
      meanDisplacement: number;
      stdDev: number;
      classicalStdDev: number;
      spreadRatio: number;
      distribution: { position: number; probability: number }[];
    };
    return {
      algorithm: 'Quantum Walk',
      parameters: {
        n: dto.n,
        steps: dto.steps,
        start: output.start,
        symmetricCoin: dto.symmetricCoin ?? true,
      },
      result: {
        executionTime: result.metrics.executionTimeMs,
        nodes: output.nodes,
        meanDisplacement: output.meanDisplacement,
        stdDev: output.stdDev,
        classicalStdDev: output.classicalStdDev,
        spreadRatio: output.spreadRatio,
        distribution: output.distribution,
      },
    };
  }

  /**
   * Execute Trotterized Hamiltonian simulation e^{-iHt}.
   */
  @Post('hamiltonian-simulation')
  @HttpCode(HttpStatus.OK)
  async executeHamiltonianSimulation(@Body() dto: HamiltonianSimulationDto) {
    const result = this.algorithmsService.executeHamiltonianSimulation(
      dto.n,
      dto.terms,
      dto.time,
      dto.steps ?? 1,
      dto.order ?? 1,
      dto.initialOnes ?? [],
    );
    const output = result.output as {
      time: number;
      steps: number;
      order: number;
      termCount: number;
      probabilities: { state: number; probability: number }[];
    };
    return {
      algorithm: 'Hamiltonian Simulation',
      parameters: {
        n: dto.n,
        time: dto.time,
        steps: output.steps,
        order: output.order,
        termCount: output.termCount,
      },
      result: {
        executionTime: result.metrics.executionTimeMs,
        probabilities: output.probabilities,
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
