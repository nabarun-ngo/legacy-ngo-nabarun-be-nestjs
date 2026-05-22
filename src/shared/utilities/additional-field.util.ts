import { ApiProperty } from "@nestjs/swagger";
import { FieldDef } from "../models/custom-field-def";
import { KeyValueConfig } from "../models/key-value-config.model";
import { IsArray, IsBoolean, IsString } from "class-validator";


export class FieldAttributeDto {
    @ApiProperty()
    @IsString()
    key: string;

    @ApiProperty()
    @IsString()
    value: string;
    @ApiProperty()
    @IsString()
    type: string;
    @ApiProperty()
    @IsBoolean()
    isMandatory: boolean;
    @ApiProperty()
    @IsArray()
    @IsString({ each: true })
    fieldOptions: string[];
    @ApiProperty()
    @IsString()
    fieldType: string;
    @ApiProperty()
    @IsBoolean()
    isHidden: boolean;
    @ApiProperty()
    @IsBoolean()
    isEncrypted: boolean;
}


export function fieldAttributeDomainToDto(a: KeyValueConfig): FieldAttributeDto {
    return {
        key: a.KEY,
        value: a.VALUE,
        type: a.getAttribute('TYPE'),
        isMandatory: a.getAttribute('MANDATORY'),
        fieldOptions: a.getAttribute('FIELD_OPTIONS'),
        fieldType: a.getAttribute('FIELD_TYPE'),
        isHidden: a.getAttribute('HIDDEN'),
        isEncrypted: a.getAttribute('ENCRYPTED'),
    };
}


export function mapToAdditionalFields(m: FieldDef, additionalFields: KeyValueConfig[]) {
    const field = additionalFields.find(f => f.KEY === m.defKey);
    if (!field) {
        throw new Error(`Additional field not found for key: ${m.defKey}`);
    }
    return new KeyValueConfig({
        KEY: m.key,
        VALUE: m.label,
        DESCRIPTION: '',
        ACTIVE: true,
        ATTRIBUTES: {
            ...field.ATTRIBUTES,
            'MANDATORY': m.mandatory
        }
    });
}