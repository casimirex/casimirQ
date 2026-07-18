import { BackendRegistry } from '../backend-registry.service';
import {
  Backend,
  BackendCapabilities,
  BackendRunOptions,
  BackendRunResult,
  BackendType,
} from '../domain/backend';
import { CircuitSpec, SimulationRunnerService } from '../../api/services/simulation-runner.service';
import { LocalSimulatorBackend } from '../adapters/local-simulator.backend';
import { NoisySimulatorBackend } from '../adapters/noisy-simulator.backend';
import { EmulatedHardwareBackend } from '../adapters/emulated-hardware.backend';
import { RemoteQpuBackend } from '../adapters/remote-qpu.backend';

/** A minimal fake backend for registry tests. */
class FakeBackend extends Backend {
  constructor(
    readonly id: string,
    readonly type: BackendType = 'simulator',
  ) {
    super();
  }
  readonly name = this.id;
  readonly description = 'fake';
  readonly capabilities: BackendCapabilities = {
    maxQubits: 5,
    nativeGates: ['h', 'cx'],
    supportsNoise: false,
    connectivity: 'all-to-all',
    simulated: true,
  };
  isAvailable(): boolean {
    return true;
  }
  async run(_spec: CircuitSpec, _options: BackendRunOptions): Promise<BackendRunResult> {
    return {
      backendId: this.id,
      numQubits: 1,
      shots: 1,
      counts: {},
      probabilities: {},
      metadata: { executionTimeMs: 0 },
    };
  }
}

describe('BackendRegistry', () => {
  it('lists and looks up backends by id', () => {
    const a = new FakeBackend('a');
    const b = new FakeBackend('b', 'hardware');
    const registry = new BackendRegistry([a, b]);

    expect(registry.list()).toHaveLength(2);
    expect(registry.get('b')).toBe(b);
    expect(registry.get('missing')).toBeUndefined();
  });
});

describe('backend adapters', () => {
  // The adapters only touch the runner inside run(); capability/availability
  // checks need no real dependencies.
  const stubRunner = {} as SimulationRunnerService;

  it('local and noisy simulators are always available with sane capabilities', () => {
    const local = new LocalSimulatorBackend(stubRunner);
    const noisy = new NoisySimulatorBackend(stubRunner);

    for (const backend of [local, noisy]) {
      expect(backend.isAvailable()).toBe(true);
      expect(backend.capabilities.maxQubits).toBeGreaterThan(0);
      expect(backend.capabilities.nativeGates.length).toBeGreaterThan(0);
      expect(backend.capabilities.simulated).toBe(true);
    }
    expect(local.capabilities.supportsNoise).toBe(false);
    expect(noisy.capabilities.supportsNoise).toBe(true);
  });

  it('the emulated device has a restricted native set and linear connectivity', () => {
    const emulated = new EmulatedHardwareBackend(stubRunner);
    expect(emulated.type).toBe('hardware-emulator');
    expect(emulated.capabilities.connectivity).toBe('linear');
    // Hadamard is not in the superconducting-style native basis.
    expect(emulated.capabilities.nativeGates).not.toContain('h');
    expect(emulated.capabilities.nativeGates).toContain('cx');
  });

  it('the remote QPU is unavailable until credentials are configured', () => {
    const remote = new RemoteQpuBackend();
    expect(remote.type).toBe('hardware');
    expect(remote.capabilities.simulated).toBe(false);
    expect(remote.isAvailable()).toBe(false);

    process.env.CASQ_REMOTE_QPU_URL = 'https://example.test/run';
    process.env.CASQ_REMOTE_QPU_TOKEN = 'tok';
    try {
      expect(remote.isAvailable()).toBe(true);
    } finally {
      delete process.env.CASQ_REMOTE_QPU_URL;
      delete process.env.CASQ_REMOTE_QPU_TOKEN;
    }
  });
});
