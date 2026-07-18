/**
 * Remote QPU backend — integration skeleton.
 *
 * This is the plug-in point for a real cloud quantum processor (IBM Quantum,
 * IonQ, AWS Braket, ...). It is *unavailable* until configured, so it never
 * pretends to be a device that isn't there:
 *
 *   CASQ_REMOTE_QPU_URL    — endpoint that accepts a circuit and returns counts
 *   CASQ_REMOTE_QPU_TOKEN  — bearer token for that endpoint
 *   CASQ_REMOTE_QPU_QUBITS — advertised qubit count (optional)
 *
 * When configured, `run` POSTs the circuit to the endpoint and normalizes the
 * response. A concrete provider adapter would subclass or replace this with the
 * vendor's exact request/response mapping and async job polling.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CircuitSpec } from '../../api/services/simulation-runner.service';
import {
  Backend,
  BackendCapabilities,
  BackendRunOptions,
  BackendRunResult,
  BackendType,
} from '../domain/backend';

@Injectable()
export class RemoteQpuBackend extends Backend {
  private readonly logger = new Logger(RemoteQpuBackend.name);

  readonly id = 'remote-qpu';
  readonly name = 'Remote QPU';
  readonly type: BackendType = 'hardware';
  readonly description =
    'Adapter for a real cloud quantum processor. Configure CASQ_REMOTE_QPU_URL and ' +
    'CASQ_REMOTE_QPU_TOKEN to enable; unavailable otherwise.';
  readonly capabilities: BackendCapabilities = {
    maxQubits: Number(process.env.CASQ_REMOTE_QPU_QUBITS) || 27,
    nativeGates: ['id', 'rz', 'sx', 'x', 'cx'],
    supportsNoise: true,
    connectivity: 'linear',
    simulated: false,
  };

  isAvailable(): boolean {
    return Boolean(process.env.CASQ_REMOTE_QPU_URL && process.env.CASQ_REMOTE_QPU_TOKEN);
  }

  async run(spec: CircuitSpec, options: BackendRunOptions): Promise<BackendRunResult> {
    if (!this.isAvailable()) {
      throw new Error(
        'Remote QPU backend is not configured. Set CASQ_REMOTE_QPU_URL and CASQ_REMOTE_QPU_TOKEN.',
      );
    }

    const url = process.env.CASQ_REMOTE_QPU_URL as string;
    const token = process.env.CASQ_REMOTE_QPU_TOKEN as string;
    const started = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        numQubits: spec.numQubits,
        operations: spec.operations ?? [],
        shots: options.shots ?? 1024,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Remote QPU returned HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    // Expect a `{ counts: Record<string, number> }` response; adapt as needed.
    const body = (await response.json()) as { counts?: Record<string, number> };
    const counts = body.counts ?? {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const probabilities: Record<string, number> = {};
    for (const [state, n] of Object.entries(counts)) {
      probabilities[state] = n / total;
    }

    return {
      backendId: this.id,
      numQubits: spec.numQubits,
      shots: options.shots ?? total,
      counts,
      probabilities,
      metadata: {
        executionTimeMs: Date.now() - started,
        remote: true,
        nativeGateFraction: this.nativeGateFraction(spec),
      },
    };
  }
}
