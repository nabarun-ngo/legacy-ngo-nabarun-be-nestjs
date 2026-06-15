import { Comment as CommentEntity,UserProfile } from "@prisma/client";
import { Comment } from "../../domain/model/comment.model";

export class CommentMapper {
  static fromEntityToModel(
    entity: CommentEntity & { author?: UserProfile; replies?: any[] },
  ): Comment {
    const comment = new Comment(
      entity.id,
      entity.content,
      entity.authorId,
      entity.entityType,
      entity.entityId,
      entity.parentId ?? undefined,
      entity.createdAt,
      entity.updatedAt,
      entity.replies?.map((reply) => this.fromEntityToModel(reply)) ?? [],
    );

    if (entity.author) {
      const fullName = [
        entity.author.firstName,
        entity.author.middleName,
        entity.author.lastName,
      ]
        .filter(Boolean)
        .join(" ");
      comment.setAuthorName(fullName);
    }

    return comment;
  }

  static toPersistence(comment: Comment): any {
    return {
      id: comment.id,
      content: comment.content,
      authorId: comment.authorId,
      entityType: comment.entityType,
      entityId: comment.entityId,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}
