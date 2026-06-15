import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "../../../../shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { PhoneNumber } from "../../domain/model/phone-number.model";
import { User,UserStatus } from "../../domain/model/user.model";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { USER_REPOSITORY } from "../../domain/repositories/user.repository.interface";
import { Auth0UserService } from "../../infrastructure/external/auth0-user.service";

class CreateUserProps {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: {
    code: string;
    number: string;
  };
  isTemporary: boolean;
}

@Injectable()
export class CreateUserUseCase implements IUseCase<CreateUserProps, User> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly auth0User: Auth0UserService,
  ) {}

  async execute(request: CreateUserProps): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser && !existingUser.isDeleted) {
      throw new BusinessException("User with this email already exists");
    }

    // Create domain entity
    const user = User.create(
      {
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        number: PhoneNumber.create(
          request.phoneNumber.code,
          request.phoneNumber.number,
        ),
        isTemporary: request.isTemporary || false,
      },
      existingUser,
    );

    user.changeStatus(UserStatus.ACTIVE);
    const auth0User = await this.auth0User.createUser(user, false);

    user.updateAdmin({
      userId: auth0User.id,
    });

    // Save to repository
    const savedUser = existingUser
      ? await this.userRepository.update(user.id, user)
      : await this.userRepository.create(user);

    // Emit domain events
    for (const event of user.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    user.clearEvents();

    return savedUser;
  }
}
