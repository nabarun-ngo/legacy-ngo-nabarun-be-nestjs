import { Inject,Injectable } from "@nestjs/common";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import { Comment } from "../../domain/model/comment.model";
import {
COMMENT_REPOSITORY,
type ICommentRepository,
} from "../../domain/repositories/comment.repository";
import { CreateCommentDto } from "../dtos/comment.dtos";

@Injectable()
export class AddCommentUseCase
  implements IUseCase<{ request: CreateCommentDto; authorId: string }, Comment>
{
  constructor(
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: ICommentRepository,
  ) {}

  async execute(params: {
    request: CreateCommentDto;
    authorId: string;
  }): Promise<Comment> {
    const { request, authorId } = params;

    const comment = Comment.create({
      content: request.content,
      authorId: authorId,
      entityType: request.entityType,
      entityId: request.entityId,
      parentId: request.parentId,
    });

    await this.commentRepository.save(comment);

    const savedComment = await this.commentRepository.findById(comment.id);
    return savedComment!;
  }
}
