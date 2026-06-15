import { CorrespondenceKey } from "../correspondence-key.enum";

/**
 * Minimal user shape required by the correspondence module.
 * User domain objects already satisfy this interface — pass them directly.
 */
export interface CorrespondenceTargetUser {
  readonly id: string;
  readonly email: string;
  readonly fullName?: string;
}

/**
 * Interface that domain events can implement to opt-in to direct correspondence
 * dispatch (the "hybrid" path), bypassing the need for a module-specific
 * event handler to emit a CorrespondenceRequestEvent.
 *
 * Only implement this on "rich" events that carry all required data inline
 * (full aggregate with user objects).  Events that need a DB lookup or
 * conditional business rules should NOT implement this — those still go
 * through their module handler.
 *
 * @example
 * export class TaskAssignmentCreatedEvent extends DomainEvent
 *   implements ICorrespondenceTrigger {
 *   getCorrespondenceKey() { return CorrespondenceKey.TASK_ASSIGNED; }
 *   getTargetUsers()       { return this.task.assignments.map(a => a.assignedTo); }
 *   getTemplateData()      { return { task: this.task.toJson() }; }
 *   getReferenceId()       { return this.task.id; }
 * }
 */
export interface ICorrespondenceTrigger {
  getCorrespondenceKey(): CorrespondenceKey;
  getTargetUsers(): CorrespondenceTargetUser[];
  getTemplateData(): Record<string, any>;
  getReferenceId?(): string | undefined;
  getReferenceType?(): string | undefined;
}

/**
 * Runtime type guard — checks whether an unknown event implements
 * ICorrespondenceTrigger without requiring instanceof on an interface.
 */
export function isCorrespondenceTrigger(
  event: unknown,
): event is ICorrespondenceTrigger {
  return (
    typeof event === "object" &&
    event !== null &&
    typeof (event as ICorrespondenceTrigger).getCorrespondenceKey === "function" &&
    typeof (event as ICorrespondenceTrigger).getTargetUsers === "function" &&
    typeof (event as ICorrespondenceTrigger).getTemplateData === "function"
  );
}
