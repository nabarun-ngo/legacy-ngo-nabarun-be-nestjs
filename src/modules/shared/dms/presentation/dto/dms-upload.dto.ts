// dms-upload.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import {
IsArray,
IsBase64,
IsEnum,
IsNotEmpty,
IsString,
} from "class-validator";
import { DocumentMappingRefType } from "../../domain/mapping.model";

export class DmsUploadDto {
  @IsNotEmpty()
  @IsBase64()
  fileBase64: string;

  @IsNotEmpty()
  @IsString()
  filename: string; // example: "document.pdf"

  @IsNotEmpty()
  @IsString()
  contentType: string;

  @IsNotEmpty()
  @IsArray()
  documentMapping: DocMapDto[];
}

export class DocMapDto {
  @ApiProperty({ enum: DocumentMappingRefType })
  @IsNotEmpty()
  @IsString()
  @IsEnum(DocumentMappingRefType)
  entityType: DocumentMappingRefType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  entityId: string;
}
