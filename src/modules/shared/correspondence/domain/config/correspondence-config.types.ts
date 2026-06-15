import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from "../../domain/models/notification.model";

/**
 * Declares how a specific table inside the rendered EmailTemplateData should
 * be populated from the CorrespondenceRequestEvent's data payload.
 *
 * Example — workflow step table:
 *   { tableIndex: 0, dataKey: 'actualSteps', fields: ['name', 'status'] }
 *
 * EmailChannel maps:  data[dataKey].map(row => fields.map(f => row[f]))
 * and assigns the result to emailData.body.content.table[tableIndex].data.
 *
 * This eliminates the need for programmatic table mutation in event handlers.
 */
export interface TableDataField {
  /** Which table in EmailTemplateData.body.content.table[] to populate. */
  tableIndex: number;
  /** Key in the event's data dict that holds the source array. */
  dataKey: string;
  /** Object property names to extract from each row, in column order. */
  fields: string[];
  /**
   * When true, rows are appended after the existing table.data rows
   * (e.g. templates that ship header rows in Remote Config that must be kept).
   * Default: false — existing rows are fully replaced.
   */
  append?: boolean;
}

/**
 * Config for the email channel.
 * Recipients are derived automatically from event.targetUsers — no resolver needed.
 */
export interface EmailChannelConfig {
  /** Firebase Remote Config key used to load the email template JSON. */
  templateKey: string;
  /** Optional static CC list (e.g. audit mailbox). */
  cc?: string[];
  /**
   * Optional table data injectors.
   * Use when the template has table sections whose rows must be built from
   * the event's data payload (e.g. a step-progress table from actualSteps).
   * Each entry maps a data array to one table index in the rendered template.
   */
  tableDataFields?: TableDataField[];
}

/**
 * Config for the push + in-app notification channel.
 * Both channels share one config entry (they always fire together).
 */
export interface PushInAppChannelConfig {
  /** Firebase Remote Config NOTIFICATION_METADATA key. */
  notificationKey: string;
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  /** Set to false to persist in-app only without sending a push. Default: true. */
  sendPush?: boolean;
}

/**
 * Full channel config for one CorrespondenceKey.
 * Omit a channel entry to disable that channel for this key.
 */
export interface ChannelConfig {
  email?: EmailChannelConfig;
  notification?: PushInAppChannelConfig;
  /** Stored as referenceType on the in-app notification row. */
  referenceType?: string;
}
