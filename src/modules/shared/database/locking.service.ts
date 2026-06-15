import { Injectable,Logger } from "@nestjs/common";
import { PrismaPostgresService } from "./prisma-postgres.service";

@Injectable()
export class LockingService {
  private readonly logger = new Logger(LockingService.name);

  constructor(private readonly prisma: PrismaPostgresService) {}

  /**
   * Execute a function with a single lock
   * @param key Lock key
   * @param fn Function to execute
   */
  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return this.withLocks([key], fn);
  }

  /**
   * Execute a function with multiple locks (to prevent deadlocks)
   * All locks are acquired in a single transaction and released when it ends.
   * @param keys Lock keys
   * @param fn Function to execute
   */
  async withLocks<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
    if (keys.length === 0) return await fn();

    // Sort keys to prevent deadlocks (canonical ordering)
    const sortedKeys = [...new Set(keys)].sort();

    this.logger.debug(`Acquiring postgres locks for: ${sortedKeys.join(", ")}`);

    return await this.prisma.$transaction(
      async (tx) => {
        for (const key of sortedKeys) {
          // hashtext() converts the string key to a 32-bit integer for pg_advisory_xact_lock
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
        }
        this.logger.debug(
          `Acquired all postgres locks: ${sortedKeys.join(", ")}`,
        );
        try {
          return await fn();
        } catch (error) {
          this.logger.error(
            `Error while holding locks for [${sortedKeys.join(", ")}]`,
            error,
          );
          throw error;
        }
      },
      {
        timeout: 60000, // 60s timeout for the whole operation
      },
    );
  }
}
