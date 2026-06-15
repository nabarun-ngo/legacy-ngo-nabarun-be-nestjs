import {
Body,
Controller,
Delete,
Get,
Param,
Post,
Put,
Query,
} from "@nestjs/common";
import { ApiBearerAuth,ApiOperation,ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "src/modules/shared/auth/application/decorators/current-user.decorator";
import { type AuthUser } from "src/modules/shared/auth/domain/models/api-user.model";
import {
ApiAutoResponse,
ApiAutoVoidResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { SuccessResponse } from "src/shared/models/response-model";
import {
CommentResponseDto,
CreateCommentDto,
UpdateCommentDto,
} from "../../application/dtos/comment.dtos";
import { AddCommentUseCase } from "../../application/use-cases/add-comment.use-case";
import { DeleteCommentUseCase } from "../../application/use-cases/delete-comment.use-case";
import { GetCommentsUseCase } from "../../application/use-cases/get-comments.use-case";
import { UpdateCommentUseCase } from "../../application/use-cases/update-comment.use-case";

@ApiTags("Comments")
@ApiBearerAuth("jwt")
@Controller("comments")
export class CommentController {
  constructor(
    private readonly addCommentUseCase: AddCommentUseCase,
    private readonly updateCommentUseCase: UpdateCommentUseCase,
    private readonly deleteCommentUseCase: DeleteCommentUseCase,
    private readonly getCommentsUseCase: GetCommentsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: "Add a new comment or reply" })
  @ApiAutoResponse(CommentResponseDto, {
    status: 201,
    wrapInSuccessResponse: true,
  })
  async addComment(
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<CommentResponseDto>> {
    const comment = await this.addCommentUseCase.execute({
      request: dto,
      authorId: user.profile_id!,
    });
    return new SuccessResponse(comment.toJson() as CommentResponseDto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an existing comment" })
  @ApiAutoResponse(CommentResponseDto, { wrapInSuccessResponse: true })
  async updateComment(
    @Param("id") id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<CommentResponseDto>> {
    const comment = await this.updateCommentUseCase.execute({
      id,
      request: dto,
      authorId: user.profile_id!,
    });
    return new SuccessResponse(comment.toJson() as CommentResponseDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a comment" })
  @ApiAutoVoidResponse()
  async deleteComment(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SuccessResponse<void>> {
    await this.deleteCommentUseCase.execute({
      id,
      authorId: user.profile_id!,
    });
    return new SuccessResponse();
  }

  @Get()
  @ApiOperation({ summary: "Get comments for an entity" })
  @ApiAutoResponse(CommentResponseDto, {
    isArray: true,
    wrapInSuccessResponse: true,
  })
  async getComments(
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
  ): Promise<SuccessResponse<CommentResponseDto[]>> {
    const comments = await this.getCommentsUseCase.execute({
      entityType,
      entityId,
    });
    return new SuccessResponse(
      comments.map((c) => c.toJson() as CommentResponseDto),
    );
  }
}
