import { SimulationJobProcessor } from '../simulation-job.processor';
import { SimulationRunnerService } from '../../../api/services/simulation-runner.service';
import { SimulationsRepository } from '../../../api/repositories/simulations.repository';
import { BackendRegistry } from '../../../backends/backend-registry.service';
import { Backend } from '../../../backends/domain/backend';
import { Job } from '../../domain/job';
import { JobContext } from '../job-processor';

const ctx: JobContext = { reportProgress: async () => undefined };

function job(payload: unknown): Job {
  return {
    id: 'job-1',
    userId: 'u1',
    type: 'simulation',
    status: 'running',
    progress: 0,
    payload,
    result: null,
    error: null,
    createdAt: '',
    updatedAt: '',
    startedAt: null,
    finishedAt: null,
  };
}

describe('SimulationJobProcessor (backend routing)', () => {
  const runner = {
    buildCircuit: jest.fn(),
    run: jest.fn().mockReturnValue({
      status: 'completed',
      numQubits: 1,
      requestedEngine: 'statevector',
      shots: 10,
      results: {
        statevector: [{ state: '0', re: 1, im: 0, probability: 1 }],
        probabilities: { '0': 1 },
        counts: { '0': 10 },
      },
      metadata: { executionTimeMs: 1, memoryUsageBytes: 8 },
    }),
  } as unknown as SimulationRunnerService;
  const sims = {
    create: jest.fn().mockResolvedValue(undefined),
  } as unknown as SimulationsRepository;

  function makeBackend(over: Partial<Backend> & { runResult?: unknown } = {}): Backend {
    return {
      id: 'emulated-qpu',
      name: 'Emulated',
      type: 'hardware-emulator',
      description: '',
      capabilities: {
        maxQubits: 7,
        nativeGates: ['cx'],
        supportsNoise: true,
        connectivity: 'linear',
        simulated: true,
      },
      isAvailable: () => over.isAvailable?.() ?? true,
      run: jest.fn().mockResolvedValue(
        over.runResult ?? {
          backendId: 'emulated-qpu',
          numQubits: 1,
          shots: 10,
          counts: { '0': 6, '1': 4 },
          probabilities: { '0': 0.6, '1': 0.4 },
          metadata: { executionTimeMs: 2, purity: 0.9, nativeGateFraction: 0.5 },
        },
      ),
      ...over,
    } as unknown as Backend;
  }

  it('uses the default runner when no backend is named (keeps statevector)', async () => {
    const registry = new BackendRegistry([]);
    const p = new SimulationJobProcessor(runner, sims, registry);
    const result = (await p.run(
      job({ circuitName: 'c', spec: { numQubits: 1 }, config: {} }),
      ctx,
    )) as any;
    expect(result.requestedEngine).toBe('statevector');
    expect(result.results.statevector).toHaveLength(1);
  });

  it('routes to the named backend and surfaces its metadata', async () => {
    const backend = makeBackend();
    const registry = new BackendRegistry([backend]);
    const p = new SimulationJobProcessor(runner, sims, registry);
    const result = (await p.run(
      job({
        circuitName: 'c',
        spec: { numQubits: 1 },
        config: { shots: 10 },
        backendId: 'emulated-qpu',
      }),
      ctx,
    )) as any;
    expect(result.requestedEngine).toBe('emulated-qpu');
    expect(result.results.statevector).toHaveLength(0);
    expect(result.metadata.backendId).toBe('emulated-qpu');
    expect(result.metadata.purity).toBe(0.9);
  });

  it('fails clearly for an unknown or unavailable backend', async () => {
    const registry = new BackendRegistry([makeBackend({ isAvailable: () => false })]);
    const p = new SimulationJobProcessor(runner, sims, registry);
    await expect(
      p.run(
        job({ circuitName: 'c', spec: { numQubits: 1 }, config: {}, backendId: 'emulated-qpu' }),
        ctx,
      ),
    ).rejects.toThrow(/not available/);
    await expect(
      p.run(job({ circuitName: 'c', spec: { numQubits: 1 }, config: {}, backendId: 'nope' }), ctx),
    ).rejects.toThrow(/not found/);
  });
});
