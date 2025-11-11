/**
 * Simple in-memory cache manager with TTL (Time To Live)
 * 
 * Used for caching the wishlist JSON file with automatic expiration.
 * When the GitHub Action updates the cache file, the old cache expires
 * and a fresh read happens automatically.
 * 
 * Features:
 * - Automatic expiration after TTL
 * - Instant updates when cache expires
 * - No external dependencies
 * - Handles concurrent requests efficiently
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats: Map<string, { hits: number; misses: number }> = new Map();
  private defaultTTL: number; // milliseconds

  constructor(defaultTTLSeconds: number = 45) {
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  /**
   * Get value from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.recordMiss(key);
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.recordMiss(key);
      return null;
    }

    this.recordHit(key);
    return entry.data as T;
  }

  /**
   * Set value in cache with optional TTL override
   */
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds || this.defaultTTL / 1000) * 1000;
    const expiresAt = Date.now() + ttl;

    this.cache.set(key, {
      data,
      expiresAt,
    });
  }

  /**
   * Clear a specific cache entry
   */
  clear(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
    this.stats.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(key?: string): CacheStats | Map<string, CacheStats> {
    if (key) {
      const stat = this.stats.get(key);
      return {
        hits: stat?.hits ?? 0,
        misses: stat?.misses ?? 0,
        size: this.cache.size,
      };
    }

    const allStats = new Map<string, CacheStats>();
    for (const [k, v] of this.stats) {
      allStats.set(k, {
        hits: v.hits,
        misses: v.misses,
        size: this.cache.size,
      });
    }
    return allStats;
  }

  private recordHit(key: string): void {
    const stat = this.stats.get(key) || { hits: 0, misses: 0 };
    stat.hits++;
    this.stats.set(key, stat);
  }

  private recordMiss(key: string): void {
    const stat = this.stats.get(key) || { hits: 0, misses: 0 };
    stat.misses++;
    this.stats.set(key, stat);
  }
}

// Singleton instance for the entire application
export const cacheManager = new CacheManager(45); // 45 second TTL
