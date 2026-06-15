import { ApiKey } from "../../../domain/models/api-key.model";
import { ApiKeyDto } from "../api-key.dto";

export class ApiKeyMapper {
  static toDto(token: ApiKey, tokenString?: string): ApiKeyDto {
    return {
      id: token.id,
      name: token.name,
      permissions: token.permissions,
      expiresAt: token.expiresAt,
      lastUsedAt: token.lastUsedAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      apiToken: tokenString,
    };
  }
}
