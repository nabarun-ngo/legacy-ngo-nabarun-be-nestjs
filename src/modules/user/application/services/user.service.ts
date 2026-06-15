import { Inject,Injectable } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { toKeyValueDto } from "src/shared/utilities/kv-config.util";
import { Address } from "../../domain/model/address.model";
import { Link } from "../../domain/model/link.model";
import { PhoneNumber } from "../../domain/model/phone-number.model";
import { Role } from "../../domain/model/role.model";
import { UserFilterProps } from "../../domain/model/user.model";
import type { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { USER_REPOSITORY } from "../../domain/repositories/user.repository.interface";
import { UserMetadataService } from "../../infrastructure/external/user-metadata.service";
import { UserDtoMapper } from "../dto/user-dto.mapper";
import {
CreateUserDto,
UserDto,
UserFilterDto,
UserMetricsDto,
UserRefDataDto,
UserRefDataFilterDto,
UserUpdateAdminDto,
UserUpdateDto,
} from "../dto/user.dto";
import { AssignRoleUseCase } from "../use-cases/assign-role.use-case";
import { ChangePasswordUseCase } from "../use-cases/change-password.use-case";
import { CreateUserUseCase } from "../use-cases/create-user.use-case";
import { UpdateUserUseCase } from "../use-cases/update-user.use-case";

@Injectable()
export class UserService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly createUseCase: CreateUserUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly updateUseCase: UpdateUserUseCase,
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly metadataService: UserMetadataService,
  ) {}

  async list(
    filterDto: BaseFilter<UserFilterDto>,
  ): Promise<PagedResult<UserDto>> {
    const filter: BaseFilter<UserFilterProps> = {
      pageIndex: filterDto.pageIndex,
      pageSize: filterDto.pageSize,
      props: {
        email: filterDto.props?.email,
        status: filterDto.props?.status,
        firstName: filterDto.props?.firstName,
        lastName: filterDto.props?.lastName,
        roleCodes: filterDto.props?.roleCodes,
        phoneNumber: filterDto.props?.phoneNumber,
        public: filterDto.props?.public
          ? filterDto.props?.public === "Y"
          : undefined,
      },
    };
    const users = await this.userRepository.findPaged(filter);
    return new PagedResult(
      users.content.map(UserDtoMapper.toUserDTO),
      users.totalSize,
      users.pageIndex,
      users.pageSize,
    );
  }

  async getById(id: string): Promise<UserDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new BusinessException("User not found with id " + id);
    }
    return UserDtoMapper.toUserDTO(user);
  }

  async create(request: CreateUserDto): Promise<UserDto> {
    const newUser = await this.createUseCase.execute(request);
    return UserDtoMapper.toUserDTO(newUser);
  }

  async updateUser(id: string, command: UserUpdateAdminDto): Promise<UserDto> {
    if (command.roleCodes && command.roleCodes?.length > 0) {
      await this.assignRole(id, command.roleCodes);
    }
    const updatedUser = await this.updateUseCase.execute({
      id: id,
      mode: "admin",
      detail: {
        status: command.status,
        loginMethods: command.loginMethods,
        aadharNumber: command.aadharNumber,
        panNumber: command.panNumber,
      },
    });
    return UserDtoMapper.toUserDTO(updatedUser);
  }
  async updateProfile(id: string, command: UserUpdateDto): Promise<UserDto> {
    const updatedUser = await this.updateUseCase.execute({
      id: id,
      mode: "self",
      profile: {
        title: command.title,
        firstName: command.firstName,
        about: command.about,
        middleName: command.middleName,
        lastName: command.lastName,
        dateOfBirth: command.dateOfBirth,
        gender: command.gender,
        picture: command.picture,
        primaryNumber: command.primaryNumber
          ? new PhoneNumber(
              "",
              command.primaryNumber.code,
              command.primaryNumber.number,
            )
          : undefined,
        secondaryNumber: command.secondaryNumber
          ? new PhoneNumber(
              "",
              command.secondaryNumber.code,
              command.secondaryNumber.number,
            )
          : undefined,
        isAddressSame: command.isAddressSame,
        isPublicProfile: command.isPublicProfile,
        permanentAddress: command.permanentAddress
          ? new Address(
              "",
              command.permanentAddress.addressLine1,
              command.permanentAddress.addressLine2,
              command.permanentAddress.addressLine3,
              command.permanentAddress.hometown,
              command.permanentAddress.zipCode,
              command.permanentAddress.state,
              command.permanentAddress.district,
              command.permanentAddress.country,
            )
          : undefined,
        presentAddress: command.presentAddress
          ? new Address(
              "",
              command.presentAddress.addressLine1,
              command.presentAddress.addressLine2,
              command.presentAddress.addressLine3,
              command.presentAddress.hometown,
              command.presentAddress.zipCode,
              command.presentAddress.state,
              command.presentAddress.district,
              command.presentAddress.country,
            )
          : undefined,
        socialMediaLinks: command.socialMediaLinks
          ? command.socialMediaLinks.map(
              (l) => new Link("", l.linkName, l.linkType, l.linkValue),
            )
          : [],
      },
    });
    return UserDtoMapper.toUserDTO(updatedUser);
  }

  async assignRole(userId: string, roleCodes: string[]): Promise<void> {
    const roles = roleCodes.map((code) => new Role("", code, "", ""));
    await this.assignRoleUseCase.execute({
      userId: userId,
      newRoles: roles,
    });
  }

  async assignRoleToUser(roleCode: string, userIds: string[]) {
    for (const userId of userIds) {
      await this.assignRole(userId, [roleCode]);
    }
  }

  async getUserMetrics(id: string): Promise<UserMetricsDto> {
    return await this.userRepository.findUserMetrics(id);
  }

  async initPasswordChange(id: string): Promise<void> {
    await this.changePasswordUseCase.execute({ id });
  }

  async getReferenceData(
    filter?: UserRefDataFilterDto,
  ): Promise<UserRefDataDto> {
    const data = await this.metadataService.getReferenceData();
    return {
      documentTypes: data.document_types.map(toKeyValueDto),
      userStatuses: data.status.map(toKeyValueDto),
      loginMethods: data.loginMethods.map(toKeyValueDto),
      userGenders: data.userGenders.map(toKeyValueDto),
      availableRoles: data.availableRoles.map(toKeyValueDto),
      maxUserPerRole: data.maxUserPerRole.map(toKeyValueDto),
      minUserPerRole: data.minUserPerRole.map(toKeyValueDto),
      userTitles: data.userTitles.map(toKeyValueDto),
      countries: data.countryData.map(toKeyValueDto),
      states: (filter?.countryCode
        ? await this.metadataService.getStates(filter.countryCode)
        : data.stateData
      ).map(toKeyValueDto),
      districts: (filter?.countryCode && filter.stateCode
        ? await this.metadataService.getDistricts(
            filter.countryCode,
            filter.stateCode,
          )
        : data.districtData
      ).map(toKeyValueDto),
      phoneCodes: data.dialCodes.map(toKeyValueDto),
    };
  }
}
