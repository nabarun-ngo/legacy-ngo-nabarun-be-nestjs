import { Injectable,Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as OneSignal from "@onesignal/node-onesignal";
import { Configkey } from "src/shared/config-keys";
import {
IPushNotificationProvider,
PushNotificationPayload,
PushNotificationResponse,
} from "../../domain/interfaces/push-notification-provider.interface";

@Injectable()
export class OneSignalPushProvider implements IPushNotificationProvider {
  private readonly logger = new Logger(OneSignalPushProvider.name);
  private readonly client: OneSignal.DefaultApi;
  private readonly appId: string;

  constructor(private readonly configService: ConfigService) {
    this.appId =
      this.configService.get<string>(Configkey.ONESIGNAL_APP_ID) || "";
    const restApiKey =
      this.configService.get<string>(Configkey.ONESIGNAL_REST_API_KEY) || "";

    const configuration = OneSignal.createConfiguration({
      restApiKey: restApiKey,
    });
    this.client = new OneSignal.DefaultApi(configuration);
  }

  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    name?: string,
  ): Promise<PushNotificationResponse> {
    if (!userIds || userIds.length === 0) {
      return { successCount: 0, failureCount: 0, errors: [] };
    }

    try {
      const notification = new OneSignal.Notification();
      notification.app_id = this.appId;
      notification.target_channel = "push";
      notification.include_aliases = {
        external_id: userIds,
      };
      notification.headings = { en: payload.title };
      notification.contents = { en: payload.body };
      notification.data = payload.data;

      // if (payload.icon) {
      //     notification.chrome_web_icon = payload.icon;
      //     notification.small_icon = payload.icon;
      //     notification.huawei_small_icon = payload.icon;
      //     notification.adm_small_icon = payload.icon;
      // }
      if (payload.imageUrl) {
        notification.chrome_web_image = payload.imageUrl;
        notification.big_picture = payload.imageUrl;
        notification.huawei_big_picture = payload.imageUrl;
        notification.adm_big_picture = payload.imageUrl;
      }
      notification.buttons = [];
      if (payload.data?.actionUrl) {
        notification.web_url = payload.data?.actionUrl;
      }
      if (name) {
        notification.name = name;
      }

      const response = await this.client.createNotification(notification);

      this.logger.log(
        `Push notification sent to users via OneSignal SDK: ${JSON.stringify(response)}`,
      );

      return {
        successCount:
          response.errors?.length > 0
            ? userIds.length - response.errors.length
            : userIds.length,
        failureCount: response.errors?.length || 0,
        errors: response.errors || [],
      };
    } catch (error) {
      const errorMessage = error.body
        ? JSON.stringify(error.body)
        : error.message;
      this.logger.error(
        `Failed to send push notifications to users via OneSignal SDK: ${errorMessage}`,
        error.stack,
      );
      return {
        successCount: 0,
        failureCount: userIds.length,
        errors: [{ token: "all", error: errorMessage }],
      };
    }
  }

  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = new OneSignal.Notification();
      notification.app_id = this.appId;
      notification.filters = [
        { field: "tag", key: "topic", relation: "=", value: topic } as any,
      ];
      notification.headings = { en: payload.title };
      notification.contents = { en: payload.body };
      notification.data = payload.data;

      if (payload.icon) {
        notification.chrome_web_icon = payload.icon;
      }
      if (payload.imageUrl) {
        notification.chrome_web_image = payload.imageUrl;
        notification.big_picture = payload.imageUrl;
      }
      notification.web_url = payload.data?.actionUrl || "/";

      await this.client.createNotification(notification);

      this.logger.log(
        `Push notification sent successfully to topic ${topic} via OneSignal SDK`,
      );
      return { success: true };
    } catch (error) {
      const errorMessage = error.body
        ? JSON.stringify(error.body)
        : error.message;
      this.logger.error(
        `Failed to send push notification to topic ${topic} via OneSignal SDK: ${errorMessage}`,
        error.stack,
      );
      return { success: false, error: errorMessage };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<void> {
    this.logger.warn(
      `subscribeToTopic: OneSignal SDK v5+ requires user identification for tags. This implementation uses the legacy pattern via updateUser which may require aliases.`,
    );
    for (const token of tokens) {
      try {
        // Attempting to update user tags using the subscription ID as a 'onesignal_id' alias
        // In some configurations, OneSignal allows this, but it's better to use external_id if available.
        // Since the interface only gives tokens (subscription IDs), we use what we have.
        await this.client.updateUser(this.appId, "onesignal_id", token, {
          properties: {
            tags: { topic: topic },
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to subscribe token ${token} to topic ${topic} via OneSignal SDK: ${error.message}`,
        );
      }
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<void> {
    for (const token of tokens) {
      try {
        await this.client.updateUser(this.appId, "onesignal_id", token, {
          properties: {
            tags: { topic: "" },
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to unsubscribe token ${token} from topic ${topic} via OneSignal SDK: ${error.message}`,
        );
      }
    }
  }
}
