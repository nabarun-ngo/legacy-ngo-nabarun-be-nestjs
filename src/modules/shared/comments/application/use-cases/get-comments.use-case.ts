import { Inject,Injectable } from "@nestjs/common";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import { Comment } from "../../domain/model/comment.model";
import {
COMMENT_REPOSITORY,
type ICommentRepository,
} from "../../domain/repositories/comment.repository";

@Injectable()
export class GetCommentsUseCase
  implements IUseCase<{ entityType: string; entityId: string }, Comment[]>
{
  constructor(
    @Inject(COMMENT_REPOSITORY)
    private readonly commentRepository: ICommentRepository,
  ) {}

  async execute(params: {
    entityType: string;
    entityId: string;
  }): Promise<Comment[]> {
    const { entityType, entityId } = params;
    return await this.commentRepository.findByEntity(entityType, entityId);
  }
}
