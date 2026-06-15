import { Injectable } from "@nestjs/common";

import { RemoteConfigService } from "src/modules/shared/firebase/remote-config/remote-config.service";
import {
parsefromString,
parseKeyValueConfigs,
} from "src/shared/utilities/kv-config.util";

@Injectable()
export class ContentService {
  constructor(private readonly remoteConfig: RemoteConfigService) {}

  async getPublicContent(): Promise<any> {
    const configs = await this.remoteConfig.getAllKeyValues();
    let contentsStr = configs["PUBLIC_CONTENT"].value;
    const doc_list = parseKeyValueConfigs(configs["DOCUMENT_LINKS"].value);

    doc_list.forEach((doc) => {
      contentsStr = contentsStr.replace(
        new RegExp(`{{${doc.KEY}}}`, "g"),
        doc.VALUE,
      );
    });

    const contents = parsefromString<any>(contentsStr);
    contents["COUNTRY_LIST"] = parsefromString<any>(
      configs["COUNTRY_LIST"].value,
    );
    return contents;
  }
}
