import {
BadRequestException,
Controller,
Get,
NotFoundException,
Param,
Query
} from "@nestjs/common";
import {
ApiBearerAuth,
ApiOperation,
ApiParam,
ApiQuery,
ApiTags,
} from "@nestjs/swagger";
import {
ApiAutoPagedResponse,
ApiAutoResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { PagedResult } from "src/shared/models/paged-result";
import { SuccessResponse } from "src/shared/models/response-model";
import { RequirePermissions } from "../../application/decorators/require-permissions.decorator";
import { AuthTokenDto } from "../../application/dto/oauth..dto";
import { OAuthService } from "../../application/services";
import { Auth0OAuthService } from "../../infrastructure/external/auth0-oauth.service";
import { GoogleOAuthService } from "../../infrastructure/external/google-oauth.service";

@ApiTags(OAuthController.name)
@ApiBearerAuth("jwt")
@Controller("auth/oauth")
export class OAuthController {
  private readonly serviceMap: Map<string, OAuthService>;

  constructor(
    private readonly googleOAuthService: GoogleOAuthService,
    private readonly auth0OAuthService: Auth0OAuthService,
  ) {
    this.serviceMap = new Map<string, OAuthService>([
      ["google", this.googleOAuthService],
      ["auth0", this.auth0OAuthService],
    ]);
  }

  private getService(provider: string): OAuthService {
    const service = this.serviceMap.get(provider.toLowerCase());
    if (!service) {
      throw new NotFoundException(
        `OAuth provider "${provider}" is not supported.`,
      );
    }
    return service;
  }

  @Get(":provider/auth-url")
  @ApiOperation({
    summary: "Get OAuth authorization URL",
    description:
      "Returns the OAuth URL to redirect users to for authentication. State parameter is automatically generated server-side for security.",
  })
  @ApiParam({
    name: "provider",
    description: "OAuth provider (e.g., google)",
    type: String,
  })
  @ApiQuery({
    name: "scopes",
    required: false,
    description: "Space-separated list of OAuth scopes (must be whitelisted)",
    type: String,
  })
  @ApiQuery({
    name: "state",
    required: false,
    description:
      "Optional custom state parameter (if not provided, secure state will be generated server-side)",
    type: String,
  })
  @ApiAutoResponse(String, {
    description: "OAuth URL",
    wrapInSuccessResponse: true,
  })
  @RequirePermissions("create:oauth_token")
  async getAuthUrl(
    @Param("provider") provider: string,
    @Query("scopes") scopes?: string,
    @Query("state") state?: string,
  ): Promise<SuccessResponse<string>> {
    const service = this.getService(provider);

    if (scopes && scopes.length > 1000) {
      throw new BadRequestException(
        "Scopes parameter is too long. Maximum 1000 characters allowed.",
      );
    }

    const scopeList = scopes
      ? scopes.split(" ").filter((s) => s.trim().length > 0)
      : [];

    for (const scope of scopeList) {
      if (scope.length > 200) {
        throw new BadRequestException(
          `Scope "${scope.substring(0, 50)}..." is too long.`,
        );
      }
    }

    const response = await service.getAuthUrl(scopeList, state);
    return new SuccessResponse<string>(response.url);
  }

  @Get(":provider/scopes")
  @ApiOperation({ summary: "Get available OAuth scopes for provider" })
  @ApiParam({
    name: "provider",
    description: "OAuth provider (e.g., google)",
    type: String,
  })
  @ApiAutoResponse(String, {
    description: "OAuth scopes",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  async getScopes(
    @Param("provider") provider: string,
  ): Promise<SuccessResponse<string[]>> {
    const service = this.getService(provider);
    return new SuccessResponse<string[]>(await service.getOAuthScopes());
  }

  @Get(":provider/tokens")
  @ApiOperation({ summary: "Get available OAuth tokens for provider" })
  @RequirePermissions("read:oauth_token")
  @ApiParam({
    name: "provider",
    description: "OAuth provider (e.g., google)",
    type: String,
  })
  @ApiQuery({ name: "pageIndex", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiAutoPagedResponse(AuthTokenDto, {
    description: "OAuth tokens",
    wrapInSuccessResponse: true,
  })
  async getTokens(
    @Param("provider") provider: string,
    @Query("pageIndex") pageIndex: number,
    @Query("pageSize") pageSize: number,
  ): Promise<SuccessResponse<PagedResult<AuthTokenDto>>> {
    const service = this.getService(provider);
    return new SuccessResponse(
      await service.getTokens({ pageIndex, pageSize, props: {} }),
    );
  }

  @Get(":provider/tokens/:id/revoke")
  @ApiOperation({ summary: "Revoke OAuth tokens" })
  @ApiParam({
    name: "provider",
    description: "OAuth provider (e.g., google)",
    type: String,
  })
  @ApiParam({ name: "id", description: "Token ID to revoke", type: String })
  @ApiAutoResponse(String, {
    description: "Success message",
    wrapInSuccessResponse: true,
  })
  @RequirePermissions("delete:oauth_token")
  async revokeTokens(
    @Param("provider") provider: string,
    @Param("id") id: string,
  ): Promise<SuccessResponse<string>> {
    const service = this.getService(provider);
    await service.revokeTokens(id);
    return new SuccessResponse("Token revoked successfully.");
  }

  @Get("providers")
  @ApiOperation({ summary: "Get available OAuth providers" })
  @ApiAutoResponse(String, {
    description: "OAuth providers",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  async getProviders(): Promise<SuccessResponse<string[]>> {
    return new SuccessResponse(Array.from(this.serviceMap.keys()));
  }
}
