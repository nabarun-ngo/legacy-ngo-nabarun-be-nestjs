import { gmail as googleMail } from "@googleapis/gmail";
import { Inject,Injectable,Logger } from "@nestjs/common";
import {
GOOGLE_OAUTH_SERVICE,
OAuthService,
} from "../../../auth/application/services";
import { GOOGLE_SCOPES } from "../../../auth/scopes";
import {
EmailOptions,
SendEmailResult,
} from "../../presentation/dtos/email.dto";

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);
  private readonly scope = GOOGLE_SCOPES.gmail;

  constructor(
    @Inject(GOOGLE_OAUTH_SERVICE)
    private readonly googleOAuthService: OAuthService,
  ) {}

  /**
   * Send an email using Gmail API
   */
  async sendEmail(
    html: string,
    options: EmailOptions,
    fromName: string,
  ): Promise<SendEmailResult> {
    const oauth2Client = await this.googleOAuthService.getAuthenticatedClient(
      this.scope,
    );
    if (!oauth2Client) {
      return {
        success: false,
        error: "Failed to get authenticated client",
      };
    }
    const user = await oauth2Client.getTokenInfo(
      oauth2Client.credentials.access_token,
    );
    const gmail = googleMail({ version: "v1", auth: oauth2Client });
    const message = this.buildEmailMessage(
      { html: html },
      options,
      user.email,
      fromName,
    );
    // Send email
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: message,
      },
    });

    const messageId = response.data.id;
    this.logger.log(
      `Email sent successfully. Message ID: ${messageId}, To: ${Array.isArray(options.recipients.to) ? options.recipients.to.join(", ") : options.recipients.to}`,
    );

    return {
      success: true,
      messageId: messageId!,
    };
  }

  /**
   * Build RFC 2822 email message
   */
  private buildEmailMessage(
    content: { text?: string; html?: string },
    options: EmailOptions,
    fromEmail: string,
    senderName: string,
  ): string {
    const lines: string[] = [];

    // Headers
    if (fromEmail) {
      lines.push(`From: "${senderName}" <${fromEmail}>`);
    }

    if (options.recipients.to) {
      lines.push(
        `To: ${Array.isArray(options.recipients.to) ? options.recipients.to?.join(", ") : options.recipients.to}`,
      );
    }

    if (options.recipients.cc) {
      lines.push(
        `Cc: ${Array.isArray(options.recipients.cc) ? options.recipients.cc?.join(", ") : options.recipients.cc}`,
      );
    }

    if (options.recipients.bcc) {
      lines.push(
        `Bcc: ${Array.isArray(options.recipients.bcc) ? options.recipients.bcc.join(", ") : options.recipients.bcc}`,
      );
    }

    if (options.replyTo) {
      lines.push(`Reply-To: ${options.replyTo}`);
    }

    lines.push(`Subject: ${options.subject}`);
    lines.push(`Date: ${new Date().toUTCString()}`);

    // MIME version
    lines.push("MIME-Version: 1.0");

    // Determine content type and build message body
    if (content.html && options.attachments && options.attachments.length > 0) {
      // Multipart message with HTML and attachments
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push("");
      lines.push(`--${boundary}`);

      // HTML part
      lines.push('Content-Type: multipart/alternative; boundary="alt"');
      lines.push("");
      lines.push("--alt");
      if (content.text) {
        lines.push("Content-Type: text/plain; charset=utf-8");
        lines.push("");
        lines.push(content.text);
        lines.push("--alt");
      }
      lines.push("Content-Type: text/html; charset=utf-8");
      lines.push("");
      lines.push(content.html);
      lines.push("--alt--");

      // Attachments
      for (const attachment of options.attachments) {
        lines.push(`--${boundary}`);
        lines.push(
          `Content-Type: ${attachment.contentType || "application/octet-stream"}`,
        );
        lines.push(
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
        );
        lines.push(`Content-Transfer-Encoding: base64`);
        lines.push("");
        const content =
          typeof attachment.content === "string"
            ? attachment.content
            : attachment.content.toString("base64");
        // Split base64 into 76 character lines (RFC 2045)
        const base64Lines = content.match(/.{1,76}/g) || [];
        lines.push(...base64Lines);
      }
      lines.push(`--${boundary}--`);
    } else if (content.html) {
      // HTML only
      if (content.text) {
        // Both HTML and text - use multipart/alternative
        const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        lines.push(
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
        );
        lines.push("");
        lines.push(`--${boundary}`);
        lines.push("Content-Type: text/plain; charset=utf-8");
        lines.push("");
        lines.push(content.text);
        lines.push(`--${boundary}`);
        lines.push("Content-Type: text/html; charset=utf-8");
        lines.push("");
        lines.push(content.html);
        lines.push(`--${boundary}--`);
      } else {
        // HTML only
        lines.push("Content-Type: text/html; charset=utf-8");
        lines.push("");
        lines.push(content.html);
      }
    } else if (content.text) {
      // Text only
      lines.push("Content-Type: text/plain; charset=utf-8");
      lines.push("");
      lines.push(content.text);
    } else {
      throw new Error("Either text or html content must be provided");
    }

    const message = lines.join("\r\n");

    // Encode to base64url (RFC 4648)
    return Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
