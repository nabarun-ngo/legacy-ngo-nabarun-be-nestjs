import {
Body,
Controller,
Delete,
Get,
Param,
Patch,
Post,
Query,
} from "@nestjs/common";
import {
ApiBearerAuth,
ApiBody,
ApiOperation,
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
import { ApiKeyDto,CreateApiKeyDto } from "../../application/dto/api-key.dto";
import { ApiKeyService } from "../../application/services/api-key.service";

@ApiBearerAuth("jwt")
@ApiTags(ApiKeyController.name)
@Controller("auth/apikey")
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post("generate")
  @ApiOperation({
    summary: "Generate API Key",
  })
  @RequirePermissions("create:api_keys")
  @ApiAutoResponse(ApiKeyDto, { description: "API Key generated successfully" })
  @ApiBody({ type: CreateApiKeyDto })
  async generateApiKey(
    @Body() create: CreateApiKeyDto,
  ): Promise<SuccessResponse<ApiKeyDto>> {
    const result = await this.apiKeyService.generateApiKey(
      create.name,
      create.permissions,
      create.expireAt,
    );
    return new SuccessResponse<ApiKeyDto>(result);
  }

  @Get("list")
  @ApiOperation({ summary: "List all API keys" })
  @RequirePermissions("read:api_keys")
  @ApiQuery({ name: "pageIndex", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiAutoPagedResponse(ApiKeyDto, {
    description: "List of API keys",
    wrapInSuccessResponse: true,
    isArray: true,
  })
  async listApiKeys(
    @Query("pageIndex") pageIndex: number,
    @Query("pageSize") pageSize: number,
  ): Promise<SuccessResponse<PagedResult<ApiKeyDto>>> {
    return new SuccessResponse(
      await this.apiKeyService.listApiKeys({ pageIndex, pageSize }),
    );
  }

  @Get("scopes")
  @ApiOperation({ summary: "List all API scopes" })
  @RequirePermissions("read:api_keys")
  @ApiAutoResponse(String, {
    description: "List of API scopes",
    isArray: true,
    wrapInSuccessResponse: true,
  })
  async listApiScopes(): Promise<SuccessResponse<string[]>> {
    return new SuccessResponse(await this.apiKeyService.listApiScopes());
  }

  @Patch("permissions/:id")
  @ApiOperation({ summary: "Update API key permissions" })
  @RequirePermissions("update:api_keys")
  @ApiAutoResponse(ApiKeyDto, {
    description: "API key permissions updated successfully",
  })
  async updateApiKeyPermissions(
    @Param("id") id: string,
    @Body() permissions: string[],
  ): Promise<SuccessResponse<ApiKeyDto>> {
    return new SuccessResponse(
      await this.apiKeyService.updateApiKeyPermissions(id, permissions),
    );
  }

  @Delete("revoke/:id")
  @ApiOperation({ summary: "Revoke API key" })
  @RequirePermissions("delete:api_keys")
  @ApiAutoResponse(Boolean, {
    description: "API key revoked successfully",
    wrapInSuccessResponse: true,
  })
  async revokeApiKey(
    @Param("id") id: string,
  ): Promise<SuccessResponse<boolean>> {
    return new SuccessResponse(await this.apiKeyService.revokeApiKey(id));
  }
}
