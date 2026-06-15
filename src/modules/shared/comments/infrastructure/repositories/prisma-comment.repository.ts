import { Injectable } from "@nestjs/common";
import { PrismaPostgresService } from "../../../database/prisma-postgres.service";
import { Comment } from "../../domain/model/comment.model";
import { ICommentRepository } from "../../domain/repositories/comment.repository";
import { CommentMapper } from "../mappers/comment.mapper";

@Injectable()
export class PrismaCommentRepository implements ICommentRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}

  async save(comment: Comment): Promise<void> {
    const data = CommentMapper.toPersistence(comment);
    await this.prisma.comment.upsert({
      where: { id: comment.id },
      update: {
        content: data.content,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
      create: {
        ...data,
        version: 0,
      },
    });
  }

  async findById(id: string): Promise<Comment | null> {
    const entity = await this.prisma.comment.findUnique({
      where: { id, deletedAt: null },
      include: {
        author: true,
      },
    });
    return entity ? CommentMapper.fromEntityToModel(entity as any) : null;
  }

  async findByEntity(entityType: string, entityId: string): Promise<Comment[]> {
    const entities = await this.prisma.comment.findMany({
      where: {
        entityType,
        entityId,
        deletedAt: null,
      },
      include: {
        author: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const commentModels = entities.map((e) =>
      CommentMapper.fromEntityToModel(e as any),
    );
    return this.buildCommentTree(commentModels);
  }

  private buildCommentTree(comments: Comment[]): Comment[] {
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];

    comments.forEach((c) => {
      map.set(c.id, c);
      c.setReplies([]);
    });

    comments.forEach((c) => {
      if (c.parentId && map.has(c.parentId)) {
        const parent = map.get(c.parentId)!;
        parent.replies.push(c);
      } else {
        roots.push(c);
      }
    });

    return roots;
  }

  async delete(id: string): Promise<void> {
    await this.softDeleteRecursive(id);
  }

  private async softDeleteRecursive(id: string): Promise<void> {
    const now = new Date();

    // Mark the current comment as deleted
    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: now },
    });

    // Find all immediate children that are not already deleted
    const children = await this.prisma.comment.findMany({
      where: { parentId: id, deletedAt: null },
      select: { id: true },
    });

    // Recursively soft-delete each child
    for (const child of children) {
      await this.softDeleteRecursive(child.id);
    }
  }
}
