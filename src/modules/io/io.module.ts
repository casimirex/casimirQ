import { Module } from '@nestjs/common';
import { IOService } from './io.service';
import { IOController } from './io.controller';

@Module({
  providers: [IOService],
  controllers: [IOController],
  exports: [IOService],
})
export class IOModule {}
