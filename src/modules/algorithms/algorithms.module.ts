import { Module } from '@nestjs/common';
import { AlgorithmsService } from './algorithms.service';
import { AlgorithmsController } from './algorithms.controller';
import { SimulationEnginesModule } from '../simulation-engines/simulation-engines.module';

@Module({
  imports: [SimulationEnginesModule],
  providers: [AlgorithmsService],
  controllers: [AlgorithmsController],
  exports: [AlgorithmsService],
})
export class AlgorithmsModule {}
