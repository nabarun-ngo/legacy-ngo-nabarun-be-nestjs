import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { StaticDocsService } from "../../application/services/static-docs.service";
import { StaticDocumentDto } from "../dto/static-docs.dto";
import { ApiAutoResponse } from "src/shared/decorators/api-auto-response.decorator";
import { SuccessResponse } from "src/shared/models/response-model";
import { KeyValueDto } from "src/shared/dto/KeyValue.dto";
import { RequirePermissions } from "src/modules/shared/auth/application/decorators/require-permissions.decorator";

@ApiTags(StaticDocsController.name)
@ApiBearerAuth('jwt')
@Controller('static-docs')
@ApiSecurity('api-key')
export class StaticDocsController {
    constructor(private readonly statDocsService: StaticDocsService) { }

    @Get('user-guides')
    @ApiOperation({ summary: 'Get user guides' })
    @RequirePermissions('read:static_docs')
    @ApiAutoResponse(StaticDocumentDto, { status: 200, description: 'User guides fetched successfully', isArray: true, wrapInSuccessResponse: true })
    async getUserGuides(): Promise<SuccessResponse<StaticDocumentDto[]>> {
        return new SuccessResponse(
            await this.statDocsService.getUserGuides()
        );
    }

    @Get('policies')
    @ApiOperation({ summary: 'Get policies' })
    @RequirePermissions('read:static_docs')
    @ApiAutoResponse(StaticDocumentDto, { status: 200, description: 'Policies fetched successfully', isArray: true, wrapInSuccessResponse: true })
    async getPolicies(): Promise<SuccessResponse<StaticDocumentDto[]>> {
        return new SuccessResponse(
            await this.statDocsService.getPolicyDocs()
        );
    }


    @Get('app-links')
    @ApiOperation({ summary: 'Get app links' })
    @RequirePermissions('read:static_docs')
    @ApiAutoResponse(KeyValueDto, { status: 200, description: 'App links fetched successfully', isArray: true, wrapInSuccessResponse: true })
    @ApiQuery({ name: 'linkType', required: true, description: 'Type of app links', type: String })
    async getStaticLinks(
        @Query('linkType') linkType: string
    ): Promise<SuccessResponse<KeyValueDto[]>> {
        return new SuccessResponse(
            await this.statDocsService.getStaticLinks(linkType)
        );
    }
}
