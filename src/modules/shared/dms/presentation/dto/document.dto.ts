import { ApiProperty,ApiPropertyOptional } from "@nestjs/swagger";

export class DocumentDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  fileName: string;
  @ApiProperty()
  contentType: string;
  @ApiProperty()
  fileSize: number;
  @ApiPropertyOptional()
  fileUrl?: string;
  @ApiProperty()
  isPublic: boolean;
  @ApiProperty({ type: String, format: "date-time" })
  uploadedAt: Date;
}
