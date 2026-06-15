import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AddCommentUseCase } from "./application/use-cases/add-comment.use-case";
import { DeleteCommentUseCase } from "./application/use-cases/delete-comment.use-case";
import { GetCommentsUseCase } from "./application/use-cases/get-comments.use-case";
import { UpdateCommentUseCase } from "./application/use-cases/update-comment.use-case";
import { COMMENT_REPOSITORY } from "./domain/repositories/comment.repository";
import { PrismaCommentRepository } from "./infrastructure/repositories/prisma-comment.repository";
import { CommentController } from "./presentation/controllers/comment.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [CommentController],
  providers: [
    AddCommentUseCase,
    UpdateCommentUseCase,
    DeleteCommentUseCase,
    GetCommentsUseCase,
    {
      provide: COMMENT_REPOSITORY,
      useClass: PrismaCommentRepository,
    },
  ],
  exports: [],
})
export class CommentsModule {}
