/**
 * Performance Module
 *
 * Provides caching, optimization, and profiling capabilities.
 */

import { Module } from '@nestjs/common';
import { CacheService } from './services/cache.service';
import { CircuitOptimizerService } from './services/circuit-optimizer.service';
import { ProfilingService } from './services/profiling.service';

@Module({
  providers: [CacheService, CircuitOptimizerService, ProfilingService],
  exports: [CacheService, CircuitOptimizerService, ProfilingService],
})
export class PerformanceModule {}

export { CacheService } from './services/cache.service';
export { CircuitOptimizerService } from './services/circuit-optimizer.service';
export { ProfilingService } from './services/profiling.service';
export * from './interfaces/performance.interface';
