/**
 * Cache Service
 *
 * Provides LRU caching for simulation results and circuit data.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ICacheEntry, ICacheStats } from '../interfaces/performance.interface';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, ICacheEntry<unknown>>();
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(maxSizeBytes = 100 * 1024 * 1024, defaultTTLMs = 3600000) {
    this.maxSize = maxSizeBytes;
    this.defaultTTL = defaultTTLMs;
    this.startCleanupInterval();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    entry.accessCount++;
    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttlMs = this.defaultTTL): void {
    const sizeBytes = this.estimateSize(value);

    // Check if we need to evict entries
    while (this.getCurrentSize() + sizeBytes > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    const entry: ICacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      accessCount: 0,
      sizeBytes,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): ICacheStats {
    const totalAccesses = this.stats.hits + this.stats.misses;
    return {
      entryCount: this.cache.size,
      totalSizeBytes: this.getCurrentSize(),
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalAccesses > 0 ? this.stats.hits / totalAccesses : 0,
      evictions: this.stats.evictions,
    };
  }

  /**
   * Get multiple keys
   */
  getMany<T>(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * Set multiple entries
   */
  setMany<T>(entries: Array<{ key: string; value: T; ttlMs?: number }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttlMs);
    }
  }

  /**
   * Get cache keys matching pattern
   */
  keys(pattern?: RegExp): string[] {
    const keys = Array.from(this.cache.keys());
    if (!pattern) return keys;
    return keys.filter((k) => pattern.test(k));
  }

  /**
   * Prefetch values
   */
  async prefetch<T>(
    keys: string[],
    fetcher: (key: string) => Promise<T>,
    ttlMs?: number,
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const value = await fetcher(key);
          this.set(key, value, ttlMs);
        } catch (error) {
          this.logger.warn(`Failed to prefetch ${key}: ${error}`);
        }
      }
    });
    await Promise.all(promises);
  }

  /**
   * Invalidate by pattern
   */
  invalidatePattern(pattern: RegExp): number {
    const keysToDelete = this.keys(pattern);
    let count = 0;
    for (const key of keysToDelete) {
      if (this.cache.delete(key)) count++;
    }
    return count;
  }

  private getCurrentSize(): number {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += entry.sizeBytes;
    }
    return size;
  }

  private estimateSize(value: unknown): number {
    try {
      return JSON.stringify(value).length * 2; // UTF-16 = 2 bytes per char
    } catch {
      return 1024; // Default estimate
    }
  }

  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }
}
