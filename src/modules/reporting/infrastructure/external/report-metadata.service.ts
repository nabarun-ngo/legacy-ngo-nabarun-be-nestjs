import { Injectable } from "@nestjs/common";
import { ReportDefination } from "../../domain/reporting.interface";
import { parseKeyValueConfigs } from "src/shared/utilities/kv-config.util";
import { RemoteConfigService } from "src/modules/shared/firebase/remote-config/remote-config.service";

@Injectable()
export class ReportMetadataService {
    constructor(
        private readonly configService: RemoteConfigService,
    ) { }

    async getReportDefinations(): Promise<ReportDefination[]> {
        const keyValueConfigs = await this.configService.getAllKeyValues()
        const definations = parseKeyValueConfigs(keyValueConfigs['REPORT_DEFINATIONS'].value);
        return definations.map(reportDefination => {
            return {
                reportCode: reportDefination.KEY,
                displayName: reportDefination.VALUE,
                description: reportDefination.DESCRIPTION,
                isActive: reportDefination.ACTIVE,
                requiresApproval: reportDefination.getAttribute<boolean>('IS_APPROVAL_REQUIRED'),
                approverRoles: reportDefination.getAttribute<string[]>('APPROVER_ROLES') || [],
                visibleToRoles: reportDefination.getAttribute<string[]>('VISIBLE_TO_ROLES') || [],
            } as ReportDefination;
        });
    }

    async getReportDefination(reportCode: string): Promise<ReportDefination> {
        const definations = await this.getReportDefinations();
        const reportDefination = definations.find(def => def.reportCode === reportCode);
        if (!reportDefination) {
            throw new Error(`Report defination for ${reportCode} not found`);
        }
        return reportDefination;
    }

    async getAdditionalFieldDef() {
        const keyValueConfigs = await this.configService.getAllKeyValues()
        const ADDITIONAL_FIELDS = parseKeyValueConfigs(keyValueConfigs['ADDITIONAL_FIELDS']?.value);
        return ADDITIONAL_FIELDS.filter(f => f.ACTIVE);
    }
}