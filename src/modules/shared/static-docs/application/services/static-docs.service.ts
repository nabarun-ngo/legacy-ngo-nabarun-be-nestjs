import { Injectable } from "@nestjs/common";
import { RemoteConfigService } from "src/modules/shared/firebase/remote-config/remote-config.service";
import { parseKeyValueConfigs, toKeyValueDto } from "src/shared/utilities/kv-config.util";
import { StaticDocumentDto } from "../../presentation/dto/static-docs.dto";

@Injectable()
export class StaticDocsService {

    constructor(private readonly firebaseConfig: RemoteConfigService,
    ) { }

    async getUserGuides(): Promise<StaticDocumentDto[]> {
        const remoteConfig = await this.firebaseConfig.getAllKeyValues();
        const docLinks = parseKeyValueConfigs(remoteConfig['DOCUMENT_LINKS'].value);

        return docLinks
            .filter(d => d.getAttribute('LINK_TYPE') === 'USER_GUIDES')
            .reduce((acc, curr) => {
                const name = curr.getAttribute<string>('LINK_CATEGORY') || 'General';
                const existingGroup = acc.find(g => g.name === name);

                if (existingGroup) {
                    existingGroup.documents.push(toKeyValueDto(curr));
                } else {
                    acc.push({ name, documents: [toKeyValueDto(curr)] });
                }

                return acc;
            }, [] as StaticDocumentDto[]);
    }

    async getPolicyDocs(): Promise<StaticDocumentDto[]> {
        const remoteConfig = await this.firebaseConfig.getAllKeyValues();
        const docLinks = parseKeyValueConfigs(remoteConfig['DOCUMENT_LINKS'].value);

        return docLinks
            .filter(d => d.getAttribute('LINK_TYPE') === 'POLICY_LINKS')
            .reduce((acc, curr) => {
                const name = curr.getAttribute<string>('LINK_CATEGORY') || 'General';
                const existingGroup = acc.find(g => g.name === name);

                if (existingGroup) {
                    existingGroup.documents.push(toKeyValueDto(curr));
                } else {
                    acc.push({ name, documents: [toKeyValueDto(curr)] });
                }

                return acc;
            }, [] as StaticDocumentDto[]);
    }

    async getStaticLinks(type?: string) {
        const remoteConfig = await this.firebaseConfig.getAllKeyValues();
        const docLinks = parseKeyValueConfigs(remoteConfig['APP_LINKS'].value);
        if (type) {
            return docLinks.filter(f => f.getAttribute('LINK_TYPE') === type).map(toKeyValueDto)
        }
        return docLinks.map(toKeyValueDto)
    }

    async getStaticLink(id: string) {
        const remoteConfig = await this.firebaseConfig.getAllKeyValues();
        const docLinks = parseKeyValueConfigs(remoteConfig['DOCUMENT_LINKS'].value);
        return docLinks.find(f => f.KEY === id)
    }
}
