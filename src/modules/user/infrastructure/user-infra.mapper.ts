import { Prisma } from "@prisma/client";
import { CommonMappers } from "src/modules/shared/database/common-mappers";
import { MapperUtils } from "src/modules/shared/database/mapper-utils";
import { Address } from "../domain/model/address.model";
import { Link,LinkType } from "../domain/model/link.model";
import { PhoneNumber } from "../domain/model/phone-number.model";
import { Role } from "../domain/model/role.model";
import { LoginMethod,User,UserStatus } from "../domain/model/user.model";
import { Auth0User } from "./external/auth0-user.service";
import { UserPersistence } from "./types/user-persistence.types";
import { UserMapperHelpers } from "./user-mapper-helpers";

export class UserInfraMapper {
  /**
   * Converts a Prisma UserProfile persistence model to a User domain model
   * Fully type-safe with explicit type handling for optional relations
   * @param model - Prisma query result (can be Full, WithRoles, or WithAuth)
   * @returns User domain model or null if model is null
   */
  static toUserDomain(
    model:
      | UserPersistence.Full
      | UserPersistence.WithRoles
      | UserPersistence.WithAuth
      | null,
  ): User | null {
    if (!model) return null;

    // Use type-safe helpers to extract relations
    const { primary: primaryNumber, secondary: secondaryNumber } =
      UserMapperHelpers.extractPhoneNumbers(model);
    const { present: presentAddress, permanent: permanentAddress } =
      UserMapperHelpers.extractAddresses(model);
    const socialLinks = UserMapperHelpers.extractSocialLinks(model);
    const roles = UserMapperHelpers.extractRoles(model);
    return new User(
      model.id,
      model.firstName,
      model.lastName,
      model.email,
      primaryNumber
        ? new PhoneNumber(
            primaryNumber.id,
            primaryNumber.phoneCode ?? "",
            primaryNumber.phoneNumber ?? "",
            primaryNumber.hidden,
          )
        : undefined,
      model.status as UserStatus,
      model.isTemporary,
      MapperUtils.nullToUndefined(model.title),
      MapperUtils.nullToUndefined(model.middleName),
      MapperUtils.nullToUndefined(model.dateOfBirth),
      MapperUtils.nullToUndefined(model.gender),
      MapperUtils.nullToUndefined(model.about),
      MapperUtils.nullToUndefined(model.picture),
      MapperUtils.mapArray(
        roles,
        (r) =>
          new Role(
            r.id,
            r.roleCode,
            r.roleName,
            r.authRoleCode,
            MapperUtils.nullToUndefined(r.isDefault),
            MapperUtils.nullToUndefined(r.expireAt),
          ),
      ),
      secondaryNumber
        ? new PhoneNumber(
            secondaryNumber.id,
            secondaryNumber.phoneCode ?? "",
            secondaryNumber.phoneNumber ?? "",
            secondaryNumber.hidden,
          )
        : undefined,
      presentAddress
        ? new Address(
            presentAddress.id,
            presentAddress.addressLine1 ?? "",
            presentAddress.addressLine2 ?? "",
            presentAddress.addressLine3 ?? "",
            presentAddress.hometown ?? "",
            presentAddress.zipCode ?? "",
            presentAddress.state ?? "",
            presentAddress.district ?? "",
            presentAddress.country ?? "",
          )
        : undefined,
      permanentAddress
        ? new Address(
            permanentAddress.id,
            permanentAddress.addressLine1 ?? "",
            permanentAddress.addressLine2 ?? "",
            permanentAddress.addressLine3 ?? "",
            permanentAddress.hometown ?? "",
            permanentAddress.zipCode ?? "",
            permanentAddress.state ?? "",
            permanentAddress.district ?? "",
            permanentAddress.country ?? "",
          )
        : undefined,
      MapperUtils.withDefault(model.isPublic, true),
      MapperUtils.nullToUndefined(model.authUserId),
      MapperUtils.nullToUndefined(model.isSameAddress),
      model.loginMethods
        ? (CommonMappers.splitToArray(model.loginMethods) as LoginMethod[])
        : [LoginMethod.EMAIL, LoginMethod.PASSWORD],
      MapperUtils.mapArray(
        socialLinks,
        (l) => new Link(l.id, l.linkName, l.linkType as LinkType, l.linkValue),
      ),
      MapperUtils.nullToUndefined(model.donationPauseStart),
      MapperUtils.nullToUndefined(model.donationPauseEnd),
      MapperUtils.nullToUndefined(model.panNumber),
      MapperUtils.nullToUndefined(model.aadharNumber),
      MapperUtils.nullToUndefined(model.deletedAt) == undefined
        ? undefined
        : true,
      MapperUtils.nullToUndefined(Number(model.donationAmount)),
      model.createdAt,
      model.updatedAt,
    );
  }

