import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { IUseCase } from "../../../../shared/interfaces/use-case.interface";
import { Role } from "../../domain/model/role.model";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { USER_REPOSITORY } from "../../domain/repositories/user.repository.interface";
import { Auth0UserService } from "../../infrastructure/external/auth0-user.service";
import { UserMetadataService } from "../../infrastructure/external/user-metadata.service";

class AssignUserRolesProps {
  userId: string;
  newRoles: Role[];
}

@Injectable()
export class AssignRoleUseCase implements IUseCase<AssignUserRolesProps, void> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly metadataService: UserMetadataService,
    private readonly auth0UserService: Auth0UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(request: AssignUserRolesProps): Promise<void> {
    const user = await this.userRepository.findById(request.userId);
    if (!user) {
      throw new BusinessException(`User with id ${request.userId} not found`);
    }
    const allRoleList = await this.metadataService.getAllRoles();
    const defaultRole = allRoleList.filter((f) => f.isDefault);
    const allRoleMap = allRoleList.reduce(
      (acc, role) => {
        acc[role.roleCode] = role;
        return acc;
      },
      {} as Record<string, Role>,
    );

    const allAuth0Roles = (await this.auth0UserService.getRoles()).reduce(
      (acc, role) => {
        acc[role.authRoleCode] = role.id;
        return acc;
      },
      {} as Record<string, string>,
    );

    const newRoles = request.newRoles.map((role) => allRoleMap[role.roleCode]);
    const { toAdd, toRemove } = user?.updateRoles(newRoles, defaultRole);
    const roleIdsToAdd = toAdd?.map((role) => allAuth0Roles[role.authRoleCode]);
    const roleIdsToRemove = toRemove?.map(
      (role) => allAuth0Roles[role.authRoleCode],
    );

    if (roleIdsToAdd?.length > 0) {
      await this.auth0UserService.assignRolesToUser(
        user.authUserId!,
        roleIdsToAdd,
      );
    }

    if (roleIdsToRemove?.length > 0) {
      await this.auth0UserService.removeRolesFromUser(
        user.authUserId!,
        roleIdsToRemove,
      );
    }

    if (roleIdsToAdd?.length > 0 || roleIdsToRemove?.length > 0) {
      await this.userRepository.updateRoles(
        user?.id,
        user.getCurrentRoles() as Role[],
      );
    }

    // Emit domain events
    for (const event of user.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    user.clearEvents();
  }
}
