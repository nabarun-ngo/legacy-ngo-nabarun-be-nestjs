import { CACHE_MANAGER,Cache } from "@nestjs/cache-manager";
import { Inject,Injectable } from "@nestjs/common";

let activeCacheService: CacheService | undefined;

export function getActiveCacheService(): CacheService | undefined {
  return activeCacheService;
}

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    activeCacheService = this;
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    options?: { cacheNull?: boolean },
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    if (value !== null || options?.cacheNull === true) {
      await this.set(key, value, ttl);
    }
    return value;
  }
}
