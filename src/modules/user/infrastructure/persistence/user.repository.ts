import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AccountType } from "src/modules/finance/domain/model/account.model";
import { DonationStatus } from "src/modules/finance/domain/model/donation.model";
import { ExpenseStatus } from "src/modules/finance/domain/model/expense.model";
import { TransactionType } from "src/modules/finance/domain/model/transaction.model";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { TaskAssignment } from "src/modules/workflow/domain/model/task-assignment.model";
import { WorkflowTask } from "src/modules/workflow/domain/model/workflow-task.model";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { Role } from "../../domain/model/role.model";
import { User,UserFilterProps } from "../../domain/model/user.model";
import { IUserRepository } from "../../domain/repositories/user.repository.interface";
import { UserInfraMapper } from "../user-infra.mapper";

@Injectable()
class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async count(filter: UserFilterProps): Promise<number> {
    return await this.prisma.userProfile.count({
      where: this.whereQuery(filter),
    });
  }

  async findPaged(
    filter?: BaseFilter<UserFilterProps>,
  ): Promise<PagedResult<User>> {
    const [data, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        where: this.whereQuery(filter?.props),
        orderBy: { firstName: "asc" },
        include: {
          roles: true,
          socialMediaLinks: filter?.props?.includeLinks ?? false,
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.userProfile.count({
        where: this.whereQuery(filter?.props),
      }),
    ]);

    return new PagedResult<User>(
      data.map((m) => UserInfraMapper.toUserDomain(m)!),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 0,
    );
  }

  async findAll(filter?: UserFilterProps): Promise<User[]> {
    const users = await this.prisma.userProfile.findMany({
      where: this.whereQuery(filter),
      orderBy: { firstName: "asc" },
      include: {
        roles: true,
        socialMediaLinks: filter?.includeLinks ?? false,
      },
    });
    return users.map((m) => UserInfraMapper.toUserDomain(m)!);
  }

  private whereQuery(props?: UserFilterProps) {
    const where: Prisma.UserProfileWhereInput = {
      ...(props?.firstName
        ? { firstName: { contains: props.firstName, mode: "insensitive" } }
        : {}),
      ...(props?.lastName
        ? { lastName: { contains: props.lastName, mode: "insensitive" } }
        : {}),
      ...(props?.email
        ? { email: { contains: props.email, mode: "insensitive" } }
        : {}),
      ...(props?.status ? { status: props.status } : {}),
      ...(props?.roleCodes
        ? {
            roles: {
              some: {
                AND: { roleCode: { in: [...props.roleCodes] }, expireAt: null },
              },
            },
          }
        : {}),
      ...(props?.phoneNumber
        ? { phoneNumbers: { some: { phoneNumber: props.phoneNumber } } }
        : {}),
      ...(props?.public ? { isPublic: props.public } : {}),
      deletedAt: null,
    };
    return where;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.userProfile.findUnique({
      where: { id },
      include: {
        roles: true,
        socialMediaLinks: true,
        addresses: true,
        phoneNumbers: true,
      },
    });
    return UserInfraMapper.toUserDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.userProfile.findUnique({
      where: { email },
      include: {
        roles: true,
        socialMediaLinks: true,
        addresses: true,
        phoneNumbers: true,
      },
    });
    return UserInfraMapper.toUserDomain(user);
  }

  async create(user: User): Promise<User> {
    const createData: Prisma.UserProfileCreateInput = {
      ...UserInfraMapper.toUserCreatePersistence(user),
      roles: {
        create: user.roles.map((role) =>
          UserInfraMapper.toRolePersistance(role),
        ),
      },
      phoneNumbers: {
        create: user.primaryNumber
          ? [
              {
                id: user.primaryNumber.id,
                phoneCode: user.primaryNumber.phoneCode,
                phoneNumber: user.primaryNumber.phoneNumber,
                hidden: user.primaryNumber.hidden,
                primary: true,
              },
            ]
          : [],
      },
    };

    const createdUser = await this.prisma.userProfile.create({
      data: createData,
      include: {
        roles: true,
        addresses: true,
        phoneNumbers: true,
        socialMediaLinks: true,
      },
    });
    return UserInfraMapper.toUserDomain(createdUser)!;
  }

  async update(id: string, user: User): Promise<User> {
    const now = new Date();
    const data = UserInfraMapper.toUserCreatePersistence(user);

    // Filter phone numbers
    const phoneNumbers = [user.primaryNumber, user.secondaryNumber].filter(
      Boolean,
    );

    // Build addresses array
    const addressesData: (Omit<Prisma.AddressUncheckedCreateInput, "userId"> & {
      addressType: string;
    })[] = [];
    if (user.presentAddress) {
      addressesData.push({
        id: user.presentAddress.id,
        addressLine1: user.presentAddress.addressLine1,
        addressLine2: user.presentAddress.addressLine2 ?? null,
        addressLine3: user.presentAddress.addressLine3 ?? null,
        hometown: user.presentAddress.hometown,
        zipCode: user.presentAddress.zipCode,
        state: user.presentAddress.state,
        district: user.presentAddress.district,
        country: user.presentAddress.country,
        addressType: "present",
      });
    }
    if (user.permanentAddress) {
      addressesData.push({
        id: user.permanentAddress.id,
        addressLine1: user.permanentAddress.addressLine1,
        addressLine2: user.permanentAddress.addressLine2 ?? null,
        addressLine3: user.permanentAddress.addressLine3 ?? null,
        hometown: user.permanentAddress.hometown,
        zipCode: user.permanentAddress.zipCode,
        state: user.permanentAddress.state,
        district: user.permanentAddress.district,
        country: user.permanentAddress.country,
        addressType: "permanent",
      });
    }

    const updated = await this.prisma.userProfile.update({
      where: { id },
      data: {
        ...data,
        phoneNumbers: {
          upsert: phoneNumbers.map((phone, index) => ({
            where: { id: phone!.id },
            update: {
              phoneCode: phone!.phoneCode,
              phoneNumber: phone!.phoneNumber,
              hidden: phone!.hidden,
              primary: index === 0,
            },
            create: {
              id: phone!.id,
              phoneCode: phone!.phoneCode,
              phoneNumber: phone!.phoneNumber,
              hidden: phone!.hidden,
              primary: index === 0,
            },
          })),
        },
        addresses: {
          upsert: addressesData.map((addr) => ({
            where: { id: addr.id },
            update: {
              addressLine1: addr.addressLine1,
              addressLine2: addr.addressLine2,
              addressLine3: addr.addressLine3,
              hometown: addr.hometown,
              zipCode: addr.zipCode,
              state: addr.state,
              district: addr.district,
              country: addr.country,
              addressType: addr.addressType,
            },
            create: {
              id: addr.id,
              addressLine1: addr.addressLine1,
              addressLine2: addr.addressLine2,
              addressLine3: addr.addressLine3,
              hometown: addr.hometown,
              zipCode: addr.zipCode,
              state: addr.state,
              district: addr.district,
              country: addr.country,
              addressType: addr.addressType,
            },
          })),
        },
        socialMediaLinks: {
          upsert: user.socialMediaLinks.map((link) => ({
            where: { id: link.id },
            update: {
              linkName: link.linkName,
              linkType: link.linkType,
              linkValue: link.linkValue,
              updatedAt: now,
            },
            create: {
              id: link.id,
              linkName: link.linkName,
              linkType: link.linkType,
              linkValue: link.linkValue,
              createdAt: now,
              updatedAt: now,
            },
          })),
        },
      },
      include: {
        roles: true,
        phoneNumbers: true,
        addresses: true,
        socialMediaLinks: true,
      },
    });

    const mappedUser = UserInfraMapper.toUserDomain(updated);
    if (!mappedUser) {
      throw new Error("Failed to map updated user");
    }
    return mappedUser;
  }

  async updateRoles(id: string, roles: Role[]): Promise<void> {
    const now = new Date();
    await this.prisma.userProfile.update({
      where: { id },
      data: {
        roles: {
          updateMany: {
            where: { expireAt: null },
            data: { expireAt: now },
          },
          create: roles.map((role) => ({
            id: role.id,
            roleCode: role.roleCode,
            roleName: role.roleName,
            authRoleCode: role.authRoleCode,
            isDefault: role.isDefault,
            createdAt: now,
          })),
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userProfile.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async restore(id: string): Promise<void> {
    await this.prisma.userProfile.update({
      where: { id: id },
      data: {
        deletedAt: null,
      },
    });
  }

  async findUserMetrics(id: string): Promise<{
    pendingDonations: number;
    unsettledExpense: number;
    pendingTask: number;
    walletBalance: number;
  }> {
    const accounts = await this.prisma.account.findMany({
      where: { type: { in: [AccountType.WALLET] }, accountHolderId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const accountIds = accounts.map((m) => m.id);
    const [donations, expenses, transactions, pendingTask] = await Promise.all([
      this.prisma.donation.aggregate({
        where: {
          donorId: id,
          status: { in: [DonationStatus.PENDING] },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          paidById: id,
          status: {
            notIn: [
              ExpenseStatus.SETTLED,
              ExpenseStatus.REJECTED,
              ExpenseStatus.DRAFT,
            ],
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: { accountId: { in: accountIds } },
        select: { amount: true, type: true },
      }),
      this.prisma.workflowTask.count({
        where: {
          status: {
            in: WorkflowTask.pendingTaskStatus,
          },
          assignments: {
            some: {
              assignedToId: id,
              status: {
                in: TaskAssignment.pendingStatus,
              },
            },
          },
        },
      }),
    ]);

    return {
      pendingDonations: Number(donations._sum.amount ?? 0),
      unsettledExpense: Number(expenses._sum.amount ?? 0),
      pendingTask,
      walletBalance: Number(
        transactions.reduce(
          (acc, t) =>
            acc + Number(t.type === TransactionType.IN ? t.amount : -t.amount),
          0,
        ),
      ),
    };
  }
}

export default UserRepository;
