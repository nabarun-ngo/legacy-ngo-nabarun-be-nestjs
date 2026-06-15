import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import {
Notification,
NotificationCategory,
NotificationFilter,
NotificationPriority,
NotificationType,
} from "../../domain/models/notification.model";
import { IUserNotificationRepository } from "../../domain/repositories/user-notification.repository.interface";

@Injectable()
export class UserNotificationRepository implements IUserNotificationRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}
  async findByUserIdAndNotificationId(
    userId: string,
    notificationId: string,
  ): Promise<Notification | null> {
    const notification = await this.prisma.userNotification.findFirst({
      where: { notificationId: notificationId, userId: userId },
      include: {
        user: true,
        notification: true,
      },
    });
    return notification ? this.toUserNotificationDomain(notification) : null;
  }

  async create(notification: Notification): Promise<Notification> {
    throw new Error("User INotificationRepository to create notification.");
  }

  async update(id: string, notification: Notification): Promise<Notification> {
    const updated = await this.prisma.userNotification.update({
      where: { id: id },
      data: this.toUpdateData(notification),
      include: {
        user: true,
        notification: true,
      },
    });

    return this.toUserNotificationDomain(updated);
  }

  async bulkUpdate(ids: string[], notification: Notification): Promise<void> {
    await this.prisma.userNotification.updateMany({
      where: { id: { in: ids } },
      data: this.toUpdateData(notification),
    });
  }

  async count(filter?: NotificationFilter): Promise<number> {
    return await this.prisma.userNotification.count({
      where: this.whereQuery(filter),
    });
  }

  async findById(id: string): Promise<Notification | null> {
    const notification = await this.prisma.userNotification.findUnique({
      where: { id },
      include: {
        user: true,
        notification: true,
      },
    });
    return notification ? this.toUserNotificationDomain(notification) : null;
  }

  async findAll(filters?: NotificationFilter): Promise<Notification[]> {
    const notifications = await this.prisma.userNotification.findMany({
      where: this.whereQuery(filters),
      include: {
        user: true,
        notification: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return notifications.map((n) => this.toUserNotificationDomain(n));
  }

  async findPaged(
    filter?: BaseFilter<NotificationFilter>,
  ): Promise<PagedResult<Notification>> {
    const [notifications, total] = await Promise.all([
      this.prisma.userNotification.findMany({
        where: this.whereQuery(filter?.props),
        include: {
          user: true,
          notification: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.userNotification.count({
        where: this.whereQuery(filter?.props),
      }),
    ]);
    return {
      content: notifications.map((n) => this.toUserNotificationDomain(n)),
      totalSize: total,
      pageIndex: filter?.pageIndex ?? 0,
      pageSize: filter?.pageSize ?? 1000,
    };
  }

  private whereQuery(
    filters?: NotificationFilter,
  ): Prisma.UserNotificationWhereInput {
    return {
      ...(filters?.userId ? { userId: filters.userId } : {}),
      ...(filters?.type ? { notification: { type: filters.type } } : {}),
      ...(filters?.category
        ? { notification: { category: filters.category } }
        : {}),
      ...(filters?.isRead !== undefined ? { isRead: filters.isRead } : {}),
      ...(filters?.isArchived !== undefined
        ? { isArchived: filters.isArchived }
        : {}),
      ...(filters?.referenceId
        ? { notification: { referenceId: filters.referenceId } }
        : {}),
      ...(filters?.referenceType
        ? { notification: { referenceType: filters.referenceType } }
        : {}),
      ...(filters?.isPushSent !== undefined
        ? { isPushSent: filters.isPushSent }
        : {}),
      ...(filters?.pushDelivered !== undefined
        ? { pushDelivered: filters.pushDelivered }
        : {}),
      ...(filters?.fromDate ? { createdAt: { gte: filters.fromDate } } : {}),
      ...(filters?.toDate ? { createdAt: { lte: filters.toDate } } : {}),
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }

  private toUpdateData(
    notification: Notification,
  ): Prisma.UserNotificationUpdateInput {
    return {
      isRead: notification.isRead,
      readAt: notification.readAt,
      isArchived: notification.isArchived,
      archivedAt: notification.archivedAt,
      isPushSent: notification.isPushSent,
      pushSentAt: notification.pushSentAt,
      pushDelivered: notification.pushDelivered,
      pushError: notification.pushError,
      updatedAt: notification.updatedAt,
    };
  }

  private toUserNotificationDomain(
    data: Prisma.UserNotificationGetPayload<{
      include: {
        user: true;
        notification: true;
      };
    }>,
  ): Notification {
    return new Notification(
      data.notification.id,
      data.notification.title,
      data.notification.body,
      data.notification.type as NotificationType,
      data.notification.category as NotificationCategory,
      data.notification.priority as NotificationPriority,
      {
        url: MapperUtils.nullToUndefined(data.notification.actionUrl),
        type: MapperUtils.nullToUndefined(data.notification.actionType),
        data: data.notification.actionData as Record<string, any>,
      },
      MapperUtils.nullToUndefined(data.notification.referenceId),
      MapperUtils.nullToUndefined(data.notification.referenceType),
      MapperUtils.nullToUndefined(data.notification.imageUrl),
      MapperUtils.nullToUndefined(data.notification.icon),
      data.notification.metadata as Record<string, any>,
      MapperUtils.nullToUndefined(data.notification.expiresAt),
      {
        userNotificationId: data.id,
        isRead: data.isRead,
        readAt: MapperUtils.nullToUndefined(data.readAt),
        isArchived: data.isArchived,
        archivedAt: MapperUtils.nullToUndefined(data.archivedAt),
        isPushSent: data.isPushSent,
        pushSentAt: MapperUtils.nullToUndefined(data.pushSentAt),
        pushDelivered: data.pushDelivered,
        pushError: MapperUtils.nullToUndefined(data.pushError),
        user: data.user
          ? {
              id: data.user.id,
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              email: data.user.email,
            }
          : undefined,
      },
      data.createdAt,
      data.updatedAt,
    );
  }
}
