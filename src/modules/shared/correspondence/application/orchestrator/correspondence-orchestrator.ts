import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import {
  isCorrespondenceTrigger,
} from "src/shared/interfaces/correspondence-trigger.interface";
import { CORRESPONDENCE_CONFIG } from "../../domain/config/correspondence-config";
import { EmailChannel } from "../../infrastructure/channels/email.channel";
import { PushInAppChannel } from "../../infrastructure/channels/push-inapp.channel";
import { CorrespondenceRequestEvent } from "../events/correspondence-request.event";

/**
 * Central correspondence orchestrator.
 *
 * Handles two dispatch paths:
 *
 * PATH A — Two-step via CorrespondenceRequestEvent
 *   Module event handlers (e.g. WorkflowEventsHandler) emit
 *   CorrespondenceRequestEvent after applying any business rules / DB lookups.
 *   The orchestrator reads CORRESPONDENCE_CONFIG[key] and fires channels.
 *
 * PATH B — Direct ICorrespondenceTrigger (hybrid)
 *   Rich domain events that implement ICorrespondenceTrigger are intercepted
 *   here via the "**" wildcard listener.  If the event opts-in to the interface,
 *   the orchestrator creates a CorrespondenceRequestEvent internally and
 *   processes it through the same pipeline — no handler boilerplate needed.
 *   Events that do NOT implement the interface are ignored silently.
 *
 * Channel dispatch uses Promise.allSettled so one channel failure never
 * blocks or silences the others.
 */
@Injectable()
export class CorrespondenceOrchestrator {
  private readonly logger = new Logger(CorrespondenceOrchestrator.name);

  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly pushInAppChannel: PushInAppChannel,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── PATH A: Two-step via CorrespondenceRequestEvent ──────────────────────

  @OnEvent(CorrespondenceRequestEvent.name, { async: true })
  async handleCorrespondenceRequest(
    event: CorrespondenceRequestEvent,
  ): Promise<void> {
    await this.dispatch(event);
  }

  // ── PATH B: ICorrespondenceTrigger — direct domain event interception ────

  /**
   * Wildcard listener that intercepts ALL domain events.
   * Only acts on events that implement ICorrespondenceTrigger.
   * Events that don't implement it are ignored with zero overhead.
   */
  @OnEvent("**", { async: true })
  async handleAnyEvent(event: unknown): Promise<void> {
    // Skip CorrespondenceRequestEvent itself to avoid double-processing
    if (event instanceof CorrespondenceRequestEvent) return;

    if (!isCorrespondenceTrigger(event)) return;

    this.logger.debug(
      `ICorrespondenceTrigger detected on ${event.constructor.name}`,
    );

    const correspondenceEvent = new CorrespondenceRequestEvent({
      key: event.getCorrespondenceKey(),
      targetUsers: event.getTargetUsers(),
      data: event.getTemplateData(),
      referenceId: event.getReferenceId?.(),
      referenceType: event.getReferenceType?.(),
    });

    await this.dispatch(correspondenceEvent);
  }

  // ── Shared dispatch pipeline ──────────────────────────────────────────────

  private async dispatch(event: CorrespondenceRequestEvent): Promise<void> {
    const { key, targetUsers, data, referenceId, referenceType } = event;

    const config = CORRESPONDENCE_CONFIG[key];
    if (!config) {
      this.logger.warn(
        `CorrespondenceOrchestrator: no config found for key "${key}" — skipping`,
      );
      return;
    }

    const tasks: Array<Promise<void>> = [];

    if (config.email) {
      const to = targetUsers.map((u) => u.email).filter(Boolean) as string[];
      tasks.push(
        this.emailChannel.send(config.email, data, to, {
          cc: event.cc,
          prebuiltEmailData: event.prebuiltEmailData,
        }),
      );
    }

    if (config.notification) {
      const userIds = targetUsers.map((u) => u.id).filter(Boolean);
      tasks.push(
        this.pushInAppChannel.send(config.notification, userIds, data, {
          referenceId,
          referenceType: config.referenceType ?? referenceType,
        }),
      );
    }

    if (tasks.length === 0) {
      this.logger.warn(
        `CorrespondenceOrchestrator: config for key "${key}" has no active channels`,
      );
      return;
    }

    // Parallel dispatch — one channel failure never blocks the others
    const results = await Promise.allSettled(tasks);
    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        this.logger.error(
          `CorrespondenceOrchestrator: channel[${idx}] failed for key "${key}": ${result.reason}`,
        );
      }
    });

    this.logger.log(
      `CorrespondenceOrchestrator: dispatched key "${key}" via ${tasks.length} channel(s) to ${targetUsers.length} user(s)`,
    );
  }
}
