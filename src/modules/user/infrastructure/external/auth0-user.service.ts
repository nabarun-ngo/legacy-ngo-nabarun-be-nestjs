import { Inject,Injectable,Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthenticationClient,ManagementClient } from "auth0";
import {
AUTH0_OAUTH_SERVICE,
OAuthService,
} from "src/modules/shared/auth/application/services";
import { Cacheable } from "src/modules/shared/database";
import { Configkey } from "src/shared/config-keys";
import { ThirdPartyException } from "../../../../shared/exceptions/third-party-exception";
import { Role } from "../../domain/model/role.model";
import { LoginMethod,User,UserStatus } from "../../domain/model/user.model";
import { UserInfraMapper } from "../user-infra.mapper";

export type Auth0User = Awaited<ReturnType<ManagementClient["users"]["get"]>>;
export type Auth0Role = Awaited<ReturnType<ManagementClient["roles"]["get"]>>;

@Injectable()
export class Auth0UserService {
  private readonly scope = "management";

  private readonly logger = new Logger(Auth0UserService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(AUTH0_OAUTH_SERVICE) private auth0OAuthService: OAuthService,
  ) {}

  async getUserByEmail(email: string): Promise<User[]> {
    try {
      const managementClient =
        await this.auth0OAuthService.getAuthenticatedClient(this.scope);

      const users: Auth0User[] = await managementClient.users.listUsersByEmail({
        email: email,
      });
      return users.map((user) => UserInfraMapper.toAuthUser(user));
    } catch (e) {
      this.logger.error(`Failed to get user by email ${email}: ${e}`);
      throw new ThirdPartyException("auth0", e as Error);
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const managementClient =
        await this.auth0OAuthService.getAuthenticatedClient(this.scope);
      const users: Auth0User[] = (await managementClient.users.list()).data;
      return users.map((user) => UserInfraMapper.toAuthUser(user));
    } catch (e) {
      this.logger.error(`Failed to get users: ${e}`);
      throw new ThirdPartyException("auth0", e as Error);
    }
  }

  async getUser(id: string): Promise<User> {
    try {
      const managementClient =
        await this.auth0OAuthService.getAuthenticatedClient(this.scope);
      const user = await managementClient.users.get(id);
      return UserInfraMapper.toAuthUser(user);
    } catch (e) {
      this.logger.error(`Failed to get user ${id}: ${e}`);
      throw new ThirdPartyException("auth0", e as Error);
    }
  }

  async createUser(newUser: User, emailVerified: boolean): Promise<User> {
    try {
      for (const lm of newUser.loginMethod) {
        await this.createUserForLogin(newUser, lm, emailVerified);
      }

      return await this.linkAllAccountsForUser(newUser.email);
    } catch (e) {
      this.logger.error(`Error creating Auth0 user:`, e);
      throw new ThirdPartyException("auth0", e as Error);
    }
  }
  private async createUserForLogin(
    newUser: User,
    lm: LoginMethod,
    emailVerified: boolean,
  ) {
    const managementClient =
      await this.auth0OAuthService.getAuthenticatedClient(this.scope);

    await managementClient.users.create({
      email: newUser.email,
      connection: UserInfraMapper.loginMethod2Connection(lm),
      given_name: newUser.firstName,
      family_name: newUser.lastName,
      name: newUser.fullName,
      picture: newUser.picture,
      user_metadata: {
        profile_id: newUser.id,
        active_user: newUser.status == UserStatus.ACTIVE,
        //reset_password:  ? true : false,
        ...(lm == LoginMethod.PASSWORD ? { reset_password: true } : {}),
        profile_updated: newUser.isProfileCompleted,
      },
      password: lm == LoginMethod.PASSWORD ? newUser.password! : undefined,
      email_verified: emailVerified,
    });
  }

  async linkAllAccountsForUser(email: string): Promise<User> {
    const managementClient =
      await this.auth0OAuthService.getAuthenticatedClient(this.scope);

    const users = await managementClient.users.listUsersByEmail({
      email: email.toLowerCase(),
    });

    if (users.length > 0 && users.length == 1) {
      return UserInfraMapper.toAuthUser(users[0]);
    }

    const primary = users[0];
    const primaryId = primary.user_id!;
    const mergedMetadata: Record<string, unknown> = {
      ...(primary.user_metadata ?? {}),
    };

    for (let i = 1; i < users.length; i++) {
      const secondary = users[i];
      const secondaryId = secondary.user_id!;
      const provider = secondary.identities?.[0]?.provider;
      if (!provider) continue;

      Object.assign(mergedMetadata, secondary.user_metadata ?? {});
      await managementClient.users.identities.link(primaryId, {
        user_id: secondaryId,
        provider,
      });
    }

    const updated = await managementClient.users.update(primaryId, {
      user_metadata: mergedMetadata,
    });
    this.logger.log(
      `Linked ${users.length} Auth0 identities for user ${email}`,
    );
    return UserInfraMapper.toAuthUser(updated);
  }

