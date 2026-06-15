import { randomUUID } from "crypto";
import { User } from "src/modules/user/domain/model/user.model";
import { AggregateRoot } from "src/shared/models/aggregate-root";

export enum NotificationType {
  INFO = "INFO",
  SUCCESS = "SUCCESS",
  WARNING = "WARNING",
  ERROR = "ERROR",
  TASK = "TASK",
  APPROVAL = "APPROVAL",
  REMINDER = "REMINDER",
  ANNOUNCEMENT = "ANNOUNCEMENT",
}

export enum NotificationCategory {
  SYSTEM = "SYSTEM",
  WORKFLOW = "WORKFLOW",
  DONATION = "DONATION",
  EXPENSE = "EXPENSE",
  PROJECT = "PROJECT",
  MEETING = "MEETING",
  TASK = "TASK",
  DOCUMENT = "DOCUMENT",
}

export enum NotificationPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export interface NotificationAction {
  url?: string;
  type?: string;
  data?: Record<string, any>;
}

export interface NotificationFilter {
  userId?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  isRead?: boolean;
  isArchived?: boolean;
  referenceId?: string;
  referenceType?: string;
  isPushSent?: boolean;
  pushDelivered?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export class Notification extends AggregateRoot<string> {
  #sendToUserIds: string[];
  #user?: Partial<User>;
  #title: string;
  #body: string;
  #type: NotificationType;
  #category: NotificationCategory;
  #priority: NotificationPriority;
  #action?: NotificationAction;
  #referenceId?: string;
  #referenceType?: string;
  #isRead: boolean;
  #readAt?: Date;
  #isArchived: boolean;
  #archivedAt?: Date;
  #isPushSent: boolean;
  #pushSentAt?: Date;
  #pushDelivered: boolean;
  #pushError?: string;
  #imageUrl?: string;
  #icon?: string;
  #metadata?: Record<string, any>;
  #expiresAt?: Date;
  #userNotificationId: string | undefined;

  constructor(
    id: string,
    title: string,
    body: string,
    type: NotificationType,
    category: NotificationCategory,
    priority: NotificationPriority = NotificationPriority.NORMAL,
    action?: NotificationAction,
    referenceId?: string,
    referenceType?: string,
    imageUrl?: string,
    icon?: string,
    metadata?: Record<string, any>,
    expiresAt?: Date,
    options?: {
      userNotificationId?: string;
      user?: Partial<User>;
      isRead?: boolean;
      readAt?: Date;
      isArchived?: boolean;
      archivedAt?: Date;
      isPushSent?: boolean;
      pushSentAt?: Date;
      pushDelivered?: boolean;
      pushError?: string;
    },
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#title = title;
    this.#body = body;
    this.#type = type;
    this.#category = category;
    this.#priority = priority;
    this.#action = action;
    this.#referenceId = referenceId;
    this.#referenceType = referenceType;
    this.#isRead = options?.isRead ?? false;
    this.#readAt = options?.readAt;
    this.#isArchived = options?.isArchived ?? false;
    this.#archivedAt = options?.archivedAt;
    this.#isPushSent = options?.isPushSent ?? false;
    this.#pushSentAt = options?.pushSentAt;
    this.#pushDelivered = options?.pushDelivered ?? false;
    this.#pushError = options?.pushError;
    this.#imageUrl = imageUrl;
    this.#icon = icon;
    this.#metadata = metadata;
    this.#expiresAt = expiresAt;
    this.#user = options?.user;
    this.#userNotificationId = options?.userNotificationId;
  }

  static create(op: {
    title: string;
    body: string;
    type: NotificationType;
    category: NotificationCategory;
    priority?: NotificationPriority;
    action?: NotificationAction;
    referenceId?: string;
    referenceType?: string;
    imageUrl?: string;
    icon?: string;
    metadata?: Record<string, any>;
    expiresAt?: Date;
  }): Notification {
    return new Notification(
      randomUUID(),
      op.title,
      op.body,
      op.type,
      op.category,
      op.priority || NotificationPriority.NORMAL,
      op.action,
      op.referenceId,
      op.referenceType,
      op.imageUrl,
      op.icon,
      op.metadata,
      op.expiresAt,
    );
  }

  // Setter

  set sendToUserIds(userIds: string[]) {
    this.#sendToUserIds = userIds;
  }

  markAsRead(): void {
    if (!this.#isRead) {
      this.#isRead = true;
      this.#readAt = new Date();
    }
  }

  archive(): void {
    if (!this.#isArchived) {
      this.#isArchived = true;
      this.#archivedAt = new Date();
    }
  }

  markPushSent(success: boolean, error?: string): void {
    this.#isPushSent = true;
    this.#pushSentAt = new Date();
    this.#pushDelivered = success;
    this.#pushError = error;
  }

  isExpired(): boolean {
    return this.#expiresAt ? new Date() > this.#expiresAt : false;
  }

  // Getters
  get user() {
    return this.#user;
  }
  get title() {
    return this.#title;
  }
  get body() {
    return this.#body;
  }
  get type() {
    return this.#type;
  }
  get category() {
    return this.#category;
  }
  get priority() {
    return this.#priority;
  }
  get action() {
    return this.#action;
  }
  get referenceId() {
    return this.#referenceId;
  }
  get referenceType() {
    return this.#referenceType;
  }
  get isRead() {
    return this.#isRead;
  }
  get readAt() {
    return this.#readAt;
  }
  get isArchived() {
    return this.#isArchived;
  }
  get archivedAt() {
    return this.#archivedAt;
  }
  get isPushSent() {
    return this.#isPushSent;
  }
  get pushSentAt() {
    return this.#pushSentAt;
  }
  get pushDelivered() {
    return this.#pushDelivered;
  }
  get pushError() {
    return this.#pushError;
  }
  get imageUrl() {
    return this.#imageUrl;
  }
  get icon() {
    return this.#icon;
  }
  get metadata() {
    return this.#metadata;
  }
  get expiresAt() {
    return this.#expiresAt;
  }
  get sendToUserIds() {
    return this.#sendToUserIds;
  }
  get userNotificationId() {
    return this.#userNotificationId;
  }
}
