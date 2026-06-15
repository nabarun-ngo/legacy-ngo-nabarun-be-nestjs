import { randomUUID } from "crypto";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { AggregateRoot } from "../../../../shared/models/aggregate-root";
import { generatePassword } from "../../../../shared/utilities/password-util";
import { RoleAssignedEvent } from "../events/role-assigned.event";
import { UserCreatedEvent } from "../events/user-created.event";
import { UserDeletedEvent } from "../events/user-deleted.event";
import { Address } from "./address.model";
import { Link } from "./link.model";
import { PhoneNumber } from "./phone-number.model";
import { Role } from "./role.model";

export enum UserStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  BLOCKED = "BLOCKED",
  DELETED = "DELETED",
}
export enum LoginMethod {
  EMAIL = "EMAIL",
  PASSWORD = "PASSWORD",
}

export class UserFilterProps {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly email?: string;
  readonly status?: UserStatus;
  readonly roleCodes?: string[];
  readonly phoneNumber?: string;
  readonly public?: boolean;
  readonly includeLinks?: boolean;
}

export class UserProfileProps {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: string;
  about?: string;
  picture?: string;
  primaryNumber?: PhoneNumber;
  secondaryNumber?: PhoneNumber;
  presentAddress?: Address;
  permanentAddress?: Address;
  isAddressSame?: boolean;
  isPublicProfile?: boolean;
  socialMediaLinks?: Link[];
}

export class UserAttributesProps {
  status?: UserStatus;
  userId?: string;
  loginMethods?: LoginMethod[];
  aadharNumber?: string;
  panNumber?: string;
  donationAmount?: number;
  donationPauseStart?: Date;
  donationPauseEnd?: Date;
}

export class User extends AggregateRoot<string> {
  // ---- grouped true private fields (#...) ----
  #updateAuth: boolean = false;
  #password?: string;

  #fullName?: string;
  #initials?: string;
  #firstName?: string;
  #lastName?: string;
  #email!: string;
  #primaryNumber?: PhoneNumber;
  #status!: UserStatus;
  #isTemporary!: boolean;
  #title?: string;
  #middleName?: string;
  #dateOfBirth?: Date;
  #gender?: string;
  #about?: string;
  #picture?: string;
  #roles!: Role[];
  #secondaryNumber?: PhoneNumber;
  #presentAddress?: Address;
  #permanentAddress?: Address;
  #isPublic!: boolean;
  #authUserId?: string;
  #isSameAddress?: boolean;
  #loginMethod!: LoginMethod[];
  #socialMediaLinks!: Link[];
  #donationPauseStart?: Date;
  #donationPauseEnd?: Date;
  #panNumber?: string;
  #aadharNumber?: string;
  #isProfileCompleted!: boolean;
  #isDeleted?: boolean;
  #donationAmount?: number;