  async updateUser(
    id: string,
    user: Partial<User>,
    password?: string,
  ): Promise<User> {
    try {
      const managementClient =
        await this.auth0OAuthService.getAuthenticatedClient(this.scope);
      const response = await managementClient.users.update(id, {
        email: user.email,
        given_name: user.firstName,
        family_name: user.lastName,
        name: user.fullName,
        picture: user.picture,
        blocked: user.status == UserStatus.BLOCKED,
        password: user.updateAuth ? password : undefined,
        user_metadata: {
          profile_id: user.id,
          active_user: user.status == UserStatus.ACTIVE,
          //reset_password: true,
          profile_updated: user.isProfileCompleted,
        },
      });
      return response.data;
    } catch (e) {
      this.logger.error(`Failed to update user ${id}: ${e.message}`, e.stack);
      throw new ThirdPartyException("auth0", e);
    }
  }

  async sendPasswordChangeEmail(email: string) {
    try {
      const authClient = new AuthenticationClient({
        domain: this.configService.get(Configkey.AUTH0_DOMAIN)!,
        clientId: this.configService.get(Configkey.AUTH0_MANAGEMENT_CLIENT_ID)!,
      });
      await authClient.database.changePassword({
        connection: "Username-Password-Authentication",
        email: email,
      });
    } catch (e) {
      this.logger.error(
        `Failed to send password change email to user ${email}: ${e.message}`,
        e.stack,
      );
      throw new ThirdPartyException("auth0", e);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const managementClient =
        await this.auth0OAuthService.getAuthenticatedClient(this.scope);
      await managementClient.users.delete(id);
    } catch (e) {
      this.logger.error(`Failed to delete user ${id}: ${e.message}`, e.stack);
      throw new ThirdPartyException("auth0", e);
    }
  }

  async assignRolesToUser(userId: string, roleIds: string[]): Promise<void> {
    try {
      const managementClient =
        await this.auth0OAuthService.getAuthenticatedClient(this.scope);
      await managementClient.users.roles.assign(userId, {
        roles: roleIds,
      });
      this.logger.log(`Assigned roles ${roleIds} to user ${userId}`);
    } catch (e) {
      this.logger.error(
        `Failed to assign roles to user ${userId}: ${e.message}`,
        e.stack,
      );
      throw new ThirdPartyException("auth0", e);
    }
  }

  async removeRolesFromUser(userId: string, roleIds: string[]): Promise<void> {
    try {
      const managementClient =
        await this.auth0OAuthService.getAuthenticatedClient(this.scope);
      await managementClient.users.roles.delete(userId, { roles: roleIds });
    } catch (e) {
      this.logger.error(
        `Failed to remove roles from user ${userId}: ${e.message}`,
        e.stack,
      );
      throw new ThirdPartyException("auth0", e);
    }
  }

  async assignUsersToRole(roleId: string, userIds: string[]): Promise<void> {
    try {
      const managementClient =
        await this.auth0OAuthService.getAuthenticatedClient(this.scope);
      await managementClient.roles.users.assign(roleId, { users: userIds });
    } catch (e) {
      this.logger.error(
        `Failed to assign users to role ${roleId}: ${e.message}`,
        e.stack,
      );
      throw new ThirdPartyException("auth0", e);
    }
  }

  @Cacheable({ key: "ALL_ROLES", ttl: 90 * 24 * 3600 * 1000 })
  async getRoles(): Promise<Role[]> {
    const managementClient =
      await this.auth0OAuthService.getAuthenticatedClient(this.scope);
    const allRoles = (await managementClient.roles.list()).data;
    try {
      return allRoles.map((role) => {
        return new Role(role.id, role.name, role.description, role.name);
      });
    } catch (e) {
      this.logger.error(`Failed to get roles: ${e.message}`, e.stack);
      throw new ThirdPartyException("auth0", e);
    }
  }

  async addLoginMethods(user: User, toAdd: LoginMethod[]) {
    if (toAdd) {
      for (const lm of toAdd) {
        await this.createUserForLogin(user, lm, true);
      }
      await this.linkAllAccountsForUser(user.email);
    }
  }

  // async loginWithUser(options: LoginWithPasswordOptions) {
  //   try {
  //     const response =
  //       await this.authenticationClient.passwordless.signIn(options);
  //     return response.data;
  //   } catch (e) {
  //     this.logger.error(`Failed to login user: ${e.message}`, e.stack);
  //     throw new ThirdPartyException('Could not login user.', e);
  //   }
  // }

  // async getScopes(identifier: string): Promise<Scope[]> {
  //   try {
  //     // The Node SDK doesn't have a direct `getByAudience` method.
  //     // We list all and find the one we need.
  //     const response = await this.managementClient.resourceServers.getAll();
  //     const resourceServer = response.data.find(
  //       (rs) => rs.identifier === identifier,
  //     );
  //     if (!resourceServer) {
  //       throw new Error(
  //         `Resource server with identifier ${identifier} not found.`,
  //       );
  //     }
  //     return resourceServer.scopes;
  //   } catch (e) {
  //     this.logger.error(
  //       `Failed to get scopes for ${identifier}: ${e.message}`,
  //       e.stack,
  //     );
  //     throw new ThirdPartyException('Could not fetch scopes.', e);
  //   }
  // }
}
