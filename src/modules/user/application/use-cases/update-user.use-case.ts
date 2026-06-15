import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import {
User,
UserAttributesProps,
UserProfileProps,
} from "../../domain/model/user.model";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { USER_REPOSITORY } from "../../domain/repositories/user.repository.interface";
import { Auth0UserService } from "../../infrastructure/external/auth0-user.service";

class CreateUserProps {
  id: string;
  mode: "admin" | "self";
  profile?: UserProfileProps;
  detail?: UserAttributesProps;
}

@Injectable()
export class UpdateUserUseCase implements IUseCase<CreateUserProps, User> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auth0User: Auth0UserService,
  ) {}

  async execute(request: CreateUserProps): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(request.id);
    if (!existingUser) {
      throw new BusinessException("User not exists with id " + request.id);
    }

    if (request.mode === "admin") {
      existingUser.updateAdmin(request.detail!);
      const toAdd = existingUser.addLoginMethod(request.detail?.loginMethods);
      if (toAdd.length > 0) {
        await this.auth0User.addLoginMethods(existingUser, toAdd);
      }
    } else if (request.mode === "self") {
      existingUser.updateUser(request.profile!);
    }
    // Save to repository
    const savedUser = await this.userRepository.update(
      existingUser.id,
      existingUser,
    );

    if (existingUser.updateAuth) {
      await this.auth0User.updateUser(existingUser.authUserId!, existingUser);
    }

    // Emit domain events
    for (const event of existingUser.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    existingUser.clearEvents();

    return savedUser;
  }
}
