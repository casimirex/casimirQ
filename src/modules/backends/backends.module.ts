/**
 * BackendsModule.
 *
 * Registers the execution backends behind a common port. Local and noisy
 * simulators plus an emulated device are always available; the remote-QPU
 * adapter is registered but stays unavailable until credentials are configured.
 * Imports ApiModule for the shared simulation runner and the auth guards.
 */

import { Module } from '@nestjs/common';
import { ApiModule } from '../api/api.module';
import { BACKENDS } from './domain/backend';
import { LocalSimulatorBackend } from './adapters/local-simulator.backend';
import { NoisySimulatorBackend } from './adapters/noisy-simulator.backend';
import { EmulatedHardwareBackend } from './adapters/emulated-hardware.backend';
import { RemoteQpuBackend } from './adapters/remote-qpu.backend';
import { BackendRegistry } from './backend-registry.service';
import { BackendsController } from './interface/backends.controller';

@Module({
  imports: [ApiModule],
  controllers: [BackendsController],
  providers: [
    LocalSimulatorBackend,
    NoisySimulatorBackend,
    EmulatedHardwareBackend,
    RemoteQpuBackend,
    {
      provide: BACKENDS,
      useFactory: (
        local: LocalSimulatorBackend,
        noisy: NoisySimulatorBackend,
        emulated: EmulatedHardwareBackend,
        remote: RemoteQpuBackend,
      ) => [local, noisy, emulated, remote],
      inject: [
        LocalSimulatorBackend,
        NoisySimulatorBackend,
        EmulatedHardwareBackend,
        RemoteQpuBackend,
      ],
    },
    BackendRegistry,
  ],
  exports: [BackendRegistry],
})
export class BackendsModule {}
