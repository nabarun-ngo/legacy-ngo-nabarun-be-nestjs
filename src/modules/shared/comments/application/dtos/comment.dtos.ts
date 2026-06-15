import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty,IsOptional,IsString } from "class-validator";

export class CreateCommentDto {
  @ApiProperty({ description: "The content of the comment (emojis supported)" })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: "The type of entity being commented on" })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: "The ID of the entity being commented on" })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({
    description: "The ID of the parent comment if this is a reply",
  })
  @IsString()
  @IsOptional()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ description: "The updated content of the comment" })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  authorId: string;

  @ApiPropertyOptional()
  authorName?: string;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiPropertyOptional()
  parentId?: string;

  @ApiProperty({ type: () => [CommentResponseDto] })
  replies: CommentResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
