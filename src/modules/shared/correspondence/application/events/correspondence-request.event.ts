import {
  CorrespondenceKey,
} from "src/shared/correspondence-key.enum";
import {
  CorrespondenceTargetUser,
} from "src/shared/interfaces/correspondence-trigger.interface";
import { EmailTemplateData } from "../../presentation/dtos/email-template.dto";

/**
 * Unified event that replaces SendNotificationRequestEvent.
 *
 * Responsibility split:
 *  - WHO to notify → the emitter resolves this and passes targetUsers (TO) and cc
 *  - WHAT/HOW to send → declared in CORRESPONDENCE_CONFIG, keyed by `key`
 *
 * Escape hatch — prebuiltEmailData:
 *   For complex emails where the template content is built programmatically
 *   (e.g. a table built from DB query results), the emitter can provide a fully
 *   assembled EmailTemplateData object.  When present, EmailChannel uses it
 *   directly and skips the Remote Config fetch + Handlebars render step.
 *   Use only when the standard templateName + data approach cannot express
 *   the required output (e.g. dynamic table rows from non-Handlebars sources).
 */
export class CorrespondenceRequestEvent {
  public readonly key: CorrespondenceKey;
  public readonly targetUsers: CorrespondenceTargetUser[];
  public readonly cc?: string[];
  public readonly data: Record<string, any>;
  public readonly referenceId?: string;
  public readonly referenceType?: string;
  /** Optional pre-assembled email template data (bypasses Remote Config rendering). */
  public readonly prebuiltEmailData?: EmailTemplateData;

  constructor(op: {
    key: CorrespondenceKey;
    targetUsers: CorrespondenceTargetUser[];
    data: Record<string, any>;
    cc?: string[];
    referenceId?: string;
    referenceType?: string;
    prebuiltEmailData?: EmailTemplateData;
  }) {
    this.key = op.key;
    this.targetUsers = op.targetUsers;
    this.cc = op.cc;
    this.data = op.data;
    this.referenceId = op.referenceId;
    this.referenceType = op.referenceType;
    this.prebuiltEmailData = op.prebuiltEmailData;
  }
}
