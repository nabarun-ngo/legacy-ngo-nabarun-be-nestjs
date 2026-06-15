import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { CorrespondenceRequestEvent } from "src/modules/shared/correspondence/application/events/correspondence-request.event";
import { JobProcessingService } from "src/modules/shared/job-processing/infrastructure/services/job-processing.service";
import { StaticDocsService } from "src/modules/shared/static-docs/application/services/static-docs.service";
import { WorkflowFacade } from "src/modules/workflow/application/services/workflow-facade.service";
import { CorrespondenceKey } from "src/shared/correspondence-key.enum";
import { JobName } from "src/shared/job-names";
import { formatDate } from "src/shared/utilities/common.util";
import { RoleAssignedEvent } from "../../domain/events/role-assigned.event";
import { UserCreatedEvent } from "../../domain/events/user-created.event";
import { UserDeletedEvent } from "../../domain/events/user-deleted.event";
import { Role } from "../../domain/model/role.model";

@Injectable()
export class UserEventsHandler {
  private readonly logger = new Logger(UserEventsHandler.name);

  constructor(
    private readonly jobProcessingService: JobProcessingService,
    private readonly staticDocs: StaticDocsService,
    private readonly workflowFacade: WorkflowFacade,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── UserCreatedEvent — PATH A (queued via BullMQ for retry support) ───────

  @OnEvent(UserCreatedEvent.name, { async: true })
  async handleUserCreatedEvent(event: UserCreatedEvent) {
    this.logger.log(
      `Handling ${UserCreatedEvent.name} event: for user ${event.user.email}`,
    );

    await this.jobProcessingService.addJob(JobName.SEND_ONBOARDING_EMAIL, {
      fullName: event.user.fullName,
      email: event.user.email,
      password: event.user.password,
    });
    await this.jobProcessingService.addJob(JobName.UPDATE_USER_ROLE, {
      userId: event.user.id,
      newRoles: [],
    });
  }

  // ── RoleAssignedEvent — PATH A (two side-effects: email + workflow start) ─

  @OnEvent(RoleAssignedEvent.name, { async: true })
  async handleRoleAssignedEvent(event: RoleAssignedEvent) {
    this.logger.log(
      `Handling ${RoleAssignedEvent.name} event: for user ${event.user.email}`,
    );

    const user = event.user;
    if (event.toAdd.length === 0 && event.toRemove.length === 0) return;

    const policyLink = await this.staticDocs.getStaticLink(
      "POLICY_RULES_AND_REGULATIONS",
    );

    // Side-effect 1: Send role-assigned email via CorrespondenceRequestEvent
    this.eventEmitter.emit(
      CorrespondenceRequestEvent.name,
      new CorrespondenceRequestEvent({
        key: CorrespondenceKey.ROLE_ASSIGNED,
        targetUsers: [user],
        data: {
          assigneeName: user.fullName,
          roleNames: user
            .getCurrentRoles()
            .map((role) => role.roleName)
            .join(", "),
          addedRoles: event.toAdd.map((role) => role.roleName).join(", "),
          removedRoles: event.toRemove.map((role) => role.roleName).join(", "),
          effectiveDate:
            user.getCurrentRoles().length > 0
              ? formatDate(user.getCurrentRoles()[0].createdAt)
              : "Not Applicable",
          rulesDoc: policyLink?.VALUE,
        },
      }),
    );

    // Side-effect 2: Start ACCOUNT_ADJUSTMENT workflow for money roles
    const MoneyRole = [Role.CASHIER, Role.ASSISTANT_CASHIER];
    if (
      event.toAdd.some((role) => MoneyRole.includes(role.roleCode)) ||
      event.toRemove.some((role) => MoneyRole.includes(role.roleCode))
    ) {
      await this.workflowFacade.startWorkflow({
        type: "ACCOUNT_ADJUSTMENT",
        data: {
          needCreateAccount: event.toAdd.some((role) =>
            MoneyRole.includes(role.roleCode),
          )
            ? "Yes"
            : "No",
          needDeleteAccount: event.toRemove.some((role) =>
            MoneyRole.includes(role.roleCode),
          )
            ? "Yes"
            : "No",
          name: user.fullName!,
          email: user.email,
          addedRoles: event.toAdd.map((role) => role.roleName).join(", "),
          removedRoles: event.toRemove.map((role) => role.roleName).join(", "),
        },
        requestedFor: user.id,
        forExternalUser: false,
      });
    }
  }

  // ── UserDeletedEvent — PATH A (TODO: send farewell email) ─────────────────

  @OnEvent(UserDeletedEvent.name, { async: true })
  async handleUserDeletedEvent(event: UserDeletedEvent) {
    this.logger.warn(
      `TODO: emit CorrespondenceRequestEvent for USER_DELETED once template is ready`,
    );
    // To enable:
    // this.eventEmitter.emit(CorrespondenceRequestEvent.name,
    //   new CorrespondenceRequestEvent({
    //     key: CorrespondenceKey.USER_DELETED,
    //     targetUsers: [event.user],
    //     data: { userName: event.user.fullName, email: event.user.email },
    //   }),
    // );
  }
}
