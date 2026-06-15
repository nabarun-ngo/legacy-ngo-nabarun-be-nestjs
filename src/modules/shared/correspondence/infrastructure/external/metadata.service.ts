import { Injectable } from "@nestjs/common";
import Handlebars from "handlebars";
import { RemoteConfigService } from "src/modules/shared/firebase/remote-config/remote-config.service";
import { Configkey } from "src/shared/config-keys";
import { parseKeyValueConfigs } from "src/shared/utilities/kv-config.util";

@Injectable()
export class MetadataService {
  constructor(private readonly configService: RemoteConfigService) {}

  async getNotification(
    notificationKey: string,
    data: Record<string, any>,
  ): Promise<{
    title: string;
    description: string;
    imageUrl?: string;
    actionUrl?: string;
  }> {
    const remoteConfig = await this.configService.getAllKeyValues();
    const value = remoteConfig["NOTIFICATION_METADATA"].value;
    const template = Handlebars.compile(value);
    const metadata = parseKeyValueConfigs(template(data));
    const notificationMetadata = metadata.find(
      (m) => m.KEY === notificationKey,
    );
    if (!notificationMetadata) {
      throw new Error(
        `Notification metadata not found for key: ${notificationKey}`,
      );
    }

    const appFeUrl = process.env[Configkey.APP_FE_URL]!;
    const imageUrl = notificationMetadata?.getAttribute<string>("IMAGE_URL");
    const actionUrl = notificationMetadata?.getAttribute<string>("ACTION_URL");

    return {
      title: notificationMetadata?.VALUE,
      description: notificationMetadata?.DESCRIPTION,
      imageUrl: this.buildUrl(appFeUrl, imageUrl),
      actionUrl: this.buildUrl(appFeUrl, actionUrl),
    };
  }

  private buildUrl(baseUrl: string, path?: string): string | undefined {
    if (!path) {
      return undefined;
    }
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    if (path.startsWith("/")) {
      return `${baseUrl}${path}`;
    }
    return `${baseUrl}/${path}`;
  }
}
