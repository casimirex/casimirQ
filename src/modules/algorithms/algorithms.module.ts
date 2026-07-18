import { Module } from '@nestjs/common';
import { AlgorithmsService } from './algorithms.service';
import { AlgorithmsController } from './algorithms.controller';
import { SimulationEnginesModule } from '../simulation-engines/simulation-engines.module';
import { ApiModule } from '../api/api.module';

@Module({
  // ApiModule is imported so the controller's JwtAuthGuard / RateLimitGuard
  // (and their AuthService dependency) resolve from this module's injector.
  imports: [SimulationEnginesModule, ApiModule],
  providers: [AlgorithmsService],
  controllers: [AlgorithmsController],
  exports: [AlgorithmsService],
})
export class AlgorithmsModule {}
