/**
 * Type-safe utility functions for mapping between persistence and domain models
 */
export class MapperUtils {
  /**
   * Convert null to undefined (Prisma -> Domain)
   * Fully type-safe with generic constraints
   */
  static nullToUndefined<T>(value: T | null): T | undefined {
    return value ?? undefined;
  }

  /**
   * Convert undefined to null (Domain -> Prisma)
   * Fully type-safe with generic constraints
   */
  static undefinedToNull<T>(value: T | undefined): T | null {
    return value ?? null;
  }

  /**
   * Type-safe array mapping with null filtering
   * Filters out null values while maintaining type safety
   */
  static mapArray<TSource, TDest>(
    source: TSource[] | undefined | null,
    mapper: (item: TSource) => TDest | null,
  ): TDest[] {
    if (!source) return [];
    return source.map(mapper).filter((item): item is TDest => item !== null);
  }

  /**
   * Type-safe find operation with null safety
   * Returns null instead of undefined for consistency
   */
  static safeFind<T>(
    array: T[] | undefined | null,
    predicate: (item: T) => boolean,
  ): T | null {
    return array?.find(predicate) ?? null;
  }

  /**
   * Type-safe check if a property exists on an object
   * Uses type guard for compile-time type narrowing
   */
  static hasProperty<T, K extends string>(
    obj: T,
    key: K,
  ): obj is T & Record<K, unknown> {
    return obj !== null && typeof obj === "object" && key in obj;
  }

  /**
   * Safely get a nested property with type safety
   * Returns undefined if any part of the path is missing
   */
  static getNestedProperty<T, K1 extends keyof T>(
    obj: T | null | undefined,
    key1: K1,
  ): T[K1] | undefined;
  static getNestedProperty<T, K1 extends keyof T, K2 extends keyof T[K1]>(
    obj: T | null | undefined,
    key1: K1,
    key2: K2,
  ): T[K1][K2] | undefined;
  static getNestedProperty(obj: any, ...keys: string[]): any {
    return keys.reduce((acc, key) => acc?.[key], obj);
  }

  /**
   * Type-safe default value provider
   */
  static withDefault<T>(value: T | null | undefined, defaultValue: T): T {
    return value ?? defaultValue;
  }

  /**
   * Type-safe empty array provider for optional relations
   */
  static emptyIfUndefined<T>(value: T[] | undefined | null): T[] {
    return value ?? [];
  }

  /**
   * Create Prisma connect object safely
   * Returns undefined if entity or id is missing
   * Handles optional IDs correctly
   */
  static connect<T extends { id?: any }>(
    entity: T | undefined | null,
  ): { connect: { id: NonNullable<T["id"]> } } | undefined {
    return entity?.id !== undefined && entity?.id !== null
      ? { connect: { id: entity.id as NonNullable<T["id"]> } }
      : undefined;
  }
}
