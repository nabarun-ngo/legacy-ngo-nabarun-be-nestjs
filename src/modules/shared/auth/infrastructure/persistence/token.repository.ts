import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import {
AuthToken,
AuthTokenFilter,
} from "../../domain/models/auth-token.model";
import { ITokenRepository } from "../../domain/repository/token.repository.interface";

@Injectable()
export class TokenRepository implements ITokenRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}
  async count(filter: AuthTokenFilter): Promise<number> {
    return await this.prisma.oAuthToken.count({
      where: this.whereQuery(filter),
    });
  }
  async findPaged(
    filter?: BaseFilter<AuthTokenFilter>,
  ): Promise<PagedResult<AuthToken>> {
    const where = this.whereQuery(filter?.props!);
    const [data, total] = await Promise.all([
      this.prisma.oAuthToken.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.oAuthToken.count({ where }),
    ]);

    return new PagedResult<AuthToken>(
      data.map((m) => this.toToken(m)),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async findByAttribute(
    filter: Partial<AuthTokenFilter>,
  ): Promise<AuthToken | null> {
    const token = await this.prisma.oAuthToken.findFirst({
      where: this.whereQuery(filter),
    });
    return token ? this.toToken(token) : null;
  }
  async findAll(filter: AuthTokenFilter): Promise<AuthToken[]> {
    return (
      await this.prisma.oAuthToken.findMany({
        where: this.whereQuery(filter),
        orderBy: {
          createdAt: "desc",
        },
      })
    ).map(this.toToken);
  }

  private whereQuery(filter: AuthTokenFilter) {
    return {
      ...(filter?.email ? { email: filter.email } : {}),
      ...(filter?.provider ? { provider: filter.provider } : {}),
      ...(filter?.clientId ? { clientId: filter.clientId } : {}),
      ...(filter?.scope
        ? {
            scope: {
              contains: filter.scope,
            },
          }
        : {}),
    } as Prisma.OAuthTokenWhereInput;
  }

  async findById(id: string): Promise<AuthToken | null> {
    const token = await this.prisma.oAuthToken.findUnique({
      where: {
        id: id,
      },
    });
    return token ? this.toToken(token) : null;
  }

  async create(entity: AuthToken): Promise<AuthToken> {
    const createdToken = await this.prisma.oAuthToken.create({
      data: {
        id: entity.id,
        clientId: entity.clientId,
        provider: entity.provider,
        email: entity.email,
        accessToken: entity.accessToken,
        refreshToken: entity.refreshToken,
        tokenType: entity.tokenType,
        expiresAt: entity.expiresAt,
        scope: entity.scope,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
    });
    return this.toToken(createdToken);
  }

  async update(id: string, entity: AuthToken): Promise<AuthToken> {
    // Store or update tokens in database
    const updatedToken = await this.prisma.oAuthToken.update({
      where: {
        id: id,
      },
      data: {
        accessToken: entity.accessToken,
        expiresAt: entity.expiresAt,
        tokenType: entity.tokenType,
        updatedAt: entity.updatedAt,
      },
    });
    return this.toToken(updatedToken);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.oAuthToken.delete({
      where: {
        id: id,
      },
    });
  }

  private toToken(data: {
    id: string;
    provider: string;
    clientId: string;
    email: string;
    accessToken: string;
    refreshToken: string | null;
    tokenType: string | null;
    expiresAt: Date | null;
    scope: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return new AuthToken(
      data.id,
      data.clientId,
      data.provider,
      data.email,
      data.accessToken,
      data.refreshToken!,
      data.expiresAt!,
      data.tokenType!,
      data.scope!,
      data.createdAt,
      data.updatedAt,
    );
  }
}
