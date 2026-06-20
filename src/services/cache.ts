import type { CacheEntry } from '@/types';

class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize = 1000;

  set<T>(key: string, data: T, ttlMs: number): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const cacheService = new CacheService();

// TTL constants
export const TTL = {
  QUOTE: 2 * 60 * 1000,          // 2 min - live prices
  HISTORICAL: 60 * 60 * 1000,    // 1 hour - daily bars
  FUNDAMENTALS: 6 * 60 * 60 * 1000, // 6 hours
  NEWS: 15 * 60 * 1000,           // 15 min
  RATINGS: 6 * 60 * 60 * 1000,   // 6 hours
  MARKET_SUMMARY: 5 * 60 * 1000, // 5 min
  SEARCH: 10 * 60 * 1000,        // 10 min
} as const;
