import { Inject,Injectable,UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Configkey } from "src/shared/config-keys";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { ApiKey,ApiKeyFilter } from "../../domain/models/api-key.model";
import { AuthUser } from "../../domain/models/api-user.model";
import {
API_KEY_REPOSITORY,
type IApiKeyRepository,
} from "../../domain/repository/api-key.repository.interface";
import { Auth0OAuthService } from "../../infrastructure/external/auth0-oauth.service";
import { ApiKeyDto } from "../dto/api-key.dto";
import { ApiKeyMapper } from "../dto/mapper/api-key.mapper";
import { AUTH0_OAUTH_SERVICE } from "./oauth.service";

@Injectable()
export class ApiKeyService {
  private apiKeys = new Map<string, ApiKey>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly configService: ConfigService,
    @Inject(AUTH0_OAUTH_SERVICE)
    private readonly auth0OAuthService: Auth0OAuthService,
  ) {}

  async validateApiKey(apiKey: string): Promise<AuthUser> {
    if (!apiKey) {
      throw new UnauthorizedException("API key is required");
    }
    const keyId = ApiKey.fetchKeyId(apiKey);
    const keyInfo =
      this.apiKeys.get(keyId) ??
      (await this.apiKeyRepository.findByKeyId(keyId));

    if (!keyInfo) {
      throw new UnauthorizedException("Invalid API key");
    }

    // Check if key is expired
    if (keyInfo.isExpired()) {
      this.apiKeys.delete(keyId);
      throw new UnauthorizedException("API key has expired");
    }

    // Update last used timestamp (in production: async update)
    keyInfo.used();
    this.eventEmitter.emit("api-key.updated", keyInfo);

    if (!this.apiKeys.has(keyId)) {
      this.apiKeys.set(keyId, keyInfo);
    }

    return {
      sub: `apikey:${keyInfo.id}`,
      name: keyInfo.name,
      permissions: keyInfo.permissions,
      profile_name: keyInfo.userName,
      user_id: keyInfo.userId,
      type: "jwt",
    } as AuthUser;
  }

  async generateApiKey(
    name: string,
    permissions: string[],
    expiresAt?: Date,
  ): Promise<ApiKeyDto> {
    // Generate secure random key
    const { keyInfo, token } = await ApiKey.create({
      name: name,
      permissions: permissions,
      expiresAt: expiresAt,
    });

    this.apiKeys.set(keyInfo.key, keyInfo);
    await this.apiKeyRepository.create(keyInfo);
    return ApiKeyMapper.toDto(keyInfo, token);
  }

  async updateApiKeyPermissions(
    id: string,
    permissions: string[],
  ): Promise<ApiKeyDto> {
    const apiKey = await this.apiKeyRepository.findById(id);
    if (!apiKey) {
      throw new Error("No ApiKey found with id: " + id);
    }
    apiKey.updatePermissions(permissions);
    await this.apiKeyRepository.update(id, apiKey);
    this.apiKeys.set(apiKey.key, apiKey);
    return ApiKeyMapper.toDto(apiKey);
  }

  async revokeApiKey(id: string): Promise<boolean> {
    const apiKeyInfo = await this.apiKeyRepository.findById(id);
    await this.apiKeyRepository.delete(id);
    return this.apiKeys.delete(apiKeyInfo?.key!);
  }

  async listApiKeys(
    filter: BaseFilter<ApiKeyFilter>,
  ): Promise<PagedResult<ApiKeyDto>> {
    const result = await this.apiKeyRepository.findPaged({
      pageIndex: filter.pageIndex,
      pageSize: filter.pageSize,
      props: filter.props,
    });
    return new PagedResult<ApiKeyDto>(
      result.content.map((m) => ApiKeyMapper.toDto(m)),
      result.totalSize,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 1000,
    );
  }

  async listApiScopes(): Promise<string[]> {
    const audience = this.configService.get(
      Configkey.AUTH0_RESOURCE_API_AUDIENCE,
    );
    return await this.auth0OAuthService.getOAuthScopes({ audience });
  }
}
