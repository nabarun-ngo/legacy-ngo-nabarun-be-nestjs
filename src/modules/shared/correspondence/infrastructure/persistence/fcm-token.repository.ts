import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { FcmToken } from "../../domain/models/fcm-token.model";
import { IFcmTokenRepository } from "../../domain/repositories/fcm-token.repository.interface";
import { FcmTokenFilterDto } from "../../presentation/dtos/notification.dto";

@Injectable()
export class FcmTokenRepository implements IFcmTokenRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}
  async count(filter: FcmTokenFilterDto): Promise<number> {
    return await this.prisma.userFcmToken.count({
      where: this.whereQuery(filter),
    });
  }
  async findPaged(
    filter?: BaseFilter<FcmTokenFilterDto>,
  ): Promise<PagedResult<FcmToken>> {
    const where = this.whereQuery(filter?.props || {});
    const [tokens, total] = await Promise.all([
      this.prisma.userFcmToken.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.userFcmToken.count({ where }),
    ]);

    return {
      content: tokens.map((t) => this.toDomain(t)),
      totalSize: total,
      pageIndex: filter?.pageIndex ?? 0,
      pageSize: filter?.pageSize ?? 1000,
    };
  }
  async findAll<F>(filter: F): Promise<FcmToken[]> {
    const where = this.whereQuery(filter as any);
    const tokens = await this.prisma.userFcmToken.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return tokens.map((t) => this.toDomain(t));
  }

  private whereQuery(filter: FcmTokenFilterDto): Prisma.UserFcmTokenWhereInput {
    const where: Prisma.UserFcmTokenWhereInput = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.deviceType) {
      where.deviceType = filter.deviceType;
    }

    if (filter.isActive) {
      where.isActive = filter.isActive === "Y";
    }

    if (filter.search) {
      where.OR = [
        { deviceName: { contains: filter.search, mode: "insensitive" } },
        { browser: { contains: filter.search, mode: "insensitive" } },
        { os: { contains: filter.search, mode: "insensitive" } },
        {
          user: {
            OR: [
              { firstName: { contains: filter.search, mode: "insensitive" } },
              { lastName: { contains: filter.search, mode: "insensitive" } },
              { email: { contains: filter.search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    return where;
  }

  async create(fcmToken: FcmToken): Promise<FcmToken> {
    const created = await this.prisma.userFcmToken.create({
      data: {
        id: fcmToken.id,
        userId: fcmToken.userId,
        token: fcmToken.token,
        deviceType: fcmToken.deviceType,
        deviceName: fcmToken.deviceName,
        browser: fcmToken.browser,
        os: fcmToken.os,
        isActive: fcmToken.isActive,
        lastUsedAt: fcmToken.lastUsedAt,
      },
      include: {
        user: true,
      },
    });

    return this.toDomain(created);
  }

  async update(id: string, fcmToken: FcmToken): Promise<FcmToken> {
    const updated = await this.prisma.userFcmToken.update({
      where: { id },
      data: {
        deviceType: fcmToken.deviceType,
        deviceName: fcmToken.deviceName,
        browser: fcmToken.browser,
        os: fcmToken.os,
        isActive: fcmToken.isActive,
        lastUsedAt: fcmToken.lastUsedAt,
      },
      include: {
        user: true,
      },
    });

    return this.toDomain(updated);
  }

  async findById(id: string): Promise<FcmToken | null> {
    const token = await this.prisma.userFcmToken.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    return token ? this.toDomain(token) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userFcmToken.delete({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<FcmToken[]> {
    const tokens = await this.prisma.userFcmToken.findMany({
      where: { userId },
      include: {
        user: true,
      },
    });

    return tokens.map((t) => this.toDomain(t));
  }

  async findByToken(token: string): Promise<FcmToken | null> {
    const fcmToken = await this.prisma.userFcmToken.findUnique({
      where: { token },
      include: {
        user: true,
      },
    });

    return fcmToken ? this.toDomain(fcmToken) : null;
  }

  async findActiveByUserId(userId: string): Promise<FcmToken[]> {
    const tokens = await this.prisma.userFcmToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    return tokens.map((t) => this.toDomain(t));
  }

  async deactivateToken(token: string): Promise<void> {
    await this.prisma.userFcmToken.update({
      where: { token },
      data: {
        isActive: false,
      },
    });
  }

  async deactivateAllByUserId(userId: string): Promise<void> {
    await this.prisma.userFcmToken.updateMany({
      where: { userId },
      data: {
        isActive: false,
      },
    });
  }

  async deleteInactiveTokens(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.userFcmToken.deleteMany({
      where: {
        isActive: false,
        lastUsedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  private toDomain(data: any): FcmToken {
    return new FcmToken(data.id, data.userId, data.token, {
      user: data.user,
      deviceType: data.deviceType,
      deviceName: data.deviceName,
      browser: data.browser,
      os: data.os,
      isActive: data.isActive,
      lastUsedAt: data.lastUsedAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
