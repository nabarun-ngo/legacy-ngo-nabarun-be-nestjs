import KeyvRedis from "@keyv/redis";
import { CacheModule } from "@nestjs/cache-manager";
import { DynamicModule,Global,Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { CacheService } from "./cache.service";
import { LockingService } from "./locking.service";
import { PrismaPostgresService } from "./prisma-postgres.service";
import { RedisHashCacheService } from "./redis-hash-cache.service";
import { RedisStoreService } from "./redis-store.service";

export interface DatabaseOptions {
  mongoUrl?: string;
  postgresUrl?: string;
  redisUrl?: string;
}

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          useFactory: async () => {
            return {
              stores: [
                new KeyvRedis(options.redisUrl || "redis://localhost:6379"),
              ],
            };
          },
        }),
      ],
      providers: [
        {
          provide: "POSTGRES_URL",
          useValue: options.postgresUrl,
        },
        {
          provide: "MONGO_URL",
          useValue: options.mongoUrl,
        },
        PrismaPostgresService,
        LockingService,
        CacheService,
        {
          provide: "REDIS_CLIENT",
          useFactory: () => {
            return new Redis(options.redisUrl || "redis://localhost:6379");
          },
        },
        {
          provide: RedisHashCacheService,
          useFactory: (redis: Redis) => {
            return new RedisHashCacheService(redis);
          },
          inject: ["REDIS_CLIENT"],
        },
        {
          provide: RedisStoreService,
          useFactory: (redis: Redis) => {
            return new RedisStoreService(redis);
          },
          inject: ["REDIS_CLIENT"],
        },
      ],
      global: true,
      exports: [
        PrismaPostgresService,
        RedisHashCacheService,
        RedisStoreService,
        LockingService,
        CacheService,
      ],
    };
  }
}
