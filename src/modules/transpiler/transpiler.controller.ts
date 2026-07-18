/**
 * Transpiler API — rewrite a circuit into the native gate basis.
 */

import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../api/guards/jwt-auth.guard';
import { RateLimitGuard } from '../api/guards/rate-limit.guard';
import { TranspilerService } from './transpiler.service';
import { TranspileDto } from './transpile.dto';

@ApiTags('Transpiler')
@ApiBearerAuth('bearer')
@Controller('api/v1/transpile')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class TranspilerController {
  constructor(private readonly transpiler: TranspilerService) {}

  /** Decompose a circuit into the native gate basis. */
  @Post()
  transpile(@Body() body: TranspileDto) {
    return this.transpiler.transpile({
      numQubits: body.numQubits,
      operations: body.operations,
    });
  }
}
