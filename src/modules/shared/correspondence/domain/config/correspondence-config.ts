import { CorrespondenceKey } from "src/shared/correspondence-key.enum";
import {
  NotificationCategory,
  NotificationPriority,
  NotificationType,
} from "../../domain/models/notification.model";
import { ChannelConfig } from "./correspondence-config.types";

/**
 * Central correspondence configuration.
 *
 * Each entry declares which channels fire for a given CorrespondenceKey and
 * what template/classification metadata to use.  No resolver functions, no
 * domain logic — pure static declarations.
 *
 * Channel selection rules:
 *  - email entry present     → send email to event.targetUsers[*].email
 *  - notification entry present → persist in-app + send push (unless sendPush=false)
 *                                  to event.targetUsers[*].id
 *  - entry absent for a channel → that channel is intentionally disabled
 *
 * To add a new notification type:
 *  1. Add a key to CorrespondenceKey enum
 *  2. Add an entry here
 *  3. Add the template to Firebase Remote Config
 *  Zero handler changes required.
 */
export const CORRESPONDENCE_CONFIG: Partial<
  Record<CorrespondenceKey, ChannelConfig>
> = {
  // ── Task / Workflow ────────────────────────────────────────────────────────

  [CorrespondenceKey.TASK_ASSIGNED]: {
    email: { templateKey: CorrespondenceKey.TASK_ASSIGNED },
    notification: {
      notificationKey: CorrespondenceKey.TASK_ASSIGNED,
      type: NotificationType.TASK,
      category: NotificationCategory.TASK,
      priority: NotificationPriority.HIGH,
    },
    referenceType: "task",
  },

  [CorrespondenceKey.TASK_UPDATED]: {
    email: { templateKey: CorrespondenceKey.TASK_UPDATED },
    // no push — informational email only
  },

  [CorrespondenceKey.TASK_STARTED]: {
    // email intentionally omitted — push + in-app only
    notification: {
      notificationKey: CorrespondenceKey.TASK_STARTED,
      type: NotificationType.TASK,
      category: NotificationCategory.TASK,
      priority: NotificationPriority.HIGH,
    },
    referenceType: "task",
  },

  [CorrespondenceKey.TASK_CANCELLED]: {
    // email intentionally omitted — push + in-app only
    notification: {
      notificationKey: CorrespondenceKey.TASK_CANCELLED,
      type: NotificationType.TASK,
      category: NotificationCategory.TASK,
      priority: NotificationPriority.HIGH,
    },
    referenceType: "task",
  },

  [CorrespondenceKey.TASK_REMINDER]: {
    email: {
      templateKey: CorrespondenceKey.TASK_REMINDER,
      /**
       * The TASK_REMINDER email contains a pending-tasks table.
       * Pass pendingTasks: [{ id, name, createdAt }] in the event data.
       * EmailChannel appends rows after any header rows the template already ships.
       */
      tableDataFields: [
        {
          tableIndex: 0,
          dataKey: "pendingTasks",
          fields: ["id", "name", "createdAt"],
          append: true,
        },
      ],
    },
    notification: {
      notificationKey: CorrespondenceKey.TASK_REMINDER,
      type: NotificationType.REMINDER,
      category: NotificationCategory.TASK,
      priority: NotificationPriority.NORMAL,
    },
    referenceType: "task",
  },

  [CorrespondenceKey.WORKFLOW_UPDATE]: {
    email: {
      templateKey: CorrespondenceKey.WORKFLOW_UPDATE,
      /**
       * The WORKFLOW_UPDATE email contains a step-progress table.
       * EmailChannel will map data.actualSteps → table[0].data automatically.
       * Pass actualSteps: workflow.actualSteps in the CorrespondenceRequestEvent data.
       */
      tableDataFields: [
        { tableIndex: 0, dataKey: "actualSteps", fields: ["name", "status"] },
      ],
    },
    // push intentionally omitted — email only (workflow updates are verbose)
  },

  // ── User ──────────────────────────────────────────────────────────────────

  [CorrespondenceKey.USER_ONBOARDED]: {
    email: { templateKey: CorrespondenceKey.USER_ONBOARDED },
    // push intentionally omitted — onboarding email only
  },

  [CorrespondenceKey.ROLE_ASSIGNED]: {
    email: { templateKey: CorrespondenceKey.ROLE_ASSIGNED },
    // push intentionally omitted — email only
  },

  // ── Finance / Donation ────────────────────────────────────────────────────

  [CorrespondenceKey.DONATION_CREATED]: {
    email: { templateKey: CorrespondenceKey.DONATION_CREATED },
    notification: {
      notificationKey: CorrespondenceKey.DONATION_CREATED,
      type: NotificationType.INFO,
      category: NotificationCategory.DONATION,
      priority: NotificationPriority.NORMAL,
    },
    referenceType: "donation",
  },

  [CorrespondenceKey.DONATION_PAID]: {
    email: { templateKey: CorrespondenceKey.DONATION_PAID },
    notification: {
      notificationKey: CorrespondenceKey.DONATION_PAID,
      type: NotificationType.SUCCESS,
      category: NotificationCategory.DONATION,
      priority: NotificationPriority.NORMAL,
    },
    referenceType: "donation",
  },

  [CorrespondenceKey.DONATION_REMINDER]: {
    email: {
      templateKey: CorrespondenceKey.DONATION_REMINDER,
      /**
       * The DONATION_REMINDER email contains a pending-donations table.
       * Pass pendingDonations: [{ id, period, amount }] in the event data
       * (pre-format period and amount strings in the handler before emitting).
       * EmailChannel appends rows after any header rows the template already ships.
       */
      tableDataFields: [
        {
          tableIndex: 0,
          dataKey: "pendingDonations",
          fields: ["id", "period", "amount"],
          append: true,
        },
      ],
    },
    // push intentionally omitted — email only for reminders
  },

  [CorrespondenceKey.DONATION_SUMMARY_REPORT]: {
    email: { templateKey: CorrespondenceKey.DONATION_SUMMARY_REPORT },
    // push intentionally omitted
  },

  // ── System ────────────────────────────────────────────────────────────────

  [CorrespondenceKey.APP_TECHNICAL_ERROR]: {
    notification: {
      notificationKey: CorrespondenceKey.APP_TECHNICAL_ERROR,
      type: NotificationType.ERROR,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.URGENT,
      sendPush: true,
    },
    // email intentionally omitted — in-app + push to technical specialists only
  },
};
