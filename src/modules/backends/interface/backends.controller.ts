/**
 * Backends API.
 *
 * Lists the execution targets and their capabilities/availability, and runs a
 * circuit on a chosen backend. Selecting where a circuit runs is just a backend
 * id — the request body is otherwise identical across simulators and hardware.
 */

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../api/guards/jwt-auth.guard';
import { RateLimitGuard } from '../../api/guards/rate-limit.guard';
import { Backend } from '../domain/backend';
import { BackendRegistry } from '../backend-registry.service';
import { RunOnBackendDto } from './run-on-backend.dto';

function toBackendView(backend: Backend) {
  return {
    id: backend.id,
    name: backend.name,
    type: backend.type,
    description: backend.description,
    available: backend.isAvailable(),
    capabilities: backend.capabilities,
  };
}

@ApiTags('Backends')
@ApiBearerAuth('bearer')
@Controller('api/v1/backends')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class BackendsController {
  constructor(private readonly registry: BackendRegistry) {}

  /** List the available execution backends and their capabilities. */
  @Get()
  listBackends() {
    return { backends: this.registry.list().map(toBackendView) };
  }

  /** Fetch a single backend's details. */
  @Get(':id')
  getBackend(@Param('id') id: string) {
    const backend = this.registry.get(id);
    if (!backend) {
      throw new NotFoundException(`Backend "${id}" not found`);
    }
    return toBackendView(backend);
  }

  /** Run a circuit on the chosen backend. */
  @Post(':id/run')
  async run(@Param('id') id: string, @Body() body: RunOnBackendDto) {
    const backend = this.registry.get(id);
    if (!backend) {
      throw new NotFoundException(`Backend "${id}" not found`);
    }
    if (!backend.isAvailable()) {
      throw new ServiceUnavailableException(`Backend "${id}" is not available`);
    }
    if (body.numQubits > backend.capabilities.maxQubits) {
      throw new ServiceUnavailableException(
        `Backend "${id}" supports up to ${backend.capabilities.maxQubits} qubits (got ${body.numQubits})`,
      );
    }

    const result = await backend.run(
      { numQubits: body.numQubits, operations: body.operations },
      { shots: body.shots, seed: body.seed, noise: body.noise },
    );
    return result;
  }
}
