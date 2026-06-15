import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { USER_REPOSITORY } from "../../domain/repositories/user.repository.interface";
import { Auth0UserService } from "../../infrastructure/external/auth0-user.service";

@Injectable()
export class DeleteUserUseCase implements IUseCase<string, void> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auth0User: Auth0UserService,
  ) {}

  async execute(userId: string): Promise<void> {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new BusinessException("User with this id does not exist");
    }

    await this.auth0User.deleteUser(existingUser.authUserId!);

    // Save to repository
    await this.userRepository.updateRoles(existingUser.id, []);
    existingUser.delete();
    await this.userRepository.update(existingUser.id, existingUser);

    // Emit domain events
    for (const event of existingUser.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    existingUser.clearEvents();
  }
}
