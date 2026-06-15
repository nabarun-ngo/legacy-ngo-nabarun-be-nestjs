import { HttpService } from "@nestjs/axios";
import { Injectable,Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { Configkey } from "src/shared/config-keys";

@Injectable()
export class SlackAlertService {
  private readonly logger = new Logger(SlackAlertService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async sendTechnicalAlert(
    message: string,
    type: "error" | "warning" | "info" = "error",
  ): Promise<{ success: boolean; response?: any; error?: string }> {
    this.logger.log("Sending Slack technical alert");

    try {
      const webhookUrl = this.configService.get<string>(
        Configkey.SLACK_WEBHOOK_URL,
      );

      if (!webhookUrl) {
        return { success: false, error: "Slack webhook URL not configured" };
      }

      const env =
        this.configService.get<string>(Configkey.NODE_ENV) ?? "unknown";

      const payload = {
        text: `
        <!channel> *${type.toUpperCase()} TECHNICAL ALERT*

        *Environment:* \`${env}\`
        *Type:* *${type}*

        *Message:*
        >${message.replace(/\n/g, "\n>")}`,
      };

      const response = await firstValueFrom(
        this.httpService.post(webhookUrl, payload, {
          headers: { "Content-Type": "application/json" },
        }),
      );

      this.logger.log("Slack technical alert sent successfully");

      return { success: true, response };
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error || err?.message || "Unknown error";

      this.logger.error(
        `Failed to send Slack technical alert: ${errorMessage}`,
      );

      return { success: false, error: errorMessage };
    }
  }
}
