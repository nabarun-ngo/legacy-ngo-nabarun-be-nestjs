export interface PushNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  icon?: string;
  data?: Record<string, string>;
}

export interface PushNotificationResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{ token: string; error: any }>;
}

export interface IPushNotificationProvider {
  sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
    name?: string,
  ): Promise<PushNotificationResponse>;
  sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; error?: string }>;
  subscribeToTopic(tokens: string[], topic: string): Promise<void>;
  unsubscribeFromTopic(tokens: string[], topic: string): Promise<void>;
}

export const IPushNotificationProvider = Symbol("IPushNotificationProvider");
