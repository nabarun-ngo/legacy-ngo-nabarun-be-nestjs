import { Injectable, Logger } from "@nestjs/common";
import {
  CreateNotification,
  CreateNotificationUseCase,
} from "../../application/use-cases/create-notification.use-case";
import { PushInAppChannelConfig } from "../../domain/config/correspondence-config.types";
import { MetadataService } from "../external/metadata.service";

/**
 * Thin channel adapter for push + in-app notification delivery.
 *
 * Responsibilities:
 *  1. Resolves notification title/body/action from Firebase Remote Config
 *     via MetadataService.
 *  2. Calls CreateNotificationUseCase.execute() which:
 *     - Persists in-app notification rows (notifications + user_notifications tables)
 *     - Sends push to ALL userIds in one batched call (not a per-user loop)
 */
@Injectable()
export class PushInAppChannel {
  private readonly logger = new Logger(PushInAppChannel.name);

  constructor(
    private readonly createNotificationUseCase: CreateNotificationUseCase,
    private readonly metadataService: MetadataService,
  ) {}

  async send(
    config: PushInAppChannelConfig,
    userIds: string[],
    data: Record<string, any>,
    options?: {
      referenceId?: string;
      referenceType?: string;
    },
  ): Promise<void> {
    if (userIds.length === 0) {
      this.logger.warn(
        `PushInAppChannel: no target users for key "${config.notificationKey}", skipping`,
      );
      return;
    }

    const metadata = await this.metadataService.getNotification(
      config.notificationKey,
      data,
    );

    const payload: CreateNotification = {
      userIds,
      title: metadata.title,
      body: metadata.description,
      type: config.type,
      category: config.category,
      priority: config.priority,
      actionUrl: metadata.actionUrl,
      imageUrl: metadata.imageUrl,
      referenceId: options?.referenceId,
      referenceType: options?.referenceType,
      sendPush: config.sendPush !== false,
    };

    await this.createNotificationUseCase.execute(payload);

    this.logger.log(
      `PushInAppChannel: sent "${config.notificationKey}" to ${userIds.length} user(s)`,
    );
  }
}
