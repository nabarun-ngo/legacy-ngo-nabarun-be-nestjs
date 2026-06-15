import { Inject, Injectable, Logger } from "@nestjs/common";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import { IPushNotificationProvider } from "../../domain/interfaces/push-notification-provider.interface";
import {
  Notification,
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from "../../domain/models/notification.model";
import { INotificationRepository } from "../../domain/repositories/notification.repository.interface";
import { IUserNotificationRepository } from "../../domain/repositories/user-notification.repository.interface";

export class CreateNotification {
  userIds: string[];
  title: string;
  body: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionType?: string;
  actionData?: Record<string, any>;
  referenceId?: string;
  referenceType?: string;
  imageUrl?: string;
  icon?: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
  sendPush?: boolean;
}

@Injectable()
export class CreateNotificationUseCase
  implements IUseCase<CreateNotification, Notification>
{
  private readonly logger = new Logger(CreateNotificationUseCase.name);

  constructor(
    @Inject(INotificationRepository)
    private readonly notificationRepository: INotificationRepository,
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepository: IUserNotificationRepository,
    @Inject(IPushNotificationProvider)
    private readonly pushNotificationProvider: IPushNotificationProvider,
  ) {}

  async execute(dto: CreateNotification): Promise<Notification> {
    const notification = Notification.create({
      title: dto.title,
      body: dto.body,
      type: dto.type,
      category: dto.category,
      priority: dto.priority,
      action: {
        url: dto.actionUrl,
        type: dto.actionType,
        data: dto.actionData,
      },
      referenceId: dto.referenceId,
      referenceType: dto.referenceType,
      imageUrl: dto.imageUrl,
      icon: dto.icon,
      metadata: dto.metadata,
      expiresAt: dto.expiresAt,
    });
    notification.sendToUserIds = dto.userIds;

    await this.notificationRepository.create(notification);

    if (dto.sendPush !== false && dto.userIds.length > 0) {
      await this.sendBatchPush(dto.userIds, notification);
    }

    return notification;
  }

  /**
   * Sends push to ALL users in a single batched provider call,
   * then bulk-updates their delivery status.
   * Replaces the old per-user sequential loop.
   */
  private async sendBatchPush(
    userIds: string[],
    notification: Notification,
  ): Promise<void> {
    const result = await this.pushNotificationProvider.sendToUsers(userIds, {
      title: notification.title,
      body: notification.body,
      ...(notification.imageUrl && { imageUrl: notification.imageUrl }),
      icon: notification.icon,
      data: {
        notificationId: notification.id,
        type: notification.type,
        category: notification.category,
        ...(notification.action?.url && { actionUrl: notification.action.url }),
        ...(notification.referenceId && { referenceId: notification.referenceId }),
        ...(notification.referenceType && { referenceType: notification.referenceType }),
      },
    });

    // Bulk-update push delivery status for all user-notification rows
    const userNotifications = await Promise.all(
      userIds.map((uid) =>
        this.userNotificationRepository.findByUserIdAndNotificationId(
          uid,
          notification.id,
        ),
      ),
    );

    const success = result.successCount > 0;
    const errorMsg = result.failureCount > 0
      ? `${result.failureCount} failures. ${JSON.stringify(result.errors)}`
      : undefined;

    await Promise.allSettled(
      userNotifications
        .filter((un) => un !== null && un !== undefined)
        .map((un) => {
          un!.markPushSent(success, errorMsg);
          return this.userNotificationRepository.update(
            un!.userNotificationId!,
            un!,
          );
        }),
    );

    this.logger.log(
      `Push sent for notification ${notification.id}: ` +
        `${result.successCount} success, ${result.failureCount} failures`,
    );
  }
}
