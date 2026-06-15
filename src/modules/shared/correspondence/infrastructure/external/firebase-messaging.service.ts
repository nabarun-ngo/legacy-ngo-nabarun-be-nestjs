import { Injectable,Logger } from "@nestjs/common";
import * as admin from "firebase-admin";

export interface PushNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
  data?: Record<string, string>;
}

@Injectable()
export class FirebaseMessagingService {
  private readonly logger = new Logger(FirebaseMessagingService.name);

  /**
   * Send push notification to multiple devices
   */
  async sendToDevices(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<{ successCount: number; failureCount: number; errors: any[] }> {
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
        `Bulk push notification sent: ${response.successCount} success, ${response.failureCount} failures`,
      );

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.responses
          .map((r, idx) =>
            r.success ? null : { token: tokens[idx], error: r.error },
          )
          .filter((e) => e !== null),
      };
    } catch (error) {
      this.logger.error(
        `Failed to send bulk push notifications: ${error.message}`,
        error.stack,
      );
      return {
        successCount: 0,
        failureCount: tokens.length,
        errors: [{ error: error.message }],
      };
    }
  }

  /**
   * Send to topic
   */
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
      this.logger.log(`Push notification sent successfully to topic: ${topic}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to topic: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe tokens to a topic
   */
  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.log(`Subscribed ${tokens.length} tokens to topic: ${topic}`);
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to topic: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Unsubscribe tokens from a topic
   */
  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    try {
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.log(
        `Unsubscribed ${tokens.length} tokens from topic: ${topic}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe from topic: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
