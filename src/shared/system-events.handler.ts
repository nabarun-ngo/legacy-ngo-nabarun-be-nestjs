import { Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { AppTechnicalError } from "src/shared/exceptions/app-tech-error";
import { Role } from "../modules/user/domain/model/role.model";
import { type IUserRepository, USER_REPOSITORY } from "../modules/user/domain/repositories/user.repository.interface";
import { DomainEvent } from "./models/domain-event";
import { RedisHashCacheService } from "src/modules/shared/database/redis-hash-cache.service";
import { DomainEventPayload } from "./dto/domain-event-payload.dto";
import { ErrorResponse } from "./models/response-model";
import { getTraceId } from "./utilities/trace-context.util";
import { SendNotificationRequestEvent } from "src/modules/shared/correspondence/application/events/send-notification-request.event";
import { NotificationKeys } from "./notification-keys";
import { NotificationCategory, NotificationPriority, NotificationType } from "src/modules/shared/correspondence/domain/models/notification.model";
import { ApplyTryCatch } from "./decorators/apply-try-catch.decorator";
import { SlackNotificationRequestEvent } from "src/modules/shared/correspondence/application/events/slack-notification-request.event";

export const APP_DOMAIN_EVENTS_KEY = 'app:domain_events';

@Injectable()
export class SystemEventsHandler {
    private readonly logger = new Logger(SystemEventsHandler.name);

    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: IUserRepository,
        private readonly redisCache: RedisHashCacheService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    @OnEvent(AppTechnicalError.name, { async: true })
    @ApplyTryCatch()
    async handleAppTechnicalError(event: AppTechnicalError) {
        const isErrorResponse = event.error instanceof ErrorResponse || (event.error && typeof event.error === 'object' && 'messages' in event.error);
        const errorResp = event.error as any;
        const traceId = isErrorResponse ? errorResp.traceId : getTraceId();
        const message = isErrorResponse ? `HTTP ${errorResp.status} TraceId: ${traceId} Error: ${(errorResp.messages || []).join(', ')} \n Stack : ${errorResp.stackTrace}` : `TraceId: ${traceId} Error: ${(event.error as any).message || 'Unknown Error'}`;
        this.eventEmitter.emit(SlackNotificationRequestEvent.name, {
            message: message,
            type: 'error',
        });
        const users = await this.userRepository.findAll({
            roleCodes: [Role.TECHNICAL_SPECIALIST]
        });

        if (users.length > 0 && !event.isNotificationFailure) {
            this.eventEmitter.emit(SendNotificationRequestEvent.name,
                new SendNotificationRequestEvent({
                    targetUserIds: users.map(m => m.id),
                    notificationKey: NotificationKeys.APP_TECHNICAL_ERROR,
                    type: NotificationType.ERROR,
                    category: NotificationCategory.SYSTEM,
                    priority: NotificationPriority.URGENT,
                    data: {
                        traceId: traceId,
                        error: message,
                    },
                }));
            this.logger.log(`Sent technical error notification to ${users.length} specialists.`);
        }
    }

    @OnEvent('**', { async: true })
    async handleAllEvents(event: any) {
        if (event && event instanceof DomainEvent) {
            try {
                const payload = {
                    aggregateId: event.aggregateId,
                    eventName: event.constructor.name,
                    occurredAt: event.occurredAt,
                    data: {
                        ...event.domain.toJson(),
                        domainEvents: undefined
                    },
                } as DomainEventPayload;
                await this.redisCache.pushToList(APP_DOMAIN_EVENTS_KEY, 'events', payload, 10000, 86400 * 1);//1 Day
                this.logger.debug(`Cached domain event for auto-close evaluation: ${event.constructor.name} on aggregate: ${event.aggregateId}`);
            } catch (error) {
                this.logger.error(`Failed to cache domain event for workflow evaluation: ${error.message}`, error.stack);
            }
        }
    }


    //#region Unused Code
    // await this.corrService.sendEmail({
    //     subject: '[NABARUN] App Technical Error',
    //     html: `
    //     <div>
    //     <h1>App Technical Error</h1>
    //     <p>${JSON.stringify(event.error, null, 2)}</p>
    //     <p>Please review slack <a href="https://app.slack.com/client">#prod_errors</a> channel for more details.</p>
    //     </div>
    //     `,
    //     to: users.map(m => m.email).join(',')
    // });
    //#endregion
}
