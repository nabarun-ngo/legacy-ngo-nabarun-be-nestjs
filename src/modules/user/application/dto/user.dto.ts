import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import { Transform,Type } from "class-transformer";
import {
IsArray,
IsBoolean,
IsDate,
IsEmail,
IsEnum,
IsNotEmpty,
IsObject,
IsOptional,
IsString,
MinLength,
ValidateNested,
} from "class-validator";
import { KeyValueDto } from "src/shared/dto/KeyValue.dto";
import { LinkType } from "../../domain/model/link.model";
import { LoginMethod,UserStatus } from "../../domain/model/user.model";

export class PhoneNumberDto {
  @IsString()
  @ApiProperty()
  code: string;

  @IsString()
  @ApiProperty()
  number: string;

  @IsOptional()
  @ApiPropertyOptional({ readOnly: true })
  fullNumber?: string;
}

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  addressLine1: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  addressLine3?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  landmark?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  hometown: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  zipCode: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  state: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  district: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  country: string;
}

export class LinkDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  linkName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ enum: LinkType })
  linkType: LinkType;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  linkValue: string;
}

export class RoleDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  roleCode: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  roleName: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description?: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @ApiProperty({ minLength: 2 })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @ApiProperty({ minLength: 2 })
  lastName: string;

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  email: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PhoneNumberDto)
  @ApiProperty({ type: () => PhoneNumberDto })
  phoneNumber: PhoneNumberDto;

  @IsBoolean()
  @ApiProperty()
  isTemporary: boolean;
}

export class UserUpdateDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  title?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  firstName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  middleName?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  lastName?: string;

  @IsOptional()
  @IsDate()
  @ApiPropertyOptional({ type: String, format: "date-time" })
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  gender?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  about?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  picture?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhoneNumberDto)
  @ApiPropertyOptional({ type: () => PhoneNumberDto })
  primaryNumber?: PhoneNumberDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhoneNumberDto)
  @ApiPropertyOptional({ type: () => PhoneNumberDto })
  secondaryNumber?: PhoneNumberDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  @ApiPropertyOptional({ type: () => AddressDto })
  presentAddress?: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  @ApiPropertyOptional({ type: () => AddressDto })
  permanentAddress?: AddressDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  @ApiPropertyOptional({ type: () => [LinkDto] })
  socialMediaLinks?: LinkDto[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isAddressSame?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  isPublicProfile?: boolean;
}

export class UserUpdateAdminDto {
  @IsOptional()
  @IsArray()
  @ApiPropertyOptional()
  @IsString({ each: true })
  roleCodes?: string[];

  @IsOptional()
  @IsEnum(UserStatus)
  @ApiPropertyOptional({ enum: UserStatus })
  status?: UserStatus;

  @ApiPropertyOptional({ enum: LoginMethod, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(LoginMethod, { each: true })
  loginMethods?: LoginMethod[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  aadharNumber?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  panNumber?: string;
}

export class UserFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  readonly firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  readonly lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  readonly email?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  readonly status?: UserStatus;

  @ApiPropertyOptional({ isArray: true, type: String })
  @IsOptional()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  @IsArray()
  readonly roleCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  readonly phoneNumber?: string;

  @ApiPropertyOptional({ enum: ["Y", "N"] })
  @IsOptional()
  @IsEnum(["Y", "N"])
  readonly public?: "Y" | "N";
}

export class RoleHistoryDto {
  @ApiProperty()
  period: string;
  @ApiProperty()
  roleNames: string[];
  @ApiProperty()
  roles: RoleDto[];
}

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  firstName: string;
  @ApiPropertyOptional()
  middleName?: string;
  @ApiProperty()
  lastName: string;
  @ApiPropertyOptional({ type: String, format: "date-time" })
  dateOfBirth?: Date;
  @ApiPropertyOptional()
  gender?: string;
  @ApiPropertyOptional()
  about?: string;
  @ApiPropertyOptional()
  picture?: string;
  @ApiProperty({ type: () => [RoleDto] })
  roles: RoleDto[];

  @ApiProperty({ type: () => [RoleHistoryDto] })
  roleHistory?: RoleHistoryDto[];
  @ApiProperty()
  email: string;
  @ApiPropertyOptional({ type: () => PhoneNumberDto })
  primaryNumber?: PhoneNumberDto;
  @ApiPropertyOptional({ type: () => PhoneNumberDto })
  secondaryNumber?: PhoneNumberDto;
  @ApiPropertyOptional({ type: () => AddressDto })
  presentAddress?: AddressDto;
  @ApiPropertyOptional({ type: () => AddressDto })
  permanentAddress?: AddressDto;
  @ApiProperty({ type: () => [LinkDto] })
  socialMediaLinks: LinkDto[];
  @ApiProperty({ type: String, format: "date-time" })
  createdOn: Date;
  @ApiProperty({ name: "activeDonor" })
  activeDonor: boolean;
  @ApiProperty({ name: "publicProfile" })
  publicProfile: boolean;
  @ApiPropertyOptional()
  userId?: string;
  @ApiProperty({ enum: UserStatus })
  status: UserStatus;
  @ApiProperty({ type: () => [String] })
  loginMethod: LoginMethod[];
  @ApiPropertyOptional({ name: "addressSame" })
  addressSame?: boolean;
  //@ApiProperty()
  //profileCompleted: boolean;
  @ApiProperty()
  blocked: boolean;
}

export class UserRefDataDto {
  @ApiProperty()
  documents?: KeyValueDto[];
  @ApiProperty()
  userStatuses?: KeyValueDto[];
  @ApiProperty()
  loginMethods?: KeyValueDto[];
  @ApiProperty()
  userGenders?: KeyValueDto[];
  @ApiProperty()
  availableRoles?: KeyValueDto[];
  @ApiProperty()
  userTitles?: KeyValueDto[];
  @ApiProperty()
  countries?: KeyValueDto[];
  @ApiProperty()
  states?: KeyValueDto[];
  @ApiProperty()
  districts?: KeyValueDto[];
  @ApiProperty()
  phoneCodes?: KeyValueDto[];

  @ApiProperty()
  maxUserPerRole?: KeyValueDto[];
  @ApiProperty()
  minUserPerRole?: KeyValueDto[];
  @ApiProperty()
  documentTypes?: KeyValueDto[];
}

export class UserRefDataFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  stateCode?: string;
}

export class UserMetricsDto {
  @ApiProperty()
  pendingDonations: number;
  @ApiProperty()
  unsettledExpense: number;
  @ApiProperty()
  pendingTask: number;
  @ApiProperty()
  walletBalance: number;
}
