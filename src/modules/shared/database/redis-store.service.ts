import { Injectable,Logger } from "@nestjs/common";
import { Redis } from "ioredis";
import { PagedResult } from "src/shared/models/paged-result";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BaseEntity {
  id?: string;
  createdAt?: string;
  executionLogs: string[];
  updatedAt?: string;
}

export interface PageOptions<T = any> {
  cursor?: string;
  count?: number;
  filter?: FilterOptions<T>;
  sortBy?: "asc" | "desc";
}

export interface FilterOptions<T> {
  field: keyof T;
  value: string | number;
}

// export interface PageResult<T> {
//     items: T[];
//     cursor: string;
//     hasMore: boolean;
// }

export interface SaveOptions<T> {
  ttl?: number;
  indexes?: (keyof T)[];
}

export interface TimelineOptions {
  start?: number;
  end?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class RedisStoreService {
  private readonly logger = new Logger(RedisStoreService.name);

  constructor(private readonly redis: Redis) {}

  // =========================================================================
  // Key Helpers
  // =========================================================================

  /** "ns:id" — hash key for a single entity */
  private entityKey(ns: string, id: string | number): string {
    return `${ns}:${id}`;
  }

  /** "ns:id:timeline" — list key for time-series data attached to an entity */
  private timelineKey(ns: string, id: string | number): string {
    return `${ns}:${id}:timeline`;
  }

  /** "ns:index" — sorted set indexing all entity IDs in a namespace */
  private indexKey(ns: string): string {
    return `${ns}:index`;
  }

  /** "ns:idx:field:value" — secondary index sorted set */
  private secondaryIndexKey(
    ns: string,
    field: string,
    value: string | number,
  ): string {
    return `${ns}:idx:${field}:${value}`;
  }

  // =========================================================================
  // Hash Operations — Structured Entity Storage
  // =========================================================================

  /**
   * Save or overwrite an entity as a Redis hash.
   * Maintains a primary sorted set index and optional secondary indexes.
   * Returns the entity ID (auto-generated if not provided).
   */
  async save<T extends BaseEntity>(
    ns: string,
    data: T,
    options: SaveOptions<T> = {},
  ): Promise<string> {
    const id = data.id ?? this.generateId();
    const now = new Date().toISOString();
    const score = Date.now();

    const entity = {
      ...data,
      id,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    };

    const flat = this.flatten(entity);
    const pipeline = this.redis.pipeline();

    pipeline.hset(this.entityKey(ns, id), flat);
    pipeline.zadd(this.indexKey(ns), score, id);

    for (const field of options.indexes ?? []) {
      const value = (data as any)[field];
      this.addToSecondaryIndex(pipeline, ns, String(field), value, id, score);
    }

    if (options.ttl) pipeline.expire(this.entityKey(ns, id), options.ttl);

    await pipeline.exec();
    this.logger.debug(`[${ns}] Saved entity ${id}`);
    return id;
  }

  /**
   * Update specific fields without overwriting the whole hash.
   * Handles secondary index updates when indexed field values change.
   */
  async update<T extends BaseEntity>(
    ns: string,
    id: string | number,
    patch: Partial<T>,
    options: { indexes?: (keyof T)[] } = {},
  ): Promise<void> {
    const key = this.entityKey(ns, id);

    if (!(await this.redis.exists(key))) {
      throw new Error(`[${ns}] Entity "${id}" not found`);
    }

    // If there are indexed fields in the patch, we need the old values
    // to remove stale index entries before writing new ones
    const indexedFieldsInPatch = (options.indexes ?? []).filter(
      (f) => patch[f] !== undefined,
    );

    if (indexedFieldsInPatch.length > 0) {
      const old = await this.findById<T>(ns, id);
      if (old) {
        const pipeline = this.redis.pipeline();
        for (const field of indexedFieldsInPatch) {
          const oldValue = (old as any)[field];
          const newValue = (patch as any)[field];
          // Remove from old secondary index bucket
          pipeline.zrem(
            this.secondaryIndexKey(ns, String(field), oldValue),
            String(id),
          );
          // Add to new secondary index bucket
          this.addToSecondaryIndex(
            pipeline,
            ns,
            String(field),
            newValue,
            String(id),
            Date.now(),
          );
        }
        await pipeline.exec();
      }
    }

    const flat = this.flatten({
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    await this.redis.hset(key, flat);
    this.logger.debug(`[${ns}] Updated entity ${id}`);
  }

  /**
   * Find a single entity by ID.
   */
  async findById<T>(ns: string, id: string | number): Promise<T | null> {
    const data = await this.redis.hgetall(this.entityKey(ns, id));
    if (!data || Object.keys(data).length === 0) return null;
    return this.unflatten<T>(data);
  }

  /**
   * Find multiple entities by IDs in a single pipeline round-trip.
   */
  async findByIds<T>(
    ns: string,
    ids: (string | number)[],
  ): Promise<(T | null)[]> {
    if (!ids.length) return [];

    const pipeline = this.redis.pipeline();
    ids.forEach((id) => pipeline.hgetall(this.entityKey(ns, id)));
    const results = await pipeline.exec();

    return (results ?? []).map(([err, data]) => {
      if (err || !data || Object.keys(data as object).length === 0) return null;
      return this.unflatten<T>(data as Record<string, string>);
    });
  }

  /**
   * Paginate all entities in a namespace, with optional filtering
   * via a secondary index and sort direction.
   */
  async findAll<T>(
    ns: string,
    options: PageOptions<T> = {},
  ): Promise<PagedResult<T>> {
    const { cursor = "0", count = 20, filter, sortBy = "asc" } = options;
    const offset = parseInt(cursor, 10);

    const idxKey = filter
      ? this.secondaryIndexKey(ns, String(filter.field), filter.value)
      : this.indexKey(ns);

    const total = await this.redis.zcard(idxKey);

    const ids =
      sortBy === "asc"
        ? await this.redis.zrange(idxKey, offset, offset + count - 1)
        : await this.redis.zrange(idxKey, offset, offset + count - 1, "REV");

    const nextOffset = offset + ids.length;
    const items = ids.length ? await this.findByIds<T>(ns, ids) : [];

    return new PagedResult<T>(
      items.filter((i): i is T => i !== null),
      total,
      offset,
      count,
    );
  }

  /**
   * Delete an entity, remove it from the primary index,
   * and clean up any secondary index entries.
   */
  async delete<T extends BaseEntity>(
    ns: string,
    id: string | number,
    options: { indexes?: (keyof T)[] } = {},
  ): Promise<boolean> {
    const indexedFields = options.indexes ?? [];
    let entity: T | null = null;

    // Fetch old values before deletion to clean up secondary indexes
    if (indexedFields.length > 0) {
      entity = await this.findById<T>(ns, id);
    }

    const pipeline = this.redis.pipeline();
    pipeline.del(this.entityKey(ns, id));
    pipeline.zrem(this.indexKey(ns), String(id));

    if (entity) {
      for (const field of indexedFields) {
        const value = (entity as any)[field];
        if (value !== undefined && value !== null) {
          pipeline.zrem(
            this.secondaryIndexKey(ns, String(field), value),
            String(id),
          );
        }
      }
    }

    const results = await pipeline.exec();
    const deleted = (results?.[0]?.[1] as number) ?? 0;
    return deleted > 0;
  }

  /**
   * Delete all entities in a namespace including all their timelines.
   * Uses the primary index — no SCAN needed.
   */
  async deleteAll(ns: string): Promise<number> {
    const ids = await this.redis.zrange(this.indexKey(ns), 0, -1);
    if (!ids.length) return 0;

    const pipeline = this.redis.pipeline();
    ids.forEach((id) => {
      pipeline.del(this.entityKey(ns, id));
      pipeline.del(this.timelineKey(ns, id));
    });
    pipeline.del(this.indexKey(ns));

    await pipeline.exec();
    this.logger.debug(`[${ns}] Deleted ${ids.length} entities`);
    return ids.length;
  }

  /**
   * Increment a numeric field atomically (e.g. retryCount, failureCount).
   */
  async increment(
    ns: string,
    id: string | number,
    field: string,
    by = 1,
  ): Promise<number> {
    return this.redis.hincrby(this.entityKey(ns, id), field, by);
  }

  async exists(ns: string, id: string | number): Promise<boolean> {
    return (await this.redis.exists(this.entityKey(ns, id))) === 1;
  }

  async count(ns: string): Promise<number> {
    return this.redis.zcard(this.indexKey(ns));
  }

  async setTTL(ns: string, id: string | number, ttl: number): Promise<void> {
    await this.redis.expire(this.entityKey(ns, id), ttl);
  }

  async getTTL(ns: string, id: string | number): Promise<number> {
    return this.redis.ttl(this.entityKey(ns, id));
  }

  // =========================================================================
  // List Operations — Timeline / Log Storage (LIFO, bounded)
  // =========================================================================

  /**
   * Push an entry to the head of a bounded timeline list.
   * Keeps only the last `maxSize` entries and refreshes TTL atomically.
   */
  async pushToTimeline<T>(
    ns: string,
    id: string | number,
    entry: T,
    maxSize = 100,
    ttl = 7 * 24 * 60 * 60, // 7 days
  ): Promise<void> {
    const key = this.timelineKey(ns, id);

    const pipeline = this.redis.pipeline();
    pipeline.lpush(key, this.serialize(entry));
    pipeline.ltrim(key, 0, maxSize - 1);
    pipeline.expire(key, ttl);
    await pipeline.exec();
  }

  /**
   * Retrieve a slice of the timeline. Defaults to the full list.
   */
  async getTimeline<T>(
    ns: string,
    id: string | number,
    options: TimelineOptions = {},
  ): Promise<T[]> {
    const { start = 0, end = -1 } = options;
    const items = await this.redis.lrange(this.timelineKey(ns, id), start, end);

    return items.map((item) => {
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    });
  }

  /**
   * Get the number of entries in a timeline.
   */
  async timelineLength(ns: string, id: string | number): Promise<number> {
    return this.redis.llen(this.timelineKey(ns, id));
  }

  /**
   * Delete the entire timeline for an entity.
   */
  async clearTimeline(ns: string, id: string | number): Promise<void> {
    await this.redis.del(this.timelineKey(ns, id));
  }

  // =========================================================================
  // Secondary Index Helpers
  // =========================================================================

  private addToSecondaryIndex(
    pipeline: ReturnType<Redis["pipeline"]>,
    ns: string,
    field: string,
    value: string | number | undefined,
    id: string,
    score: number,
  ): void {
    if (value === undefined || value === null || value === "") return;
    pipeline.zadd(this.secondaryIndexKey(ns, field, String(value)), score, id);
  }

  // =========================================================================
  // Serialization
  // =========================================================================

  /**
   * Flatten a nested object into dot-notation for Redis hash storage.
   * Arrays and Dates are serialized as JSON strings.
   */
  private flatten(
    obj: Record<string, any>,
    prefix = "",
  ): Record<string, string> {
    const out: Record<string, string> = {};

    for (const [k, v] of Object.entries(obj)) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      const key = prefix ? `${prefix}.${k}` : k;

      if (v === null || v === undefined) {
        out[key] = "";
      } else if (v instanceof Date) {
        out[key] = v.toISOString();
      } else if (Array.isArray(v)) {
        out[key] = this.safeJsonStringify(v);
      } else if (typeof v === "object") {
        // If it's a plain object, we try to recurse
        if (v.constructor === Object) {
          Object.assign(out, this.flatten(v, key));
        } else {
          // For complex objects (potential circularity), stringify it
          out[key] = this.safeJsonStringify(v);
        }
      } else {
        out[key] = String(v);
      }
    }

    return out;
  }

  /**
   * Reconstruct a nested object from dot-notation Redis hash data.
   */
  private unflatten<T>(flat: Record<string, string>): T {
    const result: any = {};

    for (const [flatKey, value] of Object.entries(flat)) {
      const keys = flatKey.split(".");
      let node = result;

      for (let i = 0; i < keys.length - 1; i++) {
        node[keys[i]] ??= {};
        node = node[keys[i]];
      }

      const last = keys[keys.length - 1];

      try {
        if (
          (value.startsWith("[") && value.endsWith("]")) ||
          (value.startsWith("{") && value.endsWith("}")) ||
          value.startsWith('"')
        ) {
          node[last] = JSON.parse(value);
        } else if (value === "") {
          node[last] = null;
        } else {
          node[last] = value;
        }
      } catch {
        node[last] = value;
      }
    }

    return result as T;
  }

  private serialize(value: unknown): string {
    return this.safeJsonStringify(value);
  }

  private safeJsonStringify(obj: any): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("circular")) {
        const getCircularReplacer = () => {
          const seen = new WeakSet();
          return (key: any, value: any) => {
            if (typeof value === "object" && value !== null) {
              if (seen.has(value)) {
                return "[Circular]";
              }
              seen.add(value);
            }
            return value;
          };
        };
        return JSON.stringify(obj, getCircularReplacer());
      }
      return `[Serialization Error: ${error.message}]`;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
