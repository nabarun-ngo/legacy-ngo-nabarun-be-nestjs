import { Injectable,Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { RedisHashCacheService } from "src/modules/shared/database/redis-hash-cache.service";
import { DomainEventPayload } from "src/shared/dto/domain-event-payload.dto";
import { DomainEvent } from "src/shared/models/domain-event";

export const WORKFLOW_DOMAIN_EVENTS_KEY = "workflow:domain_events";

@Injectable()
export class DomainEventCacheHandler {
  private readonly logger = new Logger(DomainEventCacheHandler.name);

  constructor(private readonly redisCache: RedisHashCacheService) {}

  @OnEvent("**", { async: true })
  async handleAllEvents(event: any) {
    if (event && event instanceof DomainEvent) {
      try {
        const payload = {
          aggregateId: event.aggregateId,
          eventName: event.constructor.name,
          occurredAt: event.occurredAt,
          data: {
            ...event.domain.toJson(),
            domainEvents: undefined,
          },
        } as DomainEventPayload;
        await this.redisCache.pushToList(
          WORKFLOW_DOMAIN_EVENTS_KEY,
          "events",
          payload,
          10000,
          86400 * 1,
        ); //1 Day
        this.logger.debug(
          `Cached domain event for auto-close evaluation: ${event.constructor.name} on aggregate: ${event.aggregateId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to cache domain event for workflow evaluation: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
