/**
 * Advanced Features Module
 *
 * Provides quantum error correction, noise modeling,
 * quantum machine learning, and multi-circuit execution.
 */

import { Module } from '@nestjs/common';
import { AdvancedFeaturesController } from './advanced-features.controller';
import {
  ErrorCorrectionService,
  NoiseModelingService,
  QuantumMLService,
  MultiCircuitExecutionService,
} from './services';

@Module({
  controllers: [AdvancedFeaturesController],
  providers: [
    ErrorCorrectionService,
    NoiseModelingService,
    QuantumMLService,
    MultiCircuitExecutionService,
  ],
  exports: [
    ErrorCorrectionService,
    NoiseModelingService,
    QuantumMLService,
    MultiCircuitExecutionService,
  ],
})
export class AdvancedFeaturesModule {}
