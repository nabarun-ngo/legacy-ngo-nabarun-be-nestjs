import { Comment } from "../model/comment.model";

export const COMMENT_REPOSITORY = "COMMENT_REPOSITORY";

export interface ICommentRepository {
  save(comment: Comment): Promise<void>;
  findById(id: string): Promise<Comment | null>;
  findByEntity(entityType: string, entityId: string): Promise<Comment[]>;
  delete(id: string): Promise<void>;
}
