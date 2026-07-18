import { Module } from '@nestjs/common';
import { GateLibraryModule } from './modules/gate-library/gate-library.module';
import { CircuitEngineModule } from './modules/circuit-engine/circuit-engine.module';
import { SimulationEnginesModule } from './modules/simulation-engines/simulation-engines.module';
import { AlgorithmsModule } from './modules/algorithms/algorithms.module';
import { IOModule } from './modules/io/io.module';
import { VisualizationModule } from './modules/visualization/visualization.module';
import { ApiModule } from './modules/api/api.module';
import { JobEngineModule } from './modules/job-engine/job-engine.module';
import { BackendsModule } from './modules/backends/backends.module';

/**
 * Root Application Module
 *
 * Combines all feature modules for casimirQ.
 * Phase 3: Added Algorithms and I/O modules.
 * Phase 4: Added Visualization module.
 * Phase 6: Added Advanced Features (QEC, noise, ML).
 * Phase 7: Added API & Integration Layer.
 */
@Module({
  imports: [
    GateLibraryModule,
    CircuitEngineModule,
    SimulationEnginesModule,
    AlgorithmsModule,
    IOModule,
    VisualizationModule,
    ApiModule,
    JobEngineModule,
    BackendsModule,
  ],
})
export class AppModule {}
