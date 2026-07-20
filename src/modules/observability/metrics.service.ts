/**
 * MetricsService — a tiny in-process metrics registry that renders the
 * Prometheus text exposition format.
 *
 * Deliberately dependency-free: the platform tracks a small, fixed set of
 * metrics (HTTP request counts + latency, plus a few process gauges), so a
 * hand-rolled registry is simpler and lighter than pulling in a client library,
 * and it is fully unit-testable. Scraped at `GET /metrics`.
 */

import { Injectable } from '@nestjs/common';

/** Metric label set; values are rendered verbatim (after minimal escaping). */
export type Labels = Record<string, string>;

/** Latency histogram buckets, in seconds. */
const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/** Qubit-count histogram buckets (circuit width). */
const QUBIT_BUCKETS = [1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24];

interface CounterMetric {
  help: string;
  series: Map<string, { labels: Labels; value: number }>;
}

interface HistogramMetric {
  help: string;
  buckets: number[];
  series: Map<string, { labels: Labels; counts: number[]; sum: number; count: number }>;
}

function readVersion(): string {
  try {
    // Resolved relative to the compiled file; project root holds package.json.

    return require('../../../package.json').version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, CounterMetric>();
  private readonly histograms = new Map<string, HistogramMetric>();
  private readonly version = readVersion();

  constructor() {
    this.counters.set('casq_http_requests_total', {
      help: 'Total HTTP requests handled, by method, route and status.',
      series: new Map(),
    });
    this.histograms.set('casq_http_request_duration_seconds', {
      help: 'HTTP request latency in seconds, by method, route and status.',
      buckets: DURATION_BUCKETS,
      series: new Map(),
    });

    // Domain metrics — what the platform actually does, not just HTTP traffic.
    this.counters.set('casq_simulations_total', {
      help: 'Circuit simulations run, by engine and outcome.',
      series: new Map(),
    });
    this.histograms.set('casq_simulation_qubits', {
      help: 'Circuit width (number of qubits) of simulated circuits.',
      buckets: QUBIT_BUCKETS,
      series: new Map(),
    });
    this.histograms.set('casq_simulation_duration_seconds', {
      help: 'Wall-clock time to run a simulation, in seconds, by engine.',
      buckets: DURATION_BUCKETS,
      series: new Map(),
    });
    this.counters.set('casq_transpiles_total', {
      help: 'Circuit transpilations performed, by whether routing ran.',
      series: new Map(),
    });
    this.counters.set('casq_transpile_swaps_total', {
      help: 'Total SWAP gates inserted by routing across all transpilations.',
      series: new Map(),
    });
  }

  /** Record one completed HTTP request. */
  recordHttpRequest(method: string, route: string, status: number, durationSeconds: number): void {
    const labels: Labels = { method, route, status: String(status) };
    this.incrementCounter('casq_http_requests_total', labels);
    this.observeHistogram('casq_http_request_duration_seconds', labels, durationSeconds);
  }

  /** Record one circuit simulation (success or failure). */
  recordSimulation(engine: string, numQubits: number, durationSeconds: number, ok: boolean): void {
    this.incrementCounter('casq_simulations_total', { engine, status: ok ? 'ok' : 'error' });
    if (ok) {
      this.observeHistogram('casq_simulation_qubits', { engine }, numQubits);
      this.observeHistogram('casq_simulation_duration_seconds', { engine }, durationSeconds);
    }
  }

  /** Record one transpilation, plus any SWAPs its routing inserted. */
  recordTranspile(swapCount: number, routed: boolean): void {
    this.incrementCounter('casq_transpiles_total', { routed: String(routed) });
    if (swapCount > 0) {
      this.incrementCounter('casq_transpile_swaps_total', {}, swapCount);
    }
  }

  private incrementCounter(name: string, labels: Labels, amount = 1): void {
    const metric = this.counters.get(name);
    if (!metric) return;
    const key = labelKey(labels);
    const existing = metric.series.get(key);
    if (existing) existing.value += amount;
    else metric.series.set(key, { labels, value: amount });
  }

  private observeHistogram(name: string, labels: Labels, value: number): void {
    const metric = this.histograms.get(name);
    if (!metric) return;
    const key = labelKey(labels);
    let series = metric.series.get(key);
    if (!series) {
      series = { labels, counts: new Array(metric.buckets.length).fill(0), sum: 0, count: 0 };
      metric.series.set(key, series);
    }
    series.sum += value;
    series.count += 1;
    for (let i = 0; i < metric.buckets.length; i++) {
      if (value <= metric.buckets[i]) series.counts[i] += 1;
    }
  }

  /** Render every metric in Prometheus text exposition format. */
  render(): string {
    const lines: string[] = [];

    for (const [name, metric] of this.counters) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} counter`);
      for (const { labels, value } of metric.series.values()) {
        lines.push(`${name}${renderLabels(labels)} ${value}`);
      }
    }

    for (const [name, metric] of this.histograms) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} histogram`);
      for (const series of metric.series.values()) {
        let cumulative = 0;
        for (let i = 0; i < metric.buckets.length; i++) {
          cumulative = series.counts[i];
          lines.push(
            `${name}_bucket${renderLabels({ ...series.labels, le: String(metric.buckets[i]) })} ${cumulative}`,
          );
        }
        lines.push(
          `${name}_bucket${renderLabels({ ...series.labels, le: '+Inf' })} ${series.count}`,
        );
        lines.push(`${name}_sum${renderLabels(series.labels)} ${series.sum}`);
        lines.push(`${name}_count${renderLabels(series.labels)} ${series.count}`);
      }
    }

    // Process gauges, sampled at scrape time.
    const mem = process.memoryUsage();
    lines.push('# HELP casq_process_uptime_seconds Process uptime in seconds.');
    lines.push('# TYPE casq_process_uptime_seconds gauge');
    lines.push(`casq_process_uptime_seconds ${process.uptime()}`);
    lines.push('# HELP casq_process_resident_memory_bytes Resident memory size in bytes.');
    lines.push('# TYPE casq_process_resident_memory_bytes gauge');
    lines.push(`casq_process_resident_memory_bytes ${mem.rss}`);
    lines.push('# HELP casq_build_info Build information.');
    lines.push('# TYPE casq_build_info gauge');
    lines.push(`casq_build_info${renderLabels({ version: this.version })} 1`);

    return lines.join('\n') + '\n';
  }
}

/** Stable key for a label set (order-independent). */
function labelKey(labels: Labels): string {
  return Object.keys(labels)
    .sort()
    .map((k) => `${k}=${labels[k]}`)
    .join(',');
}

/** Render `{k="v",…}` with Prometheus escaping, or '' for no labels. */
function renderLabels(labels: Labels): string {
  const keys = Object.keys(labels);
  if (keys.length === 0) return '';
  const inner = keys
    .map((k) => `${k}="${escapeLabelValue(labels[k])}"`)
    .join(',');
  return `{${inner}}`;
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}
