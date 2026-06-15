import { Inject,Injectable,NotFoundException } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import { Comment } from "../../domain/model/comment.model";
import {
COMMENT_REPOSITORY,
type ICommentRepository,
} from "../../domain/repositories/comment.repository";
import { UpdateCommentDto } from "../dtos/comment.dtos";

@Injectable()
export class UpdateCommentUseCase
  implements
    IUseCase<
      { id: string; request: UpdateCommentDto; authorId: string },
      Comment
    >
{
  constructor(
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: ICommentRepository,
  ) {}

  async execute(params: {
    id: string;
    request: UpdateCommentDto;
    authorId: string;
  }): Promise<Comment> {
    const { id, request, authorId } = params;

    const comment = await this.commentRepository.findById(id);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (comment.authorId !== authorId) {
      throw new BusinessException(
        "You are not authorized to update this comment",
      );
    }

    const updated = comment.update(request.content);
    if (updated) {
      await this.commentRepository.save(comment);
    }

    return comment;
  }
}
