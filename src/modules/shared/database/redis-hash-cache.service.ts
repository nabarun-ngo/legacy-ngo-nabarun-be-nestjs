import { Injectable,Logger } from "@nestjs/common";
import { Redis } from "ioredis";

export interface CacheOptions {
  prefix?: string;
  ttl?: number; // Time to live in seconds
}

export interface FindOptions {
  cursor?: string;
  count?: number;
}

export interface FindResult<T> {
  items: T[];
  cursor: string;
  hasMore: boolean;
}

@Injectable()
export class RedisHashCacheService {
  private readonly logger = new Logger(RedisHashCacheService.name);
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Generate a Redis key for a hash, similar to BullMQ's pattern
   * Example: "myapp:users:123"
   */
  private getKey(prefix: string, id: string | number): string {
    return `${prefix}:${id}`;
  }

  /**
   * Generate a pattern for scanning keys
   * Example: "myapp:users:*"
   */
  private getPattern(prefix: string): string {
    return `${prefix}:*`;
  }

  /**
   * Save data to Redis hash (like BullMQ stores job data)
   * @param prefix - Namespace prefix (e.g., "myapp:users")
   * @param id - Unique identifier
   * @param data - Data object to store
   * @param ttl - Optional TTL in seconds
   */
  async save<T extends Record<string, any>>(
    prefix: string,
    id: string | number,
    data: T,
    ttl?: number,
  ): Promise<void> {
    const key = this.getKey(prefix, id);
    const pipeline = this.redis.pipeline();

    // Flatten the object and store in hash
    const flatData = this.flattenObject(data);

    // Store metadata
    flatData._id = String(id);
    flatData._createdAt = flatData._createdAt || new Date().toISOString();
    flatData._updatedAt = new Date().toISOString();

    pipeline.hset(key, flatData);

    if (ttl) {
      pipeline.expire(key, ttl);
    }

    await pipeline.exec();
    this.logger.debug(`Saved data to ${key}`);
  }

  /**
   * Find data by ID
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   */
  async findById<T>(prefix: string, id: string | number): Promise<T | null> {
    const key = this.getKey(prefix, id);
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) {
      return null;
    }

