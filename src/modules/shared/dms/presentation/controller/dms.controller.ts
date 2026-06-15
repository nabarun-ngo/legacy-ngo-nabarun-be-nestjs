// dms.controller.ts
import {
Body,
Controller,
Get,
Header,
Param,
Post,
Res,
StreamableFile,
} from "@nestjs/common";
import {
ApiBearerAuth,
ApiOperation,
ApiParam,
ApiProduces,
ApiResponse,
ApiSecurity,
ApiTags,
} from "@nestjs/swagger";
import type { Response } from "express";
import { CurrentUser } from "src/modules/shared/auth/application/decorators/current-user.decorator";
import { RequirePermissions } from "src/modules/shared/auth/application/decorators/require-permissions.decorator";
import { type AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import {
ApiAutoPrimitiveResponse,
ApiAutoResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { SuccessResponse } from "src/shared/models/response-model";
import { DmsService } from "../../application/services/dms.service";
import { DocumentMappingRefType } from "../../domain/mapping.model";
import { DmsUploadDto } from "../dto/dms-upload.dto";
import { DocumentDto } from "../dto/document.dto";

@ApiTags(DmsController.name)
@ApiBearerAuth("jwt")
@Controller("dms")
@ApiSecurity("api-key")
export class DmsController {
  constructor(private readonly dmsService: DmsService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload a document" })
  @RequirePermissions("create:document")
  @ApiAutoResponse(DocumentDto, {
    status: 201,
    description: "Document uploaded successfully",
  })
  async uploadFile(
    @Body() body: DmsUploadDto,
    @CurrentUser() authUser: AuthUser,
  ): Promise<SuccessResponse<DocumentDto>> {
    const result = await this.dmsService.uploadFile(body, authUser.profile_id!);
    return new SuccessResponse<DocumentDto>(result);
  }

  @Get("document/:type/:id/list")
  @ApiOperation({ summary: "Get all documents for a specific entity" })
  @RequirePermissions("read:document_list")
  @ApiParam({
    name: "type",
    description: "Type of the entity",
    required: true,
    enum: DocumentMappingRefType,
  })
  @ApiParam({ name: "id", description: "ID of the entity", required: true })
  @ApiAutoResponse(DocumentDto, {
    isArray: true,
    description: "List of documents retrieved successfully",
  })
  async getDocuments(
    @Param("type") type: DocumentMappingRefType,
    @Param("id") id: string,
  ): Promise<SuccessResponse<DocumentDto[]>> {
    const result = await this.dmsService.getDocuments(type, id);
    return new SuccessResponse<DocumentDto[]>(result);
  }

  @Get("document/:id/view")
  @ApiOperation({ summary: "Get a signed URL to view a document" })
  @RequirePermissions("read:document")
  @ApiAutoPrimitiveResponse("string", {
    description: "Signed URL generated successfully",
  })
  async viewDocument(
    @Param("id") id: string,
  ): Promise<SuccessResponse<string>> {
    const result = await this.dmsService.getSignedUrl(id);
    return new SuccessResponse<string>(result);
  }

  @Get("document/:id/download")
  @ApiOperation({ summary: "Download a document file" })
  @RequirePermissions("read:document")
  @ApiParam({ name: "id", description: "Document ID", type: String })
  @ApiProduces("application/octet-stream")
  @ApiResponse({
    status: 200,
    description: "File downloaded successfully",
    content: {
      "application/octet-stream": {
        schema: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Document not found" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  @Header("Cache-Control", "no-cache, no-store, must-revalidate")
  @RequirePermissions("read:document")
  async downloadDocument(
    @Param("id") id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const {
      fileName: filename,
      stream: result,
      contentType,
    } = await this.dmsService.downloadFile(id);

    res.set({
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    return new StreamableFile(result as any);
  }
}
