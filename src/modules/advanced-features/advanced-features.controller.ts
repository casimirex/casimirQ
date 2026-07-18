/**
 * Advanced Features Controller
 *
 * REST API endpoints for error correction, noise modeling,
 * quantum machine learning, and multi-circuit execution.
 */

import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ErrorCorrectionService } from './services/error-correction.service';
import { NoiseModelingService } from './services/noise-modeling.service';
import { QuantumMLService } from './services/quantum-ml.service';
import { MultiCircuitExecutionService } from './services/multi-circuit-execution.service';

@ApiTags('Advanced')
@Controller('api/v1/advanced')
export class AdvancedFeaturesController {
  constructor(
    private readonly errorCorrectionService: ErrorCorrectionService,
    private readonly noiseService: NoiseModelingService,
    private readonly qmlService: QuantumMLService,
    private readonly executionService: MultiCircuitExecutionService,
  ) {}

  /**
   * Get available QEC codes
   */
  @Get('error-correction/codes')
  getAvailableQECCodes() {
    const codes = this.errorCorrectionService.getAvailableCodes();
    return {
      codes: codes.map((name) => ({
        name,
        properties: this.errorCorrectionService.getCodeProperties(name),
      })),
    };
  }

  /**
   * Get QEC code details
   */
  @Get('error-correction/codes/:codeName')
  getQECCodeDetails(@Param('codeName') codeName: string) {
    const code = this.errorCorrectionService.getCode(codeName);
    if (!code) {
      return { error: `Code ${codeName} not found` };
    }

    return {
      name: code.name,
      nPhysical: code.nPhysical,
      nLogical: code.nLogical,
      distance: code.distance,
      stabilizers: code.stabilizers.length,
    };
  }

  /**
   * Simulate QEC encoding
   */
  @Post('error-correction/encode')
  @HttpCode(HttpStatus.OK)
  async encodeWithQEC(@Body() body: { logicalState: number[]; codeName: string; options?: any }) {
    try {
      const result = this.errorCorrectionService.simulateQEC(
        body.logicalState,
        body.codeName,
        body.options,
      );
      return result;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get available noise models
   */
  @Get('noise/models')
  getNoiseModels() {
    const models = this.noiseService.getAvailableModels();
    return {
      models: models.map((name) => ({
        name,
        ...this.noiseService.getModel(name),
      })),
    };
  }

  /**
   * Simulate with noise
   */
  @Post('noise/simulate')
  @HttpCode(HttpStatus.OK)
  async simulateWithNoise(
    @Body()
    body: {
      state: Record<string, { re: number; im: number }>;
      options: any;
    },
  ) {
    // Convert state map
    const state = new Map<bigint, any>();
    for (const [key, value] of Object.entries(body.state)) {
      state.set(BigInt(key), value);
    }

    const result = this.noiseService.simulateWithNoise(state, body.options);
    return result;
  }

  /**
   * Get available ansatz templates
   */
  @Get('qml/ansatze')
  getAnsatzTemplates() {
    return {
      ansaetze: this.qmlService.getAvailableAnsatze(),
    };
  }

  /**
   * Get available feature maps
   */
  @Get('qml/feature-maps')
  getFeatureMaps() {
    return {
      featureMaps: this.qmlService.getAvailableFeatureMaps(),
    };
  }

  /**
   * Compute quantum kernel
   */
  @Post('qml/kernel')
  @HttpCode(HttpStatus.OK)
  computeKernel(@Body() body: { X: number[][]; featureMap: string }) {
    const featureMap = this.qmlService.getFeatureMap(body.featureMap);
    if (!featureMap) {
      return { error: `Feature map ${body.featureMap} not found` };
    }

    const matrix = this.qmlService.computeKernelMatrix(body.X, featureMap);
    return { kernelMatrix: matrix };
  }

  /**
   * Run VQE
   */
  @Post('qml/vqe')
  @HttpCode(HttpStatus.ACCEPTED)
  async runVQE(
    @Body()
    body: {
      hamiltonian: { pauli: string; coefficient: number }[];
      ansatz: string;
      optimizer: any;
    },
  ) {
    const ansatz = this.qmlService.getAnsatzTemplate(body.ansatz);
    if (!ansatz) {
      return { error: `Ansatz ${body.ansatz} not found` };
    }

    const result = await this.qmlService.runVQE({
      hamiltonian: body.hamiltonian,
      ansatz,
      optimizer: body.optimizer,
    });

    return result;
  }

  /**
   * Train quantum classifier
   */
  @Post('qml/train')
  @HttpCode(HttpStatus.ACCEPTED)
  async trainClassifier(
    @Body()
    body: {
      data: { features: number[]; label: number }[];
      config: any;
    },
  ) {
    const result = await this.qmlService.trainQuantumClassifier(body.data, body.config);
    return result;
  }

  /**
   * Execute batch of circuits
   */
  @Post('execute/batch')
  @HttpCode(HttpStatus.ACCEPTED)
  async executeBatch(
    @Body()
    body: {
      circuits: any[];
      options: any;
    },
  ) {
    const result = await this.executionService.executeBatch(body.circuits, body.options);
    return result;
  }

  /**
   * Execute pipeline
   */
  @Post('execute/pipeline')
  @HttpCode(HttpStatus.OK)
  async executePipeline(
    @Body()
    body: {
      pipeline: any;
      input: any;
    },
  ) {
    const result = await this.executionService.executePipeline(body.pipeline, body.input);
    return result;
  }

  /**
   * Get execution status
   */
  @Get('execute/status/:executionId')
  getExecutionStatus(@Param('executionId') executionId: string) {
    return this.executionService.getExecutionStatus(executionId);
  }

  /**
   * Cancel execution
   */
  @Post('execute/cancel/:executionId')
  @HttpCode(HttpStatus.OK)
  cancelExecution(@Param('executionId') executionId: string) {
    const success = this.executionService.cancelExecution(executionId);
    return { success };
  }
}
