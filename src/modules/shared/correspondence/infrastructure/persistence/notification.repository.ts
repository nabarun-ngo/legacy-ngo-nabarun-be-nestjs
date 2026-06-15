import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import {
Notification,
NotificationCategory,
NotificationPriority,
NotificationType
} from "../../domain/models/notification.model";
import { INotificationRepository } from "../../domain/repositories/notification.repository.interface";

@Injectable()
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async create(notification: Notification): Promise<Notification> {
    const created = await this.prisma.notification.create({
      data: {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        category: notification.category,
        priority: notification.priority,
        actionUrl: notification.action?.url,
        actionType: notification.action?.type,
        actionData: notification.action?.data,
        referenceId: notification.referenceId,
        referenceType: notification.referenceType,
        imageUrl: notification.imageUrl,
        icon: notification.icon,
        metadata: notification.metadata,
        expiresAt: notification.expiresAt,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        userNotifications: {
          create: notification.sendToUserIds.map((un) => {
            return {
              user: { connect: { id: un } },
              createdAt: notification.createdAt,
              updatedAt: notification.updatedAt,
              isRead: false,
              isArchived: false,
              isPushSent: false,
              pushDelivered: false,
            } as Prisma.UserNotificationCreateInput;
          }),
        },
      },
    });
    return this.toDomain(created);
  }

  async update(id: string, notification: Notification): Promise<Notification> {
    const updated = await this.prisma.notification.update({
      where: { id: id },
      data: this.toUpdateData(notification),
    });

    return this.toDomain(updated);
  }

  async count(filter: any): Promise<number> {
    return await this.prisma.notification.count();
  }

  async findById(id: string): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    return notification ? this.toDomain(notification) : null;
  }

  async findAll(filters?: any): Promise<Notification[]> {
    const notifications = await this.prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        createdAt: {
          lt: filters?.toDate,
          gte: filters?.fromDate,
        },
      },
    });

    return notifications.map((n) => this.toDomain(n));
  }

  async findPaged(
    filter?: BaseFilter<any>,
  ): Promise<PagedResult<Notification>> {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.notification.count({}),
    ]);

    return {
      content: notifications.map((n) => this.toDomain(n)),
      totalSize: total,
      pageIndex: filter?.pageIndex ?? 0,
      pageSize: filter?.pageSize ?? 1000,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }
  async deleteOldNotifications(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  private toUpdateData(
    notification: Notification,
  ): Prisma.NotificationUpdateInput {
    return {
      title: notification.title,
      body: notification.body,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      actionUrl: notification.action?.url,
      actionType: notification.action?.type,
      actionData: notification.action?.data,
      referenceId: notification.referenceId,
      referenceType: notification.referenceType,
      imageUrl: notification.imageUrl,
      icon: notification.icon,
      metadata: notification.metadata,
      expiresAt: notification.expiresAt,
      updatedAt: notification.updatedAt,
    };
  }

  private toDomain(data: Prisma.NotificationGetPayload<{}>): Notification {
    return new Notification(
      data.id,
      data.title,
      data.body,
      data.type as NotificationType,
      data.category as NotificationCategory,
      data.priority as NotificationPriority,
      {
        url: MapperUtils.nullToUndefined(data.actionUrl),
        type: MapperUtils.nullToUndefined(data.actionType),
        data: data.actionData as Record<string, any>,
      },
      MapperUtils.nullToUndefined(data.referenceId),
      MapperUtils.nullToUndefined(data.referenceType),
      MapperUtils.nullToUndefined(data.imageUrl),
      MapperUtils.nullToUndefined(data.icon),
      data.metadata as Record<string, any>,
      MapperUtils.nullToUndefined(data.expiresAt),
      undefined,
      data.createdAt,
      data.updatedAt,
    );
  }
}
