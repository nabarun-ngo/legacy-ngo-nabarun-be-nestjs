import { Inject,Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";
import { ExplicitParameterValue } from "firebase-admin/remote-config";
import { Cacheable } from "../../database";
import { FIREBASE_ADMIN } from "../firebase-core.module";

export class RemoteConfigParam {
  key: string;
  type: "STRING" | "BOOLEAN" | "NUMBER" | "JSON";
  value: any;
  group: string;
}

@Injectable()
export class RemoteConfigService {
  constructor(@Inject(FIREBASE_ADMIN) private readonly app: admin.app.App) {}

  @Cacheable({ key: "REMOTE_CONFIG_PARAMS", ttl: 15 * 24 * 3600 * 1000 })
  async getAllKeyValues(): Promise<Record<string, RemoteConfigParam>> {
    const remoteConfig = this.app.remoteConfig();
    const template = await remoteConfig.getTemplate();
    const result: Record<string, RemoteConfigParam> = {};
    for (const [key, param] of Object.entries(template.parameters)) {
      result[key] = {
        key: key,
        value: (param.defaultValue as ExplicitParameterValue).value,
        group: "DEFAULT",
        type: param.valueType ?? "STRING",
      };
    }

    for (const [groupkey, group] of Object.entries(template.parameterGroups)) {
      for (const [key, param] of Object.entries(group.parameters)) {
        result[key] = {
          key: key,
          value: (param.defaultValue as ExplicitParameterValue).value,
          group: groupkey,
          type: param.valueType ?? "STRING",
        };
      }
    }
    return result;
  }
}
