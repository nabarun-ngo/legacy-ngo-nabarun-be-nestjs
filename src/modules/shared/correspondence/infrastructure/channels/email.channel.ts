import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "../../application/services/email.service";
import { EmailChannelConfig } from "../../domain/config/correspondence-config.types";
import { EmailTemplateData } from "../../presentation/dtos/email-template.dto";

/**
 * Thin channel adapter for email delivery.
 *
 * Standard flow (templateKey + data):
 *   1. Fetch + render the Remote Config template via EmailService.getEmailTemplateData()
 *   2. Apply tableDataFields injections if declared in the config
 *   3. Send via EmailService.sendTemplatedEmail()
 *
 * tableDataFields (configuration-driven table injection):
 *   Eliminates the need for programmatic table mutation in event handlers.
 *   Declared in CORRESPONDENCE_CONFIG, applied here mechanically.
 *   Example: { tableIndex: 0, dataKey: 'actualSteps', fields: ['name', 'status'] }
 *   → emailData.body.content.table[0].data = data.actualSteps.map(r => [r.name, r.status])
 *
 * prebuiltEmailData (escape hatch):
 *   For edge cases where neither templateKey+data nor tableDataFields can express
 *   the required layout. The pre-assembled EmailTemplateData is sent directly —
 *   the Remote Config fetch and all transforms are skipped.
 */
@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly emailService: EmailService) {}

  async send(
    config: EmailChannelConfig,
    data: Record<string, any>,
    to: string[],
    options?: {
      cc?: string[];
      prebuiltEmailData?: EmailTemplateData;
    },
  ): Promise<void> {
    if (to.length === 0) {
      this.logger.warn(
        `EmailChannel: no recipients for template "${config.templateKey}", skipping`,
      );
      return;
    }

    const cc = options?.cc ?? config.cc;
    let templateData: EmailTemplateData;

    if (options?.prebuiltEmailData) {
      // Escape hatch: caller already assembled the full EmailTemplateData
      templateData = options.prebuiltEmailData;
    } else {
      // Step 1: fetch + render the Remote Config template
      templateData = await this.emailService.getEmailTemplateData(
        config.templateKey,
        data,
      );

      // Step 2: apply configuration-driven table injections
      if (config.tableDataFields?.length) {
        this.applyTableDataFields(templateData, config, data);
      }
    }

    // Step 3: send (templateData already assembled, no second render)
    const result = await this.emailService.sendTemplatedEmail({
      templateData,
      options: { recipients: { to, cc } },
    });

    if (!result.success) {
      throw new Error(
        `Email send failed for template "${config.templateKey}": ${result.error}`,
      );
    }

    this.logger.log(
      `EmailChannel: sent template "${config.templateKey}" to ${to.length} recipient(s)`,
    );
  }

  /**
   * Applies tableDataFields from the config to the rendered EmailTemplateData.
   * For each entry: maps data[dataKey] over the declared fields and assigns
   * the resulting string[][] to emailData.body.content.table[tableIndex].data.
   */
  private applyTableDataFields(
    emailData: EmailTemplateData,
    config: EmailChannelConfig,
    data: Record<string, any>,
  ): void {
    for (const tableEntry of config.tableDataFields!) {
      const { tableIndex, dataKey, fields } = tableEntry;
      const sourceArray = data[dataKey];
      if (!Array.isArray(sourceArray)) {
        this.logger.warn(
          `EmailChannel: tableDataFields[${tableIndex}].dataKey "${dataKey}" is not an array — skipping table injection`,
        );
        continue;
      }

      const table = emailData.body?.content?.table?.[tableIndex];
      if (!table) {
        this.logger.warn(
          `EmailChannel: table[${tableIndex}] not found in template "${config.templateKey}" — skipping table injection`,
        );
        continue;
      }

      const existingRows = tableEntry.append ? (table.data ?? []) : [];
      const newRows = sourceArray.map((row: Record<string, any>) =>
        fields.map((field) => String(row[field] ?? "")),
      );
      table.data = tableEntry.append ? [...existingRows, ...newRows] : newRows;
    }
  }
}
