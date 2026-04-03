/**
 * Generic TTL cache for data that changes infrequently (e.g. categories, options).
 */
export class TtlCache<T> {
  private data: T | null = null;
  private expiresAt = 0;
  private inflight: Promise<T> | null = null;
  private readonly ttlMs: number;
  private readonly fetcher: () => Promise<T>;

  constructor(fetcher: () => Promise<T>, ttlMs: number) {
    this.fetcher = fetcher;
    this.ttlMs = ttlMs;
  }

  /**
   * Get the cached value, refreshing if expired. Deduplicates concurrent fetches.
   */
  async get(): Promise<T> {
    if (this.data !== null && Date.now() < this.expiresAt) {
      return this.data;
    }

    if (this.inflight) return this.inflight;

    this.inflight = this.fetcher().then(
      (value) => {
        this.data = value;
        this.expiresAt = Date.now() + this.ttlMs;
        this.inflight = null;
        return value;
      },
      (err) => {
        this.inflight = null;
        throw err;
      },
    );

    return this.inflight;
  }

  /**
   * Invalidate the cache, forcing a refresh on next access.
   */
  invalidate(): void {
    this.data = null;
    this.expiresAt = 0;
    this.inflight = null;
  }
}