    return this.unflattenObject<T>(data);
  }

  /**
   * Find multiple items by IDs
   * @param prefix - Namespace prefix
   * @param ids - Array of identifiers
   */
  async findByIds<T>(
    prefix: string,
    ids: (string | number)[],
  ): Promise<(T | null)[]> {
    if (ids.length === 0) return [];

    const pipeline = this.redis.pipeline();

    ids.forEach((id) => {
      const key = this.getKey(prefix, id);
      pipeline.hgetall(key);
    });

    const results = await pipeline.exec();

    if (!results) {
      return ids.map(() => null);
    }

    return results.map(([err, data]) => {
      if (err || !data || Object.keys(data).length === 0) {
        return null;
      }
      return this.unflattenObject<T>(data as Record<string, string>);
    });
  }

  /**
   * Find all items with pagination (using SCAN for efficiency)
   * @param prefix - Namespace prefix
   * @param options - Find options
   */
  async findAll<T>(
    prefix: string,
    options: FindOptions = {},
  ): Promise<FindResult<T>> {
    const { cursor = "0", count = 100 } = options;
    const pattern = this.getPattern(prefix);

    const [nextCursor, keys] = await this.redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      count,
    );

    const items: T[] = [];

    if (keys.length > 0) {
      const pipeline = this.redis.pipeline();
      keys.forEach((key) => pipeline.hgetall(key));
      const results = await pipeline.exec();

      if (results) {
        results.forEach(([err, data]) => {
          if (!err && data && Object.keys(data).length > 0) {
            items.push(this.unflattenObject<T>(data as Record<string, string>));
          }
        });
      }
    }

    return {
      items,
      cursor: nextCursor,
      hasMore: nextCursor !== "0",
    };
  }

  /**
   * Get all items (use with caution on large datasets)
   * @param prefix - Namespace prefix
   */
  async getAll<T>(prefix: string): Promise<T[]> {
    const allItems: T[] = [];
    let cursor = "0";

    do {
      const result = await this.findAll<T>(prefix, { cursor, count: 1000 });
      allItems.push(...result.items);
      cursor = result.cursor;
    } while (cursor !== "0");

    return allItems;
  }

  /**
   * Update specific fields in a hash
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   * @param data - Partial data to update
   */
  async update<T extends Record<string, any>>(
    prefix: string,
    id: string | number,
    data: Partial<T>,
  ): Promise<void> {
    const key = this.getKey(prefix, id);
    const exists = await this.redis.exists(key);

    if (!exists) {
      throw new Error(`Key ${key} does not exist`);
    }

    const flatData = this.flattenObject(data);
    flatData._updatedAt = new Date().toISOString();

    await this.redis.hset(key, flatData);
    this.logger.debug(`Updated data in ${key}`);
  }

  /**
   * Delete data by ID
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   */
  async delete(prefix: string, id: string | number): Promise<boolean> {
    const key = this.getKey(prefix, id);
    const result = await this.redis.del(key);
    this.logger.debug(`Deleted ${key}`);
    return result > 0;
  }

  /**
   * Delete multiple items by IDs
   * @param prefix - Namespace prefix
   * @param ids - Array of identifiers
   */
  async deleteMany(prefix: string, ids: (string | number)[]): Promise<number> {
    if (ids.length === 0) return 0;

    const keys = ids.map((id) => this.getKey(prefix, id));
    const result = await this.redis.del(...keys);
    this.logger.debug(`Deleted ${result} keys`);
    return result;
  }

  /**
   * Delete all items with a prefix (use with caution)
   * @param prefix - Namespace prefix
   */
  async deleteAll(prefix: string): Promise<number> {
    let cursor = "0";
    let totalDeleted = 0;
    const pattern = this.getPattern(prefix);

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        1000,
      );

      if (keys.length > 0) {
        const deleted = await this.redis.del(...keys);
        totalDeleted += deleted;
      }

      cursor = nextCursor;
    } while (cursor !== "0");

    this.logger.debug(`Deleted ${totalDeleted} keys with prefix ${prefix}`);
    return totalDeleted;
  }

  /**
   * Check if a key exists
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   */
  async exists(prefix: string, id: string | number): Promise<boolean> {
    const key = this.getKey(prefix, id);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Get a specific field from a hash
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   * @param field - Field name
   */
  async getField(
    prefix: string,
    id: string | number,
    field: string,
  ): Promise<string | null> {
    const key = this.getKey(prefix, id);
    return this.redis.hget(key, field);
  }

  /**
   * Set a specific field in a hash
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   * @param field - Field name
   * @param value - Field value
   */
  async setField(
    prefix: string,
    id: string | number,
    field: string,
    value: string | number,
  ): Promise<void> {
    const key = this.getKey(prefix, id);
    await this.redis.hset(key, field, String(value));
  }

  /**
   * Increment a numeric field in a hash
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   * @param field - Field name
   * @param increment - Amount to increment (default: 1)
   */
  async incrementField(
    prefix: string,
    id: string | number,
    field: string,
    increment: number = 1,
  ): Promise<number> {
    const key = this.getKey(prefix, id);
    return this.redis.hincrby(key, field, increment);
  }

  /**
   * Set TTL for a hash
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   * @param ttl - Time to live in seconds
   */
  async setTTL(
    prefix: string,
    id: string | number,
    ttl: number,
  ): Promise<void> {
    const key = this.getKey(prefix, id);
    await this.redis.expire(key, ttl);
  }

  /**
   * Get TTL for a hash
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   */
  async getTTL(prefix: string, id: string | number): Promise<number> {
    const key = this.getKey(prefix, id);
    return this.redis.ttl(key);
  }

  /**
   * Count items with a prefix
   * @param prefix - Namespace prefix
   */
  async count(prefix: string): Promise<number> {
    let cursor = "0";
    let count = 0;
    const pattern = this.getPattern(prefix);

    do {
      const [nextCursor, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        1000,
      );
      count += keys.length;
      cursor = nextCursor;
    } while (cursor !== "0");

    return count;
  }

  /**
   * Flatten nested objects for Redis hash storage
   * Similar to BullMQ's approach
   */
  private flattenObject(
    obj: Record<string, any>,
    prefix: string = "",
  ): Record<string, string> {
    const flattened: Record<string, string> = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;

        if (value === null || value === undefined) {
          flattened[newKey] = "";
        } else if (
          typeof value === "object" &&
          !Array.isArray(value) &&
          !(value instanceof Date)
        ) {
          // Recursively flatten nested objects
          Object.assign(flattened, this.flattenObject(value, newKey));
        } else if (Array.isArray(value) || value instanceof Date) {
          // Serialize arrays and dates as JSON
          flattened[newKey] = JSON.stringify(value);
        } else {
          flattened[newKey] = String(value);
        }
      }
    }

    return flattened;
  }

  /**
   * Unflatten Redis hash data back to nested object
   */
  private unflattenObject<T>(flatData: Record<string, string>): T {
    const result: any = {};

    for (const key in flatData) {
      if (flatData.hasOwnProperty(key)) {
        const value = flatData[key];
        const keys = key.split(".");
        let current = result;

        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!current[k]) {
            current[k] = {};
          }
          current = current[k];
        }

        const lastKey = keys[keys.length - 1];

        // Safer parsing logic
        try {
          if (
            (value.startsWith("[") && value.endsWith("]")) ||
            (value.startsWith("{") && value.endsWith("}")) ||
            value.startsWith('"')
          ) {
            current[lastKey] = JSON.parse(value);
          } else if (value === "") {
            current[lastKey] = null;
          } else {
            // Keep as string to avoid data corruption (e.g. phone numbers becoming numbers)
            current[lastKey] = value;
          }
        } catch {
          current[lastKey] = value;
        }
      }
    }

    return result as T;
  }

  /**
   * Push an item to a Redis List (Atomic Append + Limit)
   * Perfect for logs: Adds to top, keeps size fixed, sets TTL.
   * NOTE: We use LIST instead of HASH here because logs are time-series data
   * where order matters (LIFO). Hashes are unordered and better for objects.
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   * @param item - Item to store
   * @param maxSize - Max items to keep (default: 100)
   * @param ttl - TTL in seconds (default: 7 days)
   */
  async pushToList<T>(
    prefix: string,
    id: string | number,
    item: T,
    maxSize: number = 100,
    ttl: number = 604800, // 7 days
  ): Promise<void> {
    const key = this.getKey(prefix, id);
    const pipeline = this.redis.pipeline();
    const serialized =
      typeof item === "object" ? this.serialize(item) : String(item);

    pipeline.lpush(key, serialized); // Add to head
    pipeline.ltrim(key, 0, maxSize - 1); // Keep only top N
    pipeline.expire(key, ttl); // Refresh TTL

    await pipeline.exec();
  }

  /**
   * Get items from a Redis List
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   * @param start - Start index (default: 0)
   * @param end - End index (default: -1 for all)
   */
  async getList<T>(
    prefix: string,
    id: string | number,
    start: number = 0,
    end: number = -1,
  ): Promise<T[]> {
    const key = this.getKey(prefix, id);
    const items = await this.redis.lrange(key, start, end);

    return items.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return item as unknown as T;
      }
    });
  }

  /**
   * Clear a Redis List
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   */
  async clearList(prefix: string, id: string | number): Promise<boolean> {
    const key = this.getKey(prefix, id);
    const result = await this.redis.del(key);
    this.logger.debug(`Cleared list ${key}`);
    return result > 0;
  }

  /**
   * Remove a specific item from a Redis List
   * @param prefix - Namespace prefix
   * @param id - Unique identifier
   * @param item - Item to remove
   * @param count - Number of occurrences to remove (default: 0 = all)
   */
  async removeFromList<T>(
    prefix: string,
    id: string | number,
    item: T,
    count: number = 0,
  ): Promise<number> {
    const key = this.getKey(prefix, id);
    const serialized =
      typeof item === "object" ? this.serialize(item) : String(item);
    const result = await this.redis.lrem(key, count, serialized);
    this.logger.debug(`Removed ${result} items from list ${key}`);
    return result;
  }

  private serialize(r: any) {
    {
      if (
        r &&
        typeof r === "object" &&
        !(r instanceof Date) &&
        !Array.isArray(r)
      ) {
        // If it's a complex object like a timer handle (Immediate), skip it or stringify safely
        try {
          return JSON.stringify(r);
        } catch {
          return "[Non-Serializable Object]";
        }
      }
      return r;
    }
  }
}
