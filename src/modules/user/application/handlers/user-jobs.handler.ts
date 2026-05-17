import { Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { ProcessJob } from "src/modules/shared/job-processing/application/decorators/process-job.decorator";
import { Role } from "../../domain/model/role.model";
import { AssignRoleUseCase } from "../use-cases/assign-role.use-case";
import { CorrespondenceService } from "src/modules/shared/correspondence/application/services/correspondence.service";
import { EmailTemplateName } from "src/shared/email-keys";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Configkey } from "src/shared/config-keys";

import { StaticDocsService } from "src/modules/shared/static-docs/application/services/static-docs.service";
import { JobName } from "src/shared/job-names";

@Injectable()
export class UserJobsHandler {
  private readonly logger = new Logger(UserJobsHandler.name);

  constructor(
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly corrService: CorrespondenceService,
    private readonly configService: ConfigService,
    private readonly staticDocs: StaticDocsService
  ) { }




  @ProcessJob({
    name: JobName.UPDATE_USER_ROLE,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
  async updateUserRole(job: Job<{ userId: string; newRoles: Role[]; }>) {
    await this.assignRoleUseCase.execute({
      userId: job.data.userId,
      newRoles: []
    });
  }


  @ProcessJob({
    name: JobName.SEND_ONBOARDING_EMAIL,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 30 * 1000,
    },
  })
  async sendOnboardingEmail(job: Job<{ fullName: string; email: string; password: string; attachmentUrl?: string }>) {
    const policyLink = await this.staticDocs.getStaticLink('POLICY_RULES_AND_REGULATIONS');

    await this.corrService.sendTemplatedEmail({
      templateName: EmailTemplateName.USER_ONBOARDED,
      data: {
        name: job.data.fullName,
        email: job.data.email,
        password: job.data.password,
        portalUrl: this.configService.get(Configkey.APP_FE_URL),
        rulesDocLink: policyLink?.VALUE
      },
      options: {
        recipients: {
          to: job.data.email,
        },
      }
    });
    this.logger.log(`Onboarding Email sent successfully!!`);
  }





}

