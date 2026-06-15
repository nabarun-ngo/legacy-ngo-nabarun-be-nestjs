/**
 * Unified correspondence key enum.
 * A single key identifies a notification/email type across ALL channels
 * (email, push, in-app). Replaces the split EmailTemplateName + NotificationKeys enums.
 *
 * Convention:
 *  - The value string matches the Firebase Remote Config key for both
 *    email templates and NOTIFICATION_METADATA entries.
 *  - Add a new key here, add its channel config in correspondence-config.ts,
 *    and add the template in Firebase Remote Config — no handler changes needed.
 */
export enum CorrespondenceKey {
  // ── Task / Workflow ──────────────────────────────────────────────────────
  TASK_ASSIGNED = "TASK_ASSIGNED",
  TASK_UPDATED = "TASK_UPDATED",
  TASK_STARTED = "TASK_STARTED",
  TASK_CANCELLED = "TASK_CANCELLED",
  TASK_REMINDER = "TASK_REMINDER",
  WORKFLOW_UPDATE = "WORKFLOW_UPDATE",

  // ── User ─────────────────────────────────────────────────────────────────
  USER_ONBOARDED = "USER_ONBOARDED",
  ROLE_ASSIGNED = "ROLE_ASSIGNED",

  // ── Finance / Donation ───────────────────────────────────────────────────
  DONATION_CREATED = "DONATION_CREATED",
  DONATION_PAID = "DONATION_PAID",
  DONATION_REMINDER = "DONATION_REMINDER",
  DONATION_SUMMARY_REPORT = "DONATION_SUMMARY_REPORT",

  // ── System ───────────────────────────────────────────────────────────────
  APP_TECHNICAL_ERROR = "APP_TECHNICAL_ERROR",
}
