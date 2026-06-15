import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaPostgresService } from "src/modules/shared/database/prisma-postgres.service";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { ApiKey,ApiKeyFilter } from "../../domain/models/api-key.model";
import { IApiKeyRepository } from "../../domain/repository/api-key.repository.interface";

@Injectable()
export class ApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}
  async count(filter: ApiKeyFilter): Promise<number> {
    return await this.prisma.apiKey.count({ where: this.whereQuery(filter) });
  }
  async findPaged(
    filter?: BaseFilter<ApiKeyFilter>,
  ): Promise<PagedResult<ApiKey>> {
    const [apiKeys, count] = await Promise.all([
      this.prisma.apiKey.findMany({
        where: this.whereQuery(filter?.props!),
        orderBy: {
          createdAt: "desc",
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.apiKey.count({ where: this.whereQuery(filter?.props!) }),
    ]);
    return new PagedResult<ApiKey>(
      apiKeys.map((key) => this.toApiKey(key)),
      count,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }
  async findByKeyId(key: string): Promise<ApiKey | null> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { apiKeyId: key },
    });
    return apiKey ? this.toApiKey(apiKey) : null;
  }

  async findAll(filter: ApiKeyFilter): Promise<ApiKey[]> {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: this.whereQuery(filter),
      orderBy: {
        createdAt: "desc",
      },
    });
    return apiKeys.map((key) => this.toApiKey(key));
  }

  private whereQuery(filter: ApiKeyFilter) {
    return {
      ...(filter?.name
        ? { name: { contains: filter.name, mode: "insensitive" } }
        : {}),
      ...(filter?.permissions && {
        permissions: { hasSome: filter.permissions },
      }),
    } as Prisma.ApiKeyWhereInput;
  }

  async findById(id: string): Promise<ApiKey | null> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: {
        id: id,
      },
    });
    return apiKey ? this.toApiKey(apiKey) : null;
  }
  async create(entity: ApiKey): Promise<ApiKey> {
    const apiKey = await this.prisma.apiKey.create({
      data: {
        id: entity.id,
        name: entity.name,
        apiKey: entity.key,
        apiKeyId: entity.keyId,
        permissions: entity.permissions.join(","),
        expiresAt: entity.expiresAt,
        lastUsedAt: entity.lastUsedAt,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      },
    });
    return this.toApiKey(apiKey);
  }

  async update(id: string, entity: ApiKey): Promise<ApiKey> {
    const apiKey = await this.prisma.apiKey.update({
      where: {
        id: id,
      },
      data: {
        name: entity.name,
        permissions: entity.permissions.join(","),
        expiresAt: entity.expiresAt,
        lastUsedAt: entity.lastUsedAt,
        updatedAt: entity.updatedAt,
      },
    });
    return this.toApiKey(apiKey);
  }
  async delete(id: string): Promise<void> {
    await this.prisma.apiKey.delete({
      where: {
        id: id,
      },
    });
  }

  private toApiKey(key: {
    apiKeyId: string;
    apiKey: string;
    id: string;
    name: string;
    permissions: string;
    rateLimit: number | null;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): ApiKey {
    return new ApiKey({
      id: key.id,
      name: key.name,
      key: key.apiKey,
      keyId: key.apiKeyId,
      permissions: key.permissions.split(","),
      expiresAt: key.expiresAt!,
      lastUsedAt: key.lastUsedAt!,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    });
  }
}
