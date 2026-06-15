import { BaseRepository } from "src/shared/models/repository.base";
import { Notification,NotificationFilter } from "../models/notification.model";

export interface INotificationRepository
  extends BaseRepository<Notification, string, NotificationFilter> {
  deleteOldNotifications(daysOld: number): Promise<number>;
}

export const INotificationRepository = Symbol("INotificationRepository");
