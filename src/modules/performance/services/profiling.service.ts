/**
 * Profiling Service
 *
 * Tracks execution performance and resource usage.
 */

import { Injectable, Logger } from '@nestjs/common';
import { IExecutionProfile, IPerformanceMetrics, IProfilingConfig } from '../interfaces/performance.interface';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class ProfilingService {
  private readonly logger = new Logger(ProfilingService.name);
  private readonly profiles: Map<string, IExecutionProfile[]> = new Map();
  private readonly config: IProfilingConfig;
  private readonly metricsSubject = new Subject<IPerformanceMetrics>();
  private activeOperations = 0;

  constructor(config?: Partial<IProfilingConfig>) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      profileMemory: true,
      profileCpu: true,
      maxDurationMs: 60000,
      ...config,
    };
  }

  /**
   * Start profiling an operation
   */
  startOperation(operation: string, metadata?: { numQubits?: number; numGates?: number }): string {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return '';
    }

    const id = `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startMemory = this.config.profileMemory ? process.memoryUsage().heapUsed : 0;

    const profile: IExecutionProfile = {
      operation,
      startTime: performance.now(),
      endTime: 0,
      durationMs: 0,
      memoryUsed: 0,
      cpuUsage: 0,
      ...metadata,
    };

    this.profiles.set(id, [profile]);
    this.activeOperations++;

    return id;
  }

  /**
   * End profiling an operation
   */
  endOperation(id: string): IExecutionProfile | null {
    if (!id || !this.profiles.has(id)) return null;

    const profile = this.profiles.get(id)![0];
    profile.endTime = performance.now();
    profile.durationMs = profile.endTime - profile.startTime;

    if (this.config.profileMemory) {
      const endMemory = process.memoryUsage().heapUsed;
      profile.memoryUsed = Math.max(0, endMemory - profile.memoryUsed);
    }

    this.activeOperations--;
    return profile;
  }

  /**
   * Get operation statistics
   */
  getOperationStats(operation: string): { avgDuration: number; count: number; avgMemory: number } {
    const profiles = this.getProfiles(operation);
    if (profiles.length === 0) {
      return { avgDuration: 0, count: 0, avgMemory: 0 };
    }

    const totalDuration = profiles.reduce((sum, p) => sum + p.durationMs, 0);
    const totalMemory = profiles.reduce((sum, p) => sum + p.memoryUsed, 0);

    return {
      avgDuration: totalDuration / profiles.length,
      count: profiles.length,
      avgMemory: totalMemory / profiles.length,
    };
  }

  /**
   * Get all profiles for an operation
   */
  getProfiles(operation: string): IExecutionProfile[] {
    const allProfiles: IExecutionProfile[] = [];
    for (const [id, profiles] of this.profiles.entries()) {
      if (id.startsWith(operation)) {
        allProfiles.push(...profiles);
      }
    }
    return allProfiles;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): IPerformanceMetrics {
    const memUsage = process.memoryUsage();
    return {
      requestLatency: this.getAverageLatency(),
      throughput: this.getThroughput(),
      errorRate: 0,
      activeConnections: this.activeOperations,
      memoryUsage: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpuUsage: 0,
    };
  }

  /**
   * Get metrics as observable
   */
  getMetricsStream(): Observable<IPerformanceMetrics> {
    return this.metricsSubject.asObservable();
  }

  /**
   * Clear all profiles
   */
  clearProfiles(): void {
    this.profiles.clear();
  }

  /**
   * Get slow operations
   */
  getSlowOperations(thresholdMs: number): IExecutionProfile[] {
    const slow: IExecutionProfile[] = [];
    for (const profiles of this.profiles.values()) {
      for (const profile of profiles) {
        if (profile.durationMs > thresholdMs) {
          slow.push(profile);
        }
      }
    }
    return slow.sort((a, b) => b.durationMs - a.durationMs);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const metrics = this.getMetrics();
    const operations = Array.from(new Set(
      Array.from(this.profiles.values()).flat().map(p => p.operation)
    ));

    let report = 'Performance Report\n';
    report += '==================\n\n';
    report += `Memory Usage: ${(metrics.memoryUsage.used / 1024 / 1024).toFixed(2)} MB\n`;
    report += `Active Operations: ${metrics.activeConnections}\n\n`;

    for (const op of operations) {
      const stats = this.getOperationStats(op);
      report += `${op}:\n`;
      report += `  Count: ${stats.count}\n`;
      report += `  Avg Duration: ${stats.avgDuration.toFixed(2)}ms\n`;
      report += `  Avg Memory: ${(stats.avgMemory / 1024).toFixed(2)}KB\n\n`;
    }

    return report;
  }

  private getAverageLatency(): number {
    const allProfiles = Array.from(this.profiles.values()).flat();
    if (allProfiles.length === 0) return 0;
    const total = allProfiles.reduce((sum, p) => sum + p.durationMs, 0);
    return total / allProfiles.length;
  }

  private getThroughput(): number {
    const allProfiles = Array.from(this.profiles.values()).flat();
    if (allProfiles.length === 0) return 0;
    const timeWindow = 60000;
    const now = Date.now();
    const recent = allProfiles.filter(p => now - p.startTime < timeWindow);
    return (recent.length / timeWindow) * 1000;
  }
}
