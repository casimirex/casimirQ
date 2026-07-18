/**
 * TranspilerModule.
 *
 * Provides the transpiler service (and its REST endpoint) and exports it so
 * backends can decompose circuits to their native basis before running.
 * Imports ApiModule for the shared simulation runner and the auth guards.
 */

import { Module } from '@nestjs/common';
import { ApiModule } from '../api/api.module';
import { TranspilerService } from './transpiler.service';
import { TranspilerController } from './transpiler.controller';

@Module({
  imports: [ApiModule],
  controllers: [TranspilerController],
  providers: [TranspilerService],
  exports: [TranspilerService],
})
export class TranspilerModule {}
