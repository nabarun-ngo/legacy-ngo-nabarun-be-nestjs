import { getActiveCacheService } from "../cache.service";

export interface CacheableOptions {
  key?: string | ((...args: any[]) => string);
  ttl?: number;
  cacheNull?: boolean;
}

function defaultCacheKey(
  target: object,
  propertyKey: string | symbol,
  args: any[],
): string {
  const className = target.constructor?.name ?? "UnknownClass";
  return `method:${className}:${String(propertyKey)}:${safeStringify(args)}`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[non-serializable]";
  }
}

export function Cacheable(options: CacheableOptions = {}): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const original = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = getActiveCacheService();
      if (!cacheService) {
        return original.apply(this, args);
      }

      const key =
        typeof options.key === "function"
          ? options.key(...args)
          : (options.key ?? defaultCacheKey(target, propertyKey, args));

      return cacheService.getOrSet(
        key,
        () => original.apply(this, args),
        options.ttl,
        { cacheNull: options.cacheNull },
      );
    };

    return descriptor;
  };
}

export const Cacheble = Cacheable;
