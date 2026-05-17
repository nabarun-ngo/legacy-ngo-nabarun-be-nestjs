import { SetMetadata, Type } from '@nestjs/common';
import { FieldDef } from 'src/shared/models/custom-field-def';

export const REPORT_PROVIDER_METADATA_KEY = 'REPORT_PROVIDER_METADATA_KEY';


export function ReportProvider(): <T extends Type<IReportProvider<any>>>(target: T) => void {
    return (target: Type<IReportProvider<any>>) => {
        SetMetadata(REPORT_PROVIDER_METADATA_KEY, true)(target);
    };
}


export interface ReportGeneratedData {
    buffer: Buffer;
    fileName: string;
    fileExtension: string;
    contentType: string;
}

export class ReportDefination {
    reportCode: string;
    displayName: string;
    description: string;
    requiresApproval: boolean;
    approverRoles: string[] | undefined;
    visibleToRoles: string[];
    isActive: boolean;
}

export interface IReportProvider<TParams extends Record<string, any> = Record<string, any>> {
    readonly reportCode: string;
    readonly reportParams: FieldDef<Extract<keyof TParams, string>>[];
    generate(params: TParams): Promise<ReportGeneratedData>;
}