  /**
   * Convert User domain model to Prisma create input
   * Fully type-safe conversion with explicit null handling
   */
  static toUserCreatePersistence(user: User): Prisma.UserProfileCreateInput {
    return {
      id: user.id,
      title: MapperUtils.undefinedToNull(user.title),
      firstName: user.firstName!,
      middleName: MapperUtils.undefinedToNull(user.middleName),
      lastName: user.lastName!,
      dateOfBirth: MapperUtils.undefinedToNull(user.dateOfBirth),
      gender: MapperUtils.undefinedToNull(user.gender),
      about: MapperUtils.undefinedToNull(user.about),
      picture: MapperUtils.undefinedToNull(user.picture),
      email: user.email,
      isPublic: MapperUtils.undefinedToNull(user.isPublic),
      authUserId: MapperUtils.undefinedToNull(user.authUserId),
      status: user.status,
      isTemporary: user.isTemporary,
      isSameAddress: MapperUtils.undefinedToNull(user.isSameAddress),
      loginMethods: CommonMappers.joinToString([...user.loginMethod]),
      panNumber: MapperUtils.undefinedToNull(user.panNumber),
      aadharNumber: MapperUtils.undefinedToNull(user.aadharNumber),
      donationPauseStart: MapperUtils.undefinedToNull(user.donationPauseStart),
      donationPauseEnd: MapperUtils.undefinedToNull(user.donationPauseEnd),
      donationAmount: MapperUtils.undefinedToNull(user.donationAmount),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.isDeleted ? new Date() : null,
    };
  }

  /**
   * Convert Role domain model to Prisma persistence format
   * Type-safe role mapping
   */
  static toRolePersistance(role: Role): {
    id: string;
    roleCode: string;
    roleName: string;
    authRoleCode: string;
    expireAt: Date | null;
    createdAt: Date;
  } {
    return {
      id: role.id,
      roleCode: role.roleCode,
      roleName: role.roleName,
      authRoleCode: role.authRoleCode,
      expireAt: MapperUtils.undefinedToNull(role.expireAt),
      createdAt: role.createdAt,
    };
  }

  static toAuthUser(a0User: Auth0User) {
    return new User(
      a0User.user_id!,
      a0User.given_name!,
      a0User.family_name!,
      a0User.email!,
      undefined,
      UserStatus.ACTIVE,
      false,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      a0User.user_id,
      undefined,
      a0User.identities?.map((i) => this.connection2LoginMethod(i.connection!)),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  }

  static loginMethod2Connection(method: LoginMethod): string {
    switch (method) {
      case LoginMethod.EMAIL:
        return "email";
      case LoginMethod.PASSWORD:
        return "Username-Password-Authentication";
      default:
        return "Username-Password-Authentication";
    }
  }
  static connection2LoginMethod(connection: string): LoginMethod {
    switch (connection) {
      case "email":
        return LoginMethod.EMAIL;
      case "Username-Password-Authentication":
        return LoginMethod.PASSWORD;
      default:
        return LoginMethod.PASSWORD;
    }
  }
}
