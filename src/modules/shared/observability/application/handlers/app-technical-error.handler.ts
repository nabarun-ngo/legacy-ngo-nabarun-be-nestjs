import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "src/modules/shared/correspondence/application/services/notification.service";
import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from "src/modules/shared/correspondence/domain/models/notification.model";
import { Role } from "src/modules/user/domain/model/role.model";
import {
  type IUserRepository,
  USER_REPOSITORY,
} from "src/modules/user/domain/repositories/user.repository.interface";
import { ApplyTryCatch } from "src/shared/decorators/apply-try-catch.decorator";
import { ErrorResponse } from "src/shared/models/response-model";
import { SlackAlertService } from "../../infrastructure/external/slack-alert.service";
import { AppTechnicalError } from "../events/app-technical-error.event";
import { getTraceId } from "nestjs-shared/core";

@Injectable()
export class AppTechnicalErrorHandler {
  private readonly logger = new Logger(AppTechnicalErrorHandler.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly slackAlertService: SlackAlertService,
    private readonly notificationService: NotificationService,
  ) { }

  @OnEvent(AppTechnicalError.name, { async: true })
  @ApplyTryCatch()
  async handleAppTechnicalError(event: AppTechnicalError) {
    const isErrorResponse =
      event.error instanceof ErrorResponse ||
      (event.error &&
        typeof event.error === "object" &&
        "messages" in event.error);
    const errorResp = event.error as any;
    const traceId = isErrorResponse ? errorResp.traceId : getTraceId();
    const reference = traceId || "not-available";
    const stackTrace = isErrorResponse
      ? errorResp.stackTrace
      : (event.error as any)?.stack;
    const errorMessage = isErrorResponse
      ? `HTTP ${errorResp.status} Error: ${(errorResp.messages || []).join(", ")}`
      : `Error: ${(event.error as any).message || "Unknown Error"}`;
    const slackMessage = `Reference: ${reference}\n${errorMessage}${stackTrace ? `\nStack: ${stackTrace}` : ""}`;
    const inAppMessage = `Some part of the Application is not working properly. Error reference: ${reference}. Please check Slack for details.`;

    await this.slackAlertService.sendTechnicalAlert(slackMessage, "error");

    const users = await this.userRepository.findAll({
      roleCodes: [Role.TECHNICAL_SPECIALIST],
    });

    if (users.length > 0) {
      try {
        await this.notificationService.createBulkNotifications({
          userIds: users.map((m) => m.id),
          title: "Technical error",
          body: inAppMessage,
          type: NotificationType.ERROR,
          category: NotificationCategory.SYSTEM,
          priority: NotificationPriority.URGENT,
          sendPush: true,
        });
        this.logger.log(
          `Sent technical error notification to ${users.length} specialists.`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send technical error notification for reference ${reference}: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
