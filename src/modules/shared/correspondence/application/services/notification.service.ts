import { Inject,Injectable,Logger,NotFoundException } from "@nestjs/common";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { IPushNotificationProvider } from "../../domain/interfaces/push-notification-provider.interface";
import { FcmToken } from "../../domain/models/fcm-token.model";
import { IFcmTokenRepository } from "../../domain/repositories/fcm-token.repository.interface";
import { IUserNotificationRepository } from "../../domain/repositories/user-notification.repository.interface";
import { NotificationDtoMapper } from "../../presentation/dtos/notification-dto.mapper";
import {
BulkNotificationDto,
FcmTokenFilterDto,
NotificationFiltersDto,
NotificationResponseDto,
RegisterFcmTokenDto,
UserFcmTokensDto,
} from "../../presentation/dtos/notification.dto";
import { CreateNotificationUseCase } from "../use-cases/create-notification.use-case";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(IUserNotificationRepository)
    private readonly userNotificationRepository: IUserNotificationRepository,
    @Inject(IFcmTokenRepository)
    private readonly fcmTokenRepository: IFcmTokenRepository,
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    @Inject(IPushNotificationProvider)
    private readonly pushNotificationProvider: IPushNotificationProvider,
  ) {}

  /**
   * Create bulk notifications
   */
  async createBulkNotifications(
    dto: BulkNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = await this.createNotificationUseCase.execute({
      userIds: dto.userIds,
      title: dto.title,
      body: dto.body,
      type: dto.type,
      category: dto.category,
      priority: dto.priority,
      actionUrl: dto.actionUrl,
      sendPush: dto.sendPush,
    });
    return NotificationDtoMapper.toResponseDto(notification);
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(
    userId: string,
    filter?: BaseFilter<NotificationFiltersDto>,
  ): Promise<PagedResult<NotificationResponseDto>> {
    const { isRead, isArchived, isPushSent, pushDelivered, ...otherProps } =
      filter?.props || {};
    const pagedResult = await this.userNotificationRepository.findPaged({
      pageIndex: filter?.pageIndex,
      pageSize: filter?.pageSize,
      props: {
        ...otherProps,
        userId,
        isRead: isRead ? isRead === "Y" : undefined,
        isArchived: isArchived ? isArchived === "Y" : undefined,
        isPushSent: isPushSent ? isPushSent === "Y" : undefined,
        pushDelivered: pushDelivered ? pushDelivered === "Y" : undefined,
      },
    });
    return new PagedResult<NotificationResponseDto>(
      pagedResult.content.map((n) => NotificationDtoMapper.toResponseDto(n)),
      pagedResult.totalSize,
      pagedResult.pageIndex,
      pagedResult.pageSize,
    );
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.userNotificationRepository.count({
      userId,
      isRead: false,
      isArchived: false,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification =
      await this.userNotificationRepository.findByUserIdAndNotificationId(
        userId,
        notificationId,
      );
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }
    notification.markAsRead();
    await this.userNotificationRepository.update(
      notification.userNotificationId!,
      notification,
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.userNotificationRepository.findAll({
      userId,
      isRead: false,
      isArchived: false,
    });

    for (const notification of notifications) {
      notification.markAsRead();
    }
    if (notifications.length > 0) {
      await this.userNotificationRepository.bulkUpdate(
        notifications.map((n) => n.userNotificationId!),
        notifications[0],
      );
    }
  }

  /**
   * Archive a notification
   */
  async archiveNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    const notification =
      await this.userNotificationRepository.findByUserIdAndNotificationId(
        userId,
        notificationId,
      );
    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    notification.archive();
    await this.userNotificationRepository.update(
      notification.userNotificationId!,
      notification,
    );
  }

  /**
   * Register FCM token for a user
   */
  async registerFcmToken(
    userId: string,
    dto: RegisterFcmTokenDto,
  ): Promise<FcmToken> {
    // Check if token already exists
    const existingToken = await this.fcmTokenRepository.findByToken(dto.token);

    if (existingToken) {
      // Update existing token
      existingToken.activate();
      existingToken.updateLastUsed();
      return await this.fcmTokenRepository.update(
        existingToken.id,
        existingToken,
      );
    }

    // Create new token
    const fcmToken = FcmToken.create({
      userId,
      token: dto.token,
      deviceType: dto.deviceType,
      deviceName: dto.deviceName,
      browser: dto.browser,
      os: dto.os,
    });

    return await this.fcmTokenRepository.create(fcmToken);
  }

  /**
   * Delete FCM token
   */
  async deleteFcmToken(tokenId: string): Promise<void> {
    const fcmToken = await this.fcmTokenRepository.findById(tokenId);
    if (!fcmToken) {
      throw new NotFoundException(`FCM token with ID ${tokenId} not found`);
    }
    await this.fcmTokenRepository.delete(fcmToken.id);
  }

  /**
   * Get all FCM token metadata (paged and grouped by user)
   */
  async getFcmTokensMetadata(
    filter: BaseFilter<FcmTokenFilterDto>,
  ): Promise<PagedResult<UserFcmTokensDto>> {
    const pagedTokens = await this.fcmTokenRepository.findPaged(filter);
    const groupedMap = new Map<string, UserFcmTokensDto>();

    for (const token of pagedTokens.content) {
      const userId = token.userId;
      if (!groupedMap.has(userId)) {
        groupedMap.set(userId, {
          userId,
          user: {
            firstName: token.user?.firstName || "",
            lastName: token.user?.lastName || "",
            email: token.user?.email || "",
          },
          tokens: [],
        });
      }
      groupedMap
        .get(userId)!
        .tokens.push(NotificationDtoMapper.toFcmTokenMetadataDto(token));
    }

    return new PagedResult<UserFcmTokensDto>(
      Array.from(groupedMap.values()),
      pagedTokens.totalSize,
      pagedTokens.pageIndex,
      pagedTokens.pageSize,
    );
  }

  /**
   * Get push notifications (admin view)
   */
  async getNotifications(
    filter: BaseFilter<NotificationFiltersDto>,
  ): Promise<PagedResult<NotificationResponseDto>> {
    const { isRead, isArchived, isPushSent, pushDelivered, ...otherProps } =
      filter?.props || {};
    const pagedResult = await this.userNotificationRepository.findPaged({
      pageIndex: filter?.pageIndex,
      pageSize: filter?.pageSize,
      props: {
        ...otherProps,
        isRead: isRead ? isRead === "Y" : undefined,
        isArchived: isArchived ? isArchived === "Y" : undefined,
        isPushSent: isPushSent ? isPushSent === "Y" : undefined,
        pushDelivered: pushDelivered ? pushDelivered === "Y" : undefined,
      },
    });

    return new PagedResult<NotificationResponseDto>(
      pagedResult.content.map((n) => NotificationDtoMapper.toResponseDto(n)),
      pagedResult.totalSize,
      pagedResult.pageIndex,
      pagedResult.pageSize,
    );
  }

  /**
   * Resend push notification
   */
  async resendPushNotification(userNotificationId: string): Promise<void> {
    const userNotification =
      await this.userNotificationRepository.findById(userNotificationId);
    if (!userNotification) {
      throw new NotFoundException(
        `User notification with ID ${userNotificationId} not found`,
      );
    }

    const userId = userNotification.user?.id;
    if (!userId) {
      throw new Error(
        `User ID not found for notification ${userNotificationId}`,
      );
    }

    const result = await this.pushNotificationProvider.sendToUsers([userId], {
      title: userNotification.title,
      body: userNotification.body,
      ...(userNotification.imageUrl && { imageUrl: userNotification.imageUrl }),
      icon: userNotification.icon,
      data: {
        notificationId: userNotification.id,
        type: userNotification.type,
        category: userNotification.category,
        ...(userNotification.action?.url && {
          actionUrl: userNotification.action.url,
        }),
        ...(userNotification.referenceId && {
          referenceId: userNotification.referenceId,
        }),
        ...(userNotification.referenceType && {
          referenceType: userNotification.referenceType,
        }),
      },
    });

    // Update notification with push status
    userNotification.markPushSent(
      result.successCount > 0,
      result.failureCount > 0
        ? `${result.failureCount} failures. ${JSON.stringify(result.errors)}`
        : undefined,
    );
    await this.userNotificationRepository.update(
      userNotificationId,
      userNotification,
    );

    if (result.successCount === 0 && result.failureCount > 0) {
      throw new Error(
        `Push notification failed: ${JSON.stringify(result.errors)}`,
      );
    }

    this.logger.log(
      `Push notification resent for notification ${userNotification.id}: ` +
        `${result.successCount} success, ${result.failureCount} failures`,
    );
  }
}
