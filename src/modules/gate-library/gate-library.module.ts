import { Module } from '@nestjs/common';
import { GateLibraryService } from './gate-library.service';

/**
 * Gate Library Module
 *
 * Provides quantum gate definitions and operations.
 * This is a core module that other modules depend on.
 */
@Module({
  providers: [GateLibraryService],
  exports: [GateLibraryService],
})
export class GateLibraryModule {}
