
/**
 * Common mapping functions for cross-cutting concerns
 * All methods are fully type-safe with explicit type constraints
 */
export class CommonMappers {
  /**
   * Map audit fields from Prisma model to domain model
   * Type-safe with generic constraints for Prisma models
   */
  static mapAuditFieldsFromPrisma<
    T extends {
      createdAt: Date;
      updatedAt: Date;
      version?: number | null;
      deletedAt?: Date | null;
    },
  >(
    source: T,
  ): {
    createdAt: Date;
    updatedAt: Date;
    version: number;
    deletedAt?: Date;
  } {
    return {
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      version: source.version ?? Number(0),
      deletedAt: source.deletedAt ?? undefined,
    };
  }

  /**
   * Map audit fields from domain model to Prisma persistence
   * Type-safe with AggregateRoot constraint
   */
  static mapAuditFieldsToPrisma<
    T extends {
      createdAt: Date;
      updatedAt: Date;
      version: number;
      deletedAt?: Date;
    },
  >(
    source: T,
  ): {
    createdAt: Date;
    updatedAt: Date;
    version: number;
    deletedAt: Date | null;
  } {
    return {
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      version: source.version,
      deletedAt: source.deletedAt ?? null,
    };
  }

  /**
   * Map a simple reference object (id, name, etc.)
   * Type-safe for basic reference data
   */
  static mapReference<
    T extends {
      id: string;
      [key: string]: any;
    },
  >(source: T | null | undefined, fields: (keyof T)[]): Partial<T> | undefined {
    if (!source) return undefined;

    const result: Partial<T> = {};
    fields.forEach((field) => {
      result[field] = source[field];
    });
    return result;
  }

  /**
   * Map a collection with proper null handling
   * Fully type-safe with generics
   */
  static mapCollection<TSource, TDest>(
    source: TSource[] | undefined | null,
    mapper: (item: TSource, index: number) => TDest,
  ): TDest[] {
    if (!source) return [];
    return source.map(mapper);
  }

  /**
   * Map an optional single relation
   * Type-safe optional mapping
   */
  static mapOptional<TSource, TDest>(
    source: TSource | null | undefined,
    mapper: (item: TSource) => TDest,
  ): TDest | undefined {
    return source ? mapper(source) : undefined;
  }

  /**
   * Safe enum conversion from string
   * Type-safe with enum constraint
   */
  static toEnum<T extends Record<string, string>>(
    value: string | null | undefined,
    enumType: T,
    defaultValue: T[keyof T],
  ): T[keyof T] {
    if (!value) return defaultValue;
    return Object.values(enumType).includes(value as T[keyof T])
      ? (value as T[keyof T])
      : defaultValue;
  }

  /**
   * Split comma-separated string to array
   * Type-safe string to array conversion
   */
  static splitToArray(
    value: string | null | undefined,
    defaultValue: string[] = [],
  ): string[] {
    if (!value) return defaultValue;
    return value.split(",").filter((v) => v.trim().length > 0);
  }

  /**
   * Join array to comma-separated string
   * Type-safe array to string conversion
   */
  static joinToString(
    value: string[] | undefined | null,
    defaultValue: string | null = null,
  ): string | null {
    if (!value || value.length === 0) return defaultValue;
    return value.join(",");
  }
}
