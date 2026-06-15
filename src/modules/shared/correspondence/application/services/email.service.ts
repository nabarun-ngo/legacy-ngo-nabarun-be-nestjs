import { Injectable,Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Configkey } from "src/shared/config-keys";
import { isTrue } from "src/shared/utilities/common.util";
import { RemoteConfigService } from "../../../firebase/remote-config/remote-config.service";
import { GmailService } from "../../infrastructure/external/gmail.service";
import {
loadTemplate,
renderJsonTemplateFromString,
} from "../../infrastructure/utilities/email-template.utility";
import { SendEmailDto } from "../../presentation/dtos/correspondence.dto";
import { EmailTemplateData } from "../../presentation/dtos/email-template.dto";
import {
SendEmailRequest,
SendEmailResult,
} from "../../presentation/dtos/email.dto";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly gmailService: GmailService,
    private readonly rcService: RemoteConfigService,
  ) {}

  /**
   * Send an email using Gmail API
   * Automatically uses the authenticated Gmail account for the user
   */
  async sendTemplatedEmail(
    request: SendEmailRequest,
  ): Promise<SendEmailResult> {
    const from =
      request.fromName ?? this.configService.get<string>(Configkey.APP_NAME)!;

    const data =
      request.templateData ??
      (await this.getEmailTemplateData(request.templateName!, request.data!));

    const html = await this.buildEmailHtml(data);

    return this.sendInternalEmail({
      html,
      subject: request.options.subject ?? data.subject ?? "",
      to: request.options.recipients?.to!,
      cc: request.options.recipients?.cc,
      bcc: request.options.recipients?.bcc,
      from,
      attachments: request.options.attachments,
    });
  }

  async sendEmail(request: SendEmailDto): Promise<SendEmailResult> {
    return this.sendInternalEmail({
      html: request.html,
      subject: request.subject,
      to: request.to.split(","),
      cc: request.cc,
      bcc: request.bcc,
      from: request.from,
    });
  }

  async getEmailTemplateData(
    templateName: string,
    data: Record<string, any>,
  ): Promise<EmailTemplateData> {
    const configStr = (await this.rcService.getAllKeyValues())[templateName]
      .value;
    return renderJsonTemplateFromString<EmailTemplateData>(configStr, data);
  }

  /**
   * PRIVATE METHODS
   */

  private async buildEmailHtml(templateData: EmailTemplateData) {
    const template = loadTemplate("email");
    return template(templateData);
  }

  private resolveRecipients(
    to?: string | string[],
    cc?: string | string[],
    bcc?: string | string[],
  ): {
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
  } {
    const isProdEnv = this.configService.get(Configkey.ENVIRONMENT) == "prod";

    const isProdMode = isTrue(
      this.configService.get(Configkey.ENABLE_PROD_MODE),
    );

    if (isProdEnv || isProdMode) {
      return { to, cc, bcc };
    }

    const isMockingEnabled = isTrue(
      this.configService.get(Configkey.ENABLE_EMAIL_MOCKING),
    );

    if (!isMockingEnabled) {
      throw new Error("Email mocking is not enabled");
    }

    const mockedEmail = this.configService.get<string>(
      Configkey.MOCKED_EMAIL_ADDRESS,
    );

    this.logger.warn(`📧 Mocking email. Redirecting to ${mockedEmail}`);

    return { to: mockedEmail! };
  }

  private async sendInternalEmail(params: {
    html: string;
    subject: string;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    from?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }): Promise<SendEmailResult> {
    const from =
      params.from ?? this.configService.get<string>(Configkey.APP_NAME)!;

    try {
      const recipients = this.resolveRecipients(
        params.to,
        params.cc,
        params.bcc,
      );

      return this.gmailService.sendEmail(
        params.html,
        {
          subject: params.subject,

          recipients,
          attachments: params.attachments,
        },
        from,
      );
    } catch (err) {
      this.logger.error(`Failed to send email: ${err}`);
      return { success: false, error: err };
    }
  }
}
