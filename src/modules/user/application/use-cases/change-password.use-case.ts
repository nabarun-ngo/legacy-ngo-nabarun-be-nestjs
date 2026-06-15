import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import {
type IUserRepository,
USER_REPOSITORY,
} from "../../domain/repositories/user.repository.interface";
import { Auth0UserService } from "../../infrastructure/external/auth0-user.service";

@Injectable()
export class ChangePasswordUseCase implements IUseCase<{ id: string }, void> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly auth0Service: Auth0UserService,
  ) {}

  async execute(props: { id: string }): Promise<void> {
    const user = await this.userRepository.findById(props.id);
    if (!user) {
      throw new BusinessException("User not found with id " + props.id);
    }
    await this.auth0Service.sendPasswordChangeEmail(user.email);
  }
}
