import { ApiProperty } from "@nestjs/swagger";
import { KeyValueDto } from "src/shared/dto/KeyValue.dto";

export class StaticDocumentDto {
    @ApiProperty()
    name: string;


    @ApiProperty({ type: KeyValueDto, isArray: true })
    documents: KeyValueDto[];
}