  // ---- Factory
  public static create(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      number: PhoneNumber;
      isTemporary: boolean;
    },
    existingUser?: User | null,
  ): User {
    if (!data.firstName || !data.lastName || !data.email || !data.number) {
      throw new BusinessException(
        "firstName, lastName, phoneNumber and email are required",
      );
    }
    const user = new User(
      existingUser?.id ?? randomUUID(),
      data.firstName,
      data.lastName,
      data.email,
      data.number,
      UserStatus.DRAFT,
      data.isTemporary,
      existingUser?.title,
      existingUser?.middleName,
      existingUser?.dateOfBirth,
      existingUser?.gender,
      existingUser?.about,
      existingUser?.picture,
      undefined,
      existingUser?.secondaryNumber,
      existingUser?.presentAddress,
      existingUser?.permanentAddress,
      existingUser?.isPublic,
      undefined,
      existingUser?.isSameAddress,
      undefined,
      existingUser?.socialMediaLinks as Link[],
      existingUser?.donationPauseStart,
      existingUser?.donationPauseEnd,
      existingUser?.panNumber,
      existingUser?.aadharNumber,
      false,
      existingUser?.donationAmount,
    );
    user.createPassword();
    user.addDomainEvent(new UserCreatedEvent(user.id, user));
    return user;
  }

  private createPassword() {
    this.#password = generatePassword({ length: 12 });
  }

  // ---- Domain behaviors (helpers) ----
  private computeFullName(): string | undefined {
    if (!this.firstName || !this.lastName) return undefined;
    const f = this.firstName ?? "";
    const l = this.lastName ?? "";
    return (f + " " + l).trim();
  }

  private computeInitials(): string {
    if (!this.firstName || !this.lastName) return "";
    return (this.firstName[0] + this.lastName[0]).toUpperCase();
  }

  private generatePictureUrl() {
    // note: this mirrors original behavior (may run before names assigned)
    return `https://ui-avatars.com/api/?name=${this.firstName}+${this.lastName}&background=random`.replace(
      /\s+/g,
      "",
    );
  }

  public updateUser(detail: UserProfileProps): void {
    this.#title = detail.title ?? this.#title;
    this.#firstName = detail.firstName ?? this.firstName;
    this.#middleName = detail.middleName ?? this.#middleName;
    this.#lastName = detail.lastName ?? this.#lastName;
    this.#fullName = this.computeFullName();
    this.#dateOfBirth = detail.dateOfBirth ?? this.#dateOfBirth;
    this.#gender = detail.gender ?? this.#gender;
    this.#about = detail.about ?? this.#about;

    if (detail.primaryNumber) {
      this.#primaryNumber =
        this.#primaryNumber?.update(detail.primaryNumber) ??
        PhoneNumber.create(
          detail.primaryNumber.phoneCode,
          detail.primaryNumber.phoneNumber,
        );
    }

    if (detail.secondaryNumber) {
      this.#secondaryNumber =
        this.secondaryNumber?.update(detail.secondaryNumber) ??
        PhoneNumber.create(
          detail.secondaryNumber.phoneCode,
          detail.secondaryNumber.phoneNumber,
        );
    }

    if (detail.presentAddress) {
      const address = detail.presentAddress;
      this.#presentAddress =
        this.#presentAddress?.update(detail.presentAddress) ??
        Address.create(
          address.addressLine1,
          address.addressLine2,
          address.addressLine3,
          address.hometown,
          address.zipCode,
          address.state,
          address.district,
          address.country,
        );
    }
    if (detail.permanentAddress) {
      const address = detail.permanentAddress;
      this.#permanentAddress =
        this.#permanentAddress?.update(detail.permanentAddress) ??
        Address.create(
          address.addressLine1,
          address.addressLine2,
          address.addressLine3,
          address.hometown,
          address.zipCode,
          address.state,
          address.district,
          address.country,
        );
    }

    this.#isSameAddress = detail.isAddressSame ?? this.#isSameAddress;
    this.#isPublic = detail.isPublicProfile ?? this.#isPublic;

    if (detail.socialMediaLinks && detail.socialMediaLinks.length > 0) {
      detail.socialMediaLinks.forEach((link) => {
        const existing = this.#socialMediaLinks.find(
          (f) => f.linkType === link.linkType,
        );
        if (existing) {
          existing.update(link);
        } else {
          this.#socialMediaLinks.push(
            Link.create(link.linkName, link.linkType, link.linkValue),
          );
        }
      });
    }

    this.#isProfileCompleted = this.checkComplteness();
    this.#fullName = this.computeFullName();
    this.#initials = this.computeInitials();
    this.#picture =
      detail.picture ?? this.#picture ?? this.generatePictureUrl();
    this.#updateAuth =
      detail.firstName !== undefined ||
      detail.lastName !== undefined ||
      detail.picture !== undefined ||
      this.#isProfileCompleted;
    this.touch();
  }
  private checkComplteness(): boolean {
    return !!(
      this.firstName &&
      this.lastName &&
      this.#dateOfBirth &&
      this.#gender &&
      this.#email &&
      this.#authUserId
    );
  }

  public updateAdmin(detail: UserAttributesProps): void {
    this.#status = detail.status ?? this.#status;
    this.#authUserId = detail.userId ?? this.#authUserId;
    this.#updateAuth =
      detail.userId !== undefined || this.#status !== undefined;
    this.#donationAmount = detail.donationAmount ?? this.#donationAmount;
    this.#aadharNumber = detail.aadharNumber ?? this.#aadharNumber;
    this.#panNumber = detail.panNumber ?? this.#panNumber;
    this.#donationPauseStart =
      detail.donationPauseStart ?? this.#donationPauseStart;
    this.#donationPauseEnd = detail.donationPauseEnd ?? this.#donationPauseEnd;
    this.touch();
  }

  public addLoginMethod(newMethods?: LoginMethod[]): LoginMethod[] {
    if (!newMethods) {
      return [];
    }
    const toAdd: LoginMethod[] = [];
    for (const newMethod of newMethods) {
      if (!this.#loginMethod.includes(newMethod)) {
        this.#loginMethod.push(newMethod);
        toAdd.push(newMethod);
      }
    }
    return toAdd;
  }

  public updateRoles(
    newRoles: Role[],
    defaultRoles: Role[],
  ): { toAdd: Role[]; toRemove: Role[] } {
    const activeRoles = this.#roles.filter((r) => !r.expireAt);
    const currentRoles = activeRoles ? [...activeRoles] : [];
    const incomingRoles = newRoles ? [...newRoles] : [];

    // Ensure default roles are always present
    defaultRoles?.forEach((dr) => {
      if (!incomingRoles.some((r) => r.roleCode === dr.roleCode)) {
        incomingRoles.push(
          Role.create(dr.roleCode, dr.roleName, dr.authRoleCode, true),
        );
      }
    });

    const toAdd = incomingRoles.filter(
      (r) => !currentRoles.some((cr) => cr.roleCode === r.roleCode),
    );
    const toRemove = currentRoles
      .filter(
        (r) =>
          !incomingRoles.some((ir) => ir.roleCode === r.roleCode) &&
          !defaultRoles.some((dr) => dr.roleCode === r.roleCode),
      )
      .filter((r) => !r.isDefault);

    // Expire existing active roles
    this.#roles.forEach((role) => {
      if (!role.expireAt) role.expire();
    });

    incomingRoles.forEach((role) => {
      this.#roles.push(
        Role.create(role.roleCode, role.roleName, role.authRoleCode),
      );
    });

    if (toAdd.length > 0 || toRemove.length > 0) {
      this.addDomainEvent(
        new RoleAssignedEvent(this.id, this, toAdd, toRemove),
      );
    }
    return { toAdd, toRemove };
  }

  public changeStatus(newStatus: UserStatus): void {
    if (newStatus) {
      this.#status = newStatus;
      this.#updateAuth = true;
      this.touch();
    }
  }

  // Getters (read-only views)
  public getCurrentRoles(): ReadonlyArray<Role> {
    return this.#roles.filter((r) => !r.expireAt);
  }

  public getRoleHistory(): Record<string, Role[]> {
    const format = (d: Date) =>
      d.toLocaleString("en-US", { month: "short", year: "numeric" });
    return this.#roles.reverse().reduce(
      (acc, role) => {
        const start = format(role.createdAt);
        const end = role.expireAt ? format(role.expireAt) : "Present";
        const key = `${start} - ${end}`;
        acc[key] = acc[key] || [];
        acc[key].unshift(role);
        return acc;
      },
      {} as Record<string, Role[]>,
    );
  }

  // ---- Constructors & getters region ----
  constructor(
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    primaryNumber?: PhoneNumber,
    status: UserStatus = UserStatus.DRAFT,
    isTemporary: boolean = false,
    title?: string,
    middleName?: string,
    dateOfBirth?: Date,
    gender?: string,
    about?: string,
    picture?: string,
    roles: Role[] = [],
    secondaryNumber?: PhoneNumber,
    presentAddress?: Address,
    permanentAddress?: Address,
    isPublic: boolean = true,
    authUserId?: string,
    isSameAddress?: boolean,
    loginMethod: LoginMethod[] = [LoginMethod.EMAIL, LoginMethod.PASSWORD],
    socialMediaLinks: Link[] = [],
    donationPauseStart?: Date,
    donationPauseEnd?: Date,
    panNumber?: string,
    aadharNumber?: string,
    deleted?: boolean,
    donationAmount?: number,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.#firstName = firstName;
    this.#lastName = lastName;
    this.#email = email;
    this.#primaryNumber = primaryNumber;
    this.#status = status;
    this.#isTemporary = isTemporary;
    this.#title = title;
    this.#middleName = middleName;
    this.#dateOfBirth = dateOfBirth;
    this.#gender = gender;
    this.#about = about;
    this.#roles = roles;
    this.#secondaryNumber = secondaryNumber;
    this.#presentAddress = presentAddress;
    this.#permanentAddress = permanentAddress;
    this.#isPublic = isPublic;
    this.#authUserId = authUserId;
    this.#isSameAddress = isSameAddress;
    this.#loginMethod = loginMethod;
    this.#socialMediaLinks = socialMediaLinks;
    this.#donationPauseStart = donationPauseStart;
    this.#donationPauseEnd = donationPauseEnd;
    this.#panNumber = panNumber;
    this.#aadharNumber = aadharNumber;
    this.#isDeleted = deleted;
    this.#isProfileCompleted = this.checkComplteness();
    this.#fullName = this.computeFullName();
    this.#initials = this.computeInitials();
    this.#picture = picture ?? this.generatePictureUrl();
    this.#donationAmount = donationAmount;
  }

  get fullName(): string | undefined {
    return this.#fullName;
  }

  get initials(): string | undefined {
    return this.#initials;
  }

  get firstName(): string | undefined {
    return this.#firstName;
  }

  get lastName(): string | undefined {
    return this.#lastName;
  }

  get email(): string {
    return this.#email;
  }

  get primaryNumber(): PhoneNumber | undefined {
    return this.#primaryNumber;
  }

  get status(): UserStatus {
    return this.#status;
  }

  get isTemporary(): boolean {
    return this.#isTemporary;
  }

  get title(): string | undefined {
    return this.#title;
  }

  get middleName(): string | undefined {
    return this.#middleName;
  }

  get dateOfBirth(): Date | undefined {
    return this.#dateOfBirth;
  }

  get gender(): string | undefined {
    return this.#gender;
  }

  get about(): string | undefined {
    return this.#about;
  }

  get picture(): string | undefined {
    return this.#picture;
  }

  get roles(): ReadonlyArray<Role> {
    return this.#roles;
  }

  get secondaryNumber(): PhoneNumber | undefined {
    return this.#secondaryNumber;
  }

  get presentAddress(): Address | undefined {
    return this.#presentAddress;
  }

  get permanentAddress(): Address | undefined {
    return this.#permanentAddress;
  }

  get isPublic(): boolean {
    return this.#isPublic;
  }

  get authUserId(): string | undefined {
    return this.#authUserId;
  }

  get isSameAddress(): boolean | undefined {
    return this.#isSameAddress;
  }

  get loginMethod(): ReadonlyArray<LoginMethod> {
    return this.#loginMethod;
  }

  get socialMediaLinks(): ReadonlyArray<Link> {
    return this.#socialMediaLinks;
  }

  get donationPauseStart(): Date | undefined {
    return this.#donationPauseStart;
  }

  get donationPauseEnd(): Date | undefined {
    return this.#donationPauseEnd;
  }

  get panNumber(): string | undefined {
    return this.#panNumber;
  }

  get aadharNumber(): string | undefined {
    return this.#aadharNumber;
  }

  get isProfileCompleted(): boolean {
    return this.#isProfileCompleted;
  }

  get donationAmount(): number | undefined {
    return this.#donationAmount;
  }

  get updateAuth(): boolean {
    return this.#updateAuth;
  }

  get password() {
    return this.#password;
  }

  get isDeleted() {
    return this.#isDeleted;
  }

  delete() {
    this.#isDeleted = true;
    this.#status = UserStatus.DELETED;
    this.#donationAmount = undefined;
    this.#donationPauseEnd = undefined;
    this.#donationPauseStart = undefined;
    this.#panNumber = undefined;
    this.#aadharNumber = undefined;
    this.#socialMediaLinks = [];
    this.#roles = [];
    this.#about = undefined;
    this.#title = undefined;
    this.#isPublic = false;
    this.#loginMethod = [];
    this.#isProfileCompleted = false;
    this.addDomainEvent(new UserDeletedEvent(this.id, this));
  }
}
