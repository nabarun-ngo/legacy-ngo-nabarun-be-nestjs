import { Inject,Injectable,Logger } from "@nestjs/common";
import * as admin from "firebase-admin";
import {
IPushNotificationProvider,
PushNotificationPayload,
PushNotificationResponse,
} from "../../domain/interfaces/push-notification-provider.interface";
import { IFcmTokenRepository } from "../../domain/repositories/fcm-token.repository.interface";

@Injectable()
export class FirebasePushProvider implements IPushNotificationProvider {
  private readonly logger = new Logger(FirebasePushProvider.name);

  constructor(
    @Inject(IFcmTokenRepository)
    private readonly fcmTokenRepository: IFcmTokenRepository,
  ) {}

  private async sendToDevices(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<PushNotificationResponse> {
    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data,
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || "/assets/icons/icon-192x192.png",
            badge: "/assets/icons/icon-72x72.png",
            ...(payload.imageUrl && { image: payload.imageUrl }),
            requireInteraction: true,
            data: payload.data,
          },
          fcmOptions: {
            link: payload.data?.actionUrl || "/",
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      this.logger.log(
        `Bulk push notification sent via Firebase: ${response.successCount} success, ${response.failureCount} failures`,
      );

      const errors = response.responses
        .map((r, idx) =>
          r.success ? null : { token: tokens[idx], error: r.error },
        )
        .filter((e): e is { token: string; error: any } => e !== null);

      // Handle invalid tokens (unregistered or invalid)
      if (response.failureCount > 0) {
        for (const errObj of errors) {
          const errorCode = errObj.error?.code;
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token"
          ) {
            this.logger.warn(`Deactivating invalid token: ${errObj.token}`);
            await this.fcmTokenRepository.deactivateToken(errObj.token);
          }
        }
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send bulk push notifications via Firebase: ${error.message}`,
        error.stack,
      );
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: tokens.map((token) => ({ token, error: error.message })),
      };
    }
  }

  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    name?: string,
  ): Promise<PushNotificationResponse> {
    const tokens: string[] = [];
    for (const userId of userIds) {
      const userTokens =
        await this.fcmTokenRepository.findActiveByUserId(userId);
      tokens.push(...userTokens.map((t) => t.token));
    }

    if (tokens.length === 0) {
      this.logger.warn(
        `No active tokens found for users: ${userIds.join(", ")}`,
      );
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    return this.sendToDevices(tokens, payload);
  }

  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
        },
        data: payload.data,
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || "/assets/icons/icon-192x192.png",
            badge: "/assets/icons/icon-72x72.png",
            ...(payload.imageUrl && { image: payload.imageUrl }),
            data: payload.data,
          },
          fcmOptions: {
            link: payload.data?.actionUrl || "/",
          },
        },
      };

      await admin.messaging().send(message);
      this.logger.log(
        `Push notification sent successfully to topic ${topic} via Firebase`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to topic ${topic} via Firebase: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.log(
        `Subscribed ${tokens.length} tokens to topic ${topic} via Firebase`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to topic ${topic} via Firebase: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.log(
        `Unsubscribed ${tokens.length} tokens from topic ${topic} via Firebase`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe from topic ${topic} via Firebase: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
