import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { prismaAuditExtension } from "./extensions/prisma-audit.extension";

@Injectable()
export class PrismaPostgresService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PrismaPostgresService.name);

  constructor(@Inject("POSTGRES_URL") dbUrl: string) {
    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: ["error", "warn"],
    });

    const extended = this.$extends(prismaAuditExtension);

    return new Proxy(this, {
      get(target, prop, receiver) {
        return Reflect.get(
          prop in extended ? extended : target,
          prop,
          receiver,
        );
      },
    }) as any;
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutdown: ${signal}`);
    await this.$disconnect();
    this.logger.debug("Database disconnected");
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log(`Connected to Database`);
  }
}
