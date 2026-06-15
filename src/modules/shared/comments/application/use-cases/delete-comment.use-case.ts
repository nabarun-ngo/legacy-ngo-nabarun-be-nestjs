import { Inject,Injectable,NotFoundException } from "@nestjs/common";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import {
COMMENT_REPOSITORY,
type ICommentRepository,
} from "../../domain/repositories/comment.repository";

@Injectable()
export class DeleteCommentUseCase
  implements IUseCase<{ id: string; authorId: string }, void>
{
  constructor(
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: ICommentRepository,
  ) {}

  async execute(params: { id: string; authorId: string }): Promise<void> {
    const { id, authorId } = params;

    const comment = await this.commentRepository.findById(id);
    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    if (comment.authorId !== authorId) {
      throw new BusinessException(
        "You are not authorized to delete this comment",
      );
    }

    await this.commentRepository.delete(id);
  }
}
