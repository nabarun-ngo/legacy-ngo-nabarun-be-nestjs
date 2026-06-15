import { Address } from "../../domain/model/address.model";
import { Link } from "../../domain/model/link.model";
import { PhoneNumber } from "../../domain/model/phone-number.model";
import { Role } from "../../domain/model/role.model";
import { LoginMethod,User } from "../../domain/model/user.model";
import {
AddressDto,
LinkDto,
PhoneNumberDto,
RoleDto,
RoleHistoryDto,
UserDto,
} from "./user.dto";

export class UserDtoMapper {
  static toUserDTO(user: User): UserDto {
    return {
      id: user.id,
      fullName: user.fullName!,
      firstName: user.firstName!,
      lastName: user.lastName!,
      activeDonor: true,
      blocked: false,
      status: user.status,
      createdOn: user.createdAt,
      roles: user
        .getCurrentRoles()
        .filter((role) => role != null)
        .map((role) => UserDtoMapper.toRoleDTO(role)),
      roleHistory: UserDtoMapper.mapToRoleHistory(user.getRoleHistory()),
      loginMethod: user.loginMethod as LoginMethod[],
      email: user.email,
      primaryNumber: UserDtoMapper.toPhoneNumberDTO(user.primaryNumber!),
      userId: user.authUserId,
      about: user.about,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      middleName: user.middleName,
      permanentAddress: UserDtoMapper.toAddressDTO(user.permanentAddress!),
      addressSame: user.isSameAddress,
      picture: user.picture,
      presentAddress: UserDtoMapper.toAddressDTO(user.presentAddress!),
      secondaryNumber: UserDtoMapper.toPhoneNumberDTO(user.secondaryNumber!),
      //profileCompleted: user.isProfileCompleted,
      title: user.title,
      socialMediaLinks: user.socialMediaLinks.map((link) =>
        UserDtoMapper.toLinkDTO(link),
      ),
      publicProfile: user.isPublic,
    };
  }

  static toPhoneNumberDTO(
    phoneNumber: PhoneNumber,
  ): PhoneNumberDto | undefined {
    if (!phoneNumber) return undefined;
    return {
      code: phoneNumber.phoneCode,
      number: phoneNumber.phoneNumber,
      fullNumber: phoneNumber.fullNumber,
    };
  }

  static toAddressDTO(address: Address): AddressDto | undefined {
    if (!address) return undefined;
    return {
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      addressLine3: address.addressLine3,
      hometown: address.hometown,
      zipCode: address.zipCode,
      country: address.country,
      district: address.district,
      landmark: "",
      state: address.state,
    };
  }

  static toRoleDTO(role: Role): RoleDto {
    return {
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.authRoleCode,
    };
  }
  static toLinkDTO(link: Link): LinkDto {
    return {
      linkType: link.linkType,
      linkName: link.linkName,
      linkValue: link.linkValue,
    };
  }

  private static mapToRoleHistory(
    input: Record<string, Role[]>,
  ): RoleHistoryDto[] {
    const roleHistory: RoleHistoryDto[] = [];
    Object.entries(input).forEach(([key, roles], index) => {
      //if (index !== 0) {
      roleHistory.push({
        period: key,
        roleNames: roles.map((m) => m.roleName),
        roles: roles.map(UserDtoMapper.toRoleDTO),
      });
      // }
    });
    return roleHistory;
  }
}
