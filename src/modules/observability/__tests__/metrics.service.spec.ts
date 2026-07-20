/**
 * MetricsService tests — verify counters, histogram bucketing, and the
 * Prometheus text exposition output.
 */

import { MetricsService } from '../metrics.service';

describe('MetricsService', () => {
  let metrics: MetricsService;

  beforeEach(() => {
    metrics = new MetricsService();
  });

  it('counts requests by method/route/status', () => {
    metrics.recordHttpRequest('GET', '/api/v1/health', 200, 0.01);
    metrics.recordHttpRequest('GET', '/api/v1/health', 200, 0.02);
    metrics.recordHttpRequest('POST', '/api/v1/transpile', 201, 0.2);

    const out = metrics.render();
    expect(out).toContain(
      'casq_http_requests_total{method="GET",route="/api/v1/health",status="200"} 2',
    );
    expect(out).toContain(
      'casq_http_requests_total{method="POST",route="/api/v1/transpile",status="201"} 1',
    );
  });

  it('buckets latency cumulatively and reports sum/count', () => {
    // Three observations: 0.01s, 0.2s, 3s against the default buckets.
    for (const d of [0.01, 0.2, 3]) {
      metrics.recordHttpRequest('GET', '/x', 200, d);
    }
    const out = metrics.render();
    const labels = 'method="GET",route="/x",status="200"';

    // le=0.025 includes only the 0.01 observation.
    expect(out).toContain(`casq_http_request_duration_seconds_bucket{${labels},le="0.025"} 1`);
    // le=0.5 includes 0.01 and 0.2 → 2.
    expect(out).toContain(`casq_http_request_duration_seconds_bucket{${labels},le="0.5"} 2`);
    // +Inf includes all three.
    expect(out).toContain(`casq_http_request_duration_seconds_bucket{${labels},le="+Inf"} 3`);
    expect(out).toContain(`casq_http_request_duration_seconds_count{${labels}} 3`);
    expect(out).toContain(`casq_http_request_duration_seconds_sum{${labels}} 3.21`);
  });

  it('emits HELP/TYPE headers and process gauges', () => {
    const out = metrics.render();
    expect(out).toContain('# TYPE casq_http_requests_total counter');
    expect(out).toContain('# TYPE casq_http_request_duration_seconds histogram');
    expect(out).toMatch(/casq_process_uptime_seconds \d/);
    expect(out).toMatch(/casq_process_resident_memory_bytes \d/);
    expect(out).toMatch(/casq_build_info\{version="[^"]+"\} 1/);
  });

  it('escapes label values', () => {
    metrics.recordHttpRequest('GET', '/weird"\\route', 200, 0.01);
    const out = metrics.render();
    expect(out).toContain('route="/weird\\"\\\\route"');
  });

  it('records simulations by engine and outcome, with qubit/duration histograms', () => {
    metrics.recordSimulation('statevector', 3, 0.05, true);
    metrics.recordSimulation('statevector', 12, 0.4, true);
    metrics.recordSimulation('clifford', 2, 0.01, false); // failure

    const out = metrics.render();
    expect(out).toContain('casq_simulations_total{engine="statevector",status="ok"} 2');
    expect(out).toContain('casq_simulations_total{engine="clifford",status="error"} 1');
    // Qubit histogram: le=4 covers the 3-qubit run but not the 12-qubit one.
    expect(out).toContain('casq_simulation_qubits_bucket{engine="statevector",le="4"} 1');
    expect(out).toContain('casq_simulation_qubits_bucket{engine="statevector",le="+Inf"} 2');
    // Failures count, but don't pollute the success (qubit/duration) histograms.
    expect(out).not.toContain('casq_simulation_qubits_bucket{engine="clifford"');
    expect(out).not.toContain('casq_simulation_duration_seconds_count{engine="clifford"}');
    // Duration histogram present for the engine.
    expect(out).toContain('casq_simulation_duration_seconds_count{engine="statevector"} 2');
  });

  it('counts transpilations and accumulates inserted SWAPs', () => {
    metrics.recordTranspile(0, false); // no routing
    metrics.recordTranspile(2, true); // routed, 2 SWAPs
    metrics.recordTranspile(1, true); // routed, 1 SWAP

    const out = metrics.render();
    expect(out).toContain('casq_transpiles_total{routed="false"} 1');
    expect(out).toContain('casq_transpiles_total{routed="true"} 2');
    expect(out).toContain('casq_transpile_swaps_total 3');
  });
});
