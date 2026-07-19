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
});
