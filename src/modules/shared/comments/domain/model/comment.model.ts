import { randomUUID } from "crypto";
import { AggregateRoot } from "src/shared/models/aggregate-root";

export class Comment extends AggregateRoot<string> {
  #content: string;
  #authorId: string;
  #entityType: string;
  #entityId: string;
  #parentId?: string;
  #replies?: Comment[];
  #authorName?: string;

  constructor(
    id: string,
    content: string,
    authorId: string,
    entityType: string,
    entityId: string,
    parentId?: string,
    createdAt?: Date,
    updatedAt?: Date,
    replies?: Comment[],
    authorName?: string,
  ) {
    super(id, createdAt, updatedAt);
    this.#content = content;
    this.#authorId = authorId;
    this.#entityType = entityType;
    this.#entityId = entityId;
    this.#parentId = parentId;
    this.#replies = replies || [];
    this.#authorName = authorName;
  }

  static create(op: {
    content: string;
    authorId: string;
    entityType: string;
    entityId: string;
    parentId?: string;
  }): Comment {
    return new Comment(
      randomUUID(),
      op.content,
      op.authorId,
      op.entityType,
      op.entityId,
      op.parentId,
    );
  }

  update(content: string): boolean {
    if (this.#content === content) return false;
    this.#content = content;
    this.touch();
    return true;
  }

  get content(): string {
    return this.#content;
  }
  get authorId(): string {
    return this.#authorId;
  }
  get entityType(): string {
    return this.#entityType;
  }
  get entityId(): string {
    return this.#entityId;
  }
  get parentId(): string | undefined {
    return this.#parentId;
  }
  get replies(): Comment[] {
    return this.#replies || [];
  }
  get authorName(): string | undefined {
    return this.#authorName;
  }

  setAuthorName(name: string) {
    this.#authorName = name;
  }

  setReplies(replies: Comment[]) {
    this.#replies = replies;
  }
}
