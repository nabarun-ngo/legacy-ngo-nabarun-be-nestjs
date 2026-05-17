import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { JobProcessingService } from "src/modules/shared/job-processing/infrastructure/services/job-processing.service";
import { UserCreatedEvent } from "../../domain/events/user-created.event";
import { Injectable, Logger } from "@nestjs/common";
import { RoleAssignedEvent } from "../../domain/events/role-assigned.event";
import { CorrespondenceService } from "src/modules/shared/correspondence/application/services/correspondence.service";
import { EmailTemplateName } from "src/shared/email-keys";
import { JobName } from "src/shared/job-names";
import { formatDate } from "src/shared/utilities/common.util";
import { StaticDocsService } from "src/modules/shared/static-docs/application/services/static-docs.service";
import { UserDeletedEvent } from "../../domain/events/user-deleted.event";
import { Role } from "../../domain/model/role.model";
import { CreateWorkflowRequestEvent } from "src/modules/workflow/application/events/create-workflow-request.event";

@Injectable()
export class UserEventsHandler {
  private readonly logger = new Logger(UserEventsHandler.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly corrService: CorrespondenceService,
    private readonly jobProcessingService: JobProcessingService,
    private readonly staticDocs: StaticDocsService

  ) { }

  @OnEvent(UserCreatedEvent.name, { async: true })
  async handleUserCreatedEvent(event: UserCreatedEvent) {
    this.logger.log(`Handling ${UserCreatedEvent.name} event: for user ${event.user.email} `)

    await this.jobProcessingService.addJob(
      JobName.SEND_ONBOARDING_EMAIL,
      {
        fullName: event.user.fullName,
        email: event.user.email,
        password: event.user.password,
      }
    );
    await this.jobProcessingService.addJob(
      JobName.UPDATE_USER_ROLE,
      {
        userId: event.user.id,
        newRoles: []
      }
    );
  }

  @OnEvent(RoleAssignedEvent.name, { async: true })
  async handleRoleAssignedEvent(event: RoleAssignedEvent) {
    this.logger.log(`Handling ${RoleAssignedEvent.name} event: for user ${event.user.email} `)
    const policyLink = await this.staticDocs.getStaticLink('POLICY_RULES_AND_REGULATIONS');
    const user = event.user;
    if (event.toAdd.length > 0 || event.toRemove.length > 0) {
      await this.corrService.sendTemplatedEmail({
        templateName: EmailTemplateName.ROLE_ASSIGNED,
        data: {
          assigneeName: user.fullName,
          roleNames: user.getCurrentRoles().map(role => role.roleName).join(', '),
          addedRoles: event.toAdd.map(role => role.roleName).join(', '),
          removedRoles: event.toRemove.map(role => role.roleName).join(', '),
          effectiveDate: user.getCurrentRoles().length > 0 ? formatDate(user.getCurrentRoles()[0].createdAt) : 'Not Applicable',
          rulesDoc: policyLink?.VALUE
        },
        options: {
          recipients: {
            to: user.email,
          }
        }
      })

      const MoneyRole = [Role.CASHIER, Role.ASSISTANT_CASHIER];
      if (event.toAdd.some(role => MoneyRole.includes(role.roleCode)) || event.toRemove.some(role => MoneyRole.includes(role.roleCode))) {
        this.eventEmitter.emit(CreateWorkflowRequestEvent.name, new CreateWorkflowRequestEvent({
          type: 'ACCOUNT_ADJUSTMENT',
          data: {
            needCreateAccount: event.toAdd.some(role => MoneyRole.includes(role.roleCode)) ? 'Yes' : 'No',
            needDeleteAccount: event.toRemove.some(role => MoneyRole.includes(role.roleCode)) ? 'Yes' : 'No',
            name: user.fullName!,
            email: user.email,
            addedRoles: event.toAdd.map(role => role.roleName).join(', '),
            removedRoles: event.toRemove.map(role => role.roleName).join(', '),
          },
          requestedFor: user.id,
          forExternalUser: false,
        }))
      }

    }
  }

  @OnEvent(UserDeletedEvent.name, { async: true })
  async handleUserDeletedEvent(event: UserDeletedEvent) {
    this.logger.warn(`TODO : Send final email to user ${event.user.email} about account deactivation`)
    // await this.corrService.sendTemplatedEmail({
    //   templateName: EmailTemplateName.USER_DELETED,
    //   data: {
    //     userName: event.user.fullName,
    //     email: event.user.email,
    //   },
    //   options: {
    //     recipients: {
    //       to: event.user.email,
    //     }
    //   }
    // })

  }





}