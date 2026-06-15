import { EmailTemplateData } from "./email-template.dto";

export interface EmailOptions {
  recipients: {
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
  };
  replyTo?: string;
  subject?: string;

  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendEmailRequest {
  options: EmailOptions;
  fromName?: string;
  templateData?: EmailTemplateData;
  templateName?: string;
  data?: Record<string, any>;
}

export class SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
