import { Inject,Injectable } from "@nestjs/common";
import { Cacheable } from "src/modules/shared/database";
import { UserStatus } from "src/modules/user/domain/model/user.model";
import {
USER_REPOSITORY,
type IUserRepository,
} from "src/modules/user/domain/repositories/user.repository.interface";
import { WorkflowFacade } from "src/modules/workflow/application/services/workflow-facade.service";
import { dtoToRecord,toTeamMemberDTO } from "../dto/public-dto.mapper";
import {
ContactFormDto,
DonationFormDto,
SignUpDto
} from "../dto/public.dto";

@Injectable()
export class PublicService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly workflowFacade: WorkflowFacade,
  ) {}

  @Cacheable({ key: "team-members", ttl: 10 * 24 * 3600 * 1000 })
  async getTeamMembers() {
    return (
      await this.userRepository.findAll({
        public: true,
        status: UserStatus.ACTIVE,
        includeLinks: true,
      })
    ).map(toTeamMemberDTO);
  }

  async contactUs(dto: ContactFormDto) {
    const workflow = await this.workflowFacade.createWorkflow({
      type: "CONTACT_REQUEST",
      data: dtoToRecord(dto),
      forExternalUser: true,
      externalUserEmail: dto.email,
    });
    return workflow.id;
  }

  async signUp(dto: SignUpDto) {
    const workflow = await this.workflowFacade.createWorkflow({
      type: "JOIN_REQUEST",
      data: dtoToRecord(dto),
      forExternalUser: true,
      externalUserEmail: dto.email,
    });
    return workflow.id;
  }

  async donate(dto: DonationFormDto) {
    const workflow = await this.workflowFacade.createWorkflow({
      type: "DONATION_REQUEST",
      data: dtoToRecord(dto),
      forExternalUser: true,
      externalUserEmail: dto.email,
    });

    return workflow.id;
  }
}
