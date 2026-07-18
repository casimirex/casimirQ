/**
 * Advanced Features API Controller
 *
 * REST endpoints for QEC, noise modeling and quantum ML, backed by the real
 * ErrorCorrectionService / NoiseModelingService / QuantumMLService.
 *
 * Batch execution and pipelines (multi-circuit orchestration) are not yet
 * wired and still return placeholder responses.
 */

import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import {
  ErrorCorrectionService,
  NoiseModelingService,
  QuantumMLService,
} from '../../advanced-features/services';
import { IOptimizerConfig, IVQEConfig } from '../../advanced-features/interfaces';

/** The noise channel primitives the NoiseModelingService supports. */
const NOISE_CHANNEL_TYPES = [
  'depolarizing',
  'amplitude_damping',
  'phase_damping',
  'bit_flip',
  'phase_flip',
] as const;

@ApiTags('Advanced')
@ApiBearerAuth('bearer')
@Controller('api/v1/advanced')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class AdvancedFeaturesController {
  constructor(
    private readonly errorCorrection: ErrorCorrectionService,
    private readonly noise: NoiseModelingService,
    private readonly ml: QuantumMLService,
  ) {}

  // === Error Correction ===

  /** List the available QEC codes with their real properties. */
  @Get('error-correction/codes')
  async getQECCodes() {
    const codes = this.errorCorrection.getAvailableCodes().map((id) => ({
      id,
      ...this.errorCorrection.getCodeProperties(id),
    }));
    return { codes };
  }

  /** Encode a logical state with the chosen code. */
  @Post('error-correction/:codeId/encode')
  async encodeCircuit(@Param('codeId') codeId: string, @Body() body: { logicalState?: number[] }) {
    const code = this.errorCorrection.getCode(codeId);
    if (!code) {
      throw new NotFoundException(`QEC code "${codeId}" not found`);
    }
    const logicalState = body.logicalState ?? new Array(code.nLogical).fill(0);
    if (logicalState.length !== code.nLogical) {
      throw new BadRequestException(
        `logicalState must have ${code.nLogical} entries for code "${codeId}"`,
      );
    }
    const encoded = this.errorCorrection.encode(logicalState, code);
    return {
      code: codeId,
      nPhysical: code.nPhysical,
      nLogical: code.nLogical,
      logicalState: encoded.logicalState,
      syndrome: encoded.syndrome ?? [],
    };
  }

  /** Measure the syndrome of an encoded logical state. */
  @Post('error-correction/syndrome')
  async measureSyndrome(@Body() body: { code: string; logicalState?: number[] }) {
    const code = this.errorCorrection.getCode(body.code);
    if (!code) {
      throw new NotFoundException(`QEC code "${body.code}" not found`);
    }
    const logicalState = body.logicalState ?? new Array(code.nLogical).fill(0);
    const encoded = this.errorCorrection.encode(logicalState, code);
    const result = this.errorCorrection.measureSyndrome(encoded, code);
    return {
      code: body.code,
      syndrome: result.syndrome,
      errorPattern: result.errorPattern ?? [],
      correction: result.correction ?? [],
    };
  }

  // === Noise Modeling ===

  /** List supported noise channels and the built-in device models. */
  @Get('noise/channels')
  async getNoiseChannels() {
    return {
      channels: NOISE_CHANNEL_TYPES.map((id) => ({ id })),
      models: this.noise.getAvailableModels(),
    };
  }

  /** Validate a set of noise channels against the model. */
  @Post('noise/apply')
  async applyNoise(
    @Body()
    body: {
      channels: Array<{ type: string; params: Record<string, number>; targets: number[] }>;
    },
  ) {
    const channels = (body.channels ?? []).map((c) => ({
      ...c,
      valid: this.noise.validateNoiseParams(c.type as any, c.params as any),
    }));
    return {
      channels,
      allValid: channels.every((c) => c.valid),
    };
  }

  /** Characterize a device from one of the built-in noise models. */
  @Post('noise/characterize')
  async characterizeNoise(@Body() body: { model: string }) {
    const model = this.noise.getModel(body.model);
    if (!model) {
      throw new NotFoundException(`Noise model "${body.model}" not found`);
    }
    return {
      model: body.model,
      characteristics: this.noise.generateDeviceCharacteristics(model),
    };
  }

  // === Quantum ML ===

  /** List the available VQE ansatze and feature maps. */
  @Get('ml/vqe/ansatz')
  async getVQEAnsatzTypes() {
    return {
      ansatze: this.ml.getAvailableAnsatze().map((id) => ({
        id,
        ...this.ml.getAnsatzTemplate(id),
      })),
      featureMaps: this.ml.getAvailableFeatureMaps(),
    };
  }

  /** Run a real VQE optimization. */
  @Post('ml/vqe/run')
  async runVQE(
    @Body()
    body: {
      hamiltonian: { pauli: string; coefficient: number }[];
      ansatz: string;
      optimizer?: IOptimizerConfig['type'];
      maxIterations?: number;
      shots?: number;
    },
  ) {
    const ansatz = this.ml.getAnsatzTemplate(body.ansatz);
    if (!ansatz) {
      throw new BadRequestException(`Unknown ansatz "${body.ansatz}"`);
    }
    if (!Array.isArray(body.hamiltonian) || body.hamiltonian.length === 0) {
      throw new BadRequestException('hamiltonian must be a non-empty Pauli-term array');
    }

    const config: IVQEConfig = {
      hamiltonian: body.hamiltonian,
      ansatz,
      optimizer: {
        type: body.optimizer ?? 'COBYLA',
        maxIter: body.maxIterations ?? 100,
        tol: 1e-6,
      },
      shots: body.shots,
    };

    const result = await this.ml.runVQE(config);
    return {
      ansatz: body.ansatz,
      minEnergy: result.minEnergy,
      optimalParams: result.optimalParams,
      iterations: result.iterations,
      converged: result.converged,
    };
  }

  /** Compute a real quantum kernel matrix for the given data. */
  @Post('ml/kernel/matrix')
  async getKernelMatrix(@Body() body: { data: number[][]; featureMap?: string }) {
    if (!Array.isArray(body.data) || body.data.length === 0) {
      throw new BadRequestException('data must be a non-empty array of feature vectors');
    }
    const name = body.featureMap ?? this.ml.getAvailableFeatureMaps()[0];
    const featureMap = this.ml.getFeatureMap(name);
    if (!featureMap) {
      throw new BadRequestException(`Unknown feature map "${name}"`);
    }
    const matrix = this.ml.computeKernelMatrix(body.data, featureMap);
    return { featureMap: name, size: [body.data.length, body.data.length], matrix };
  }
}
