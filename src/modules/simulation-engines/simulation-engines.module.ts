import { Module } from '@nestjs/common';
import { StatevectorEngine } from './engines/statevector-engine/statevector-engine';
import { MPSEngine } from './engines/mps-engine/mps-engine';
import { CliffordEngine } from './engines/clifford-engine/clifford-engine';
import { SimulationEnginesService } from './simulation-engines.service';

/**
 * Simulation Engines Module
 *
 * Provides quantum simulation backends:
 * - StatevectorEngine: Dense statevector simulation (N ≤ 28)
 * - MPSEngine: Matrix Product States (N ≤ 50, low entanglement)
 * - CliffordEngine: Stabilizer circuits (N ≤ 2000)
 * - SimulationEnginesService: Auto-selection router
 */
@Module({
  providers: [
    StatevectorEngine,
    {
      provide: MPSEngine,
      useFactory: () => new MPSEngine(),
    },
    CliffordEngine,
    SimulationEnginesService,
  ],
  exports: [
    StatevectorEngine,
    MPSEngine,
    CliffordEngine,
    SimulationEnginesService,
  ],
})
export class SimulationEnginesModule {}
