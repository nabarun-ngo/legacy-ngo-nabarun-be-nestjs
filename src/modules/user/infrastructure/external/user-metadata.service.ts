import { Injectable,Logger } from "@nestjs/common";
import { RemoteConfigService } from "src/modules/shared/firebase/remote-config/remote-config.service";
import { KeyValueConfig } from "src/shared/models/key-value-config.model";
import {
parsefromString,
parseKeyValueConfigs,
} from "src/shared/utilities/kv-config.util";
import { Role } from "../../domain/model/role.model";

@Injectable()
export class UserMetadataService {
  private readonly logger = new Logger(UserMetadataService.name);
  constructor(private readonly configService: RemoteConfigService) {}

  async getAllRoles(): Promise<Role[]> {
    const remoteConfig = await this.configService.getAllKeyValues();
    const roles = parseKeyValueConfigs(remoteConfig["USER_ROLES"].value);
    return roles.map(
      (r) =>
        new Role(
          "",
          r.KEY,
          r.VALUE,
          r.getAttribute<string>("AUTH0_ROLE"),
          r.getAttribute<boolean>("DEFAULT"),
        ),
    );
  }

  async getReferenceData() {
    const keyValueConfigs = await this.configService.getAllKeyValues();
    const status = parseKeyValueConfigs(
      keyValueConfigs["PROFILE_STATUSES"].value,
    );
    const connections = parseKeyValueConfigs(
      keyValueConfigs["USER_CONNECTIONS"].value,
    );
    const genders = parseKeyValueConfigs(keyValueConfigs["USER_GENDERS"].value);
    const roles = parseKeyValueConfigs(keyValueConfigs["USER_ROLES"].value);
    const titles = parseKeyValueConfigs(keyValueConfigs["USER_TITLES"].value);
    const document_types = parseKeyValueConfigs(
      keyValueConfigs["USER_DOCUMENT_TYPES"].value,
    );
    const countries = parsefromString<KeyValueConfig[]>(
      keyValueConfigs["COUNTRY_LIST"].value,
    );
    const states = parsefromString<KeyValueConfig[]>(
      keyValueConfigs["STATE_LIST"].value,
    );
    const districts = parsefromString<KeyValueConfig[]>(
      keyValueConfigs["DISTRICT_LIST"].value,
    );

    return {
      status: status,
      loginMethods: connections,
      userGenders: genders,
      availableRoles: roles,
      userTitles: titles,
      dialCodes: countries.map(this.mapDialCodeData),
      countryData: countries.map(this.mapData),
      stateData: states.map(this.mapData),
      districtData: districts.map(this.mapData),
      maxUserPerRole: roles.map((m) => this.mapAttributeData(m, "MAX_USER")),
      minUserPerRole: roles.map((m) => this.mapAttributeData(m, "MIN_USER")),
      document_types: document_types.map(this.mapData),
    };
  }
  private mapAttributeData(data: KeyValueConfig, name: string): KeyValueConfig {
    return {
      KEY: data.KEY,
      VALUE: data.getAttribute(name),
      DESCRIPTION: data.VALUE,
      ATTRIBUTES: data.ATTRIBUTES,
      ACTIVE: data.ACTIVE,
    } as KeyValueConfig;
  }

  async getStates(countryCode: string): Promise<KeyValueConfig[]> {
    const keyValueConfigs = await this.configService.getAllKeyValues();
    const states = parsefromString<KeyValueConfig[]>(
      keyValueConfigs["STATE_LIST"].value,
    );
    return states
      .filter((data) => data.ATTRIBUTES["COUNTRYKEY"] === countryCode)
      .map(this.mapData);
  }

  async getDistricts(
    countryCode: string,
    stateCode: string,
  ): Promise<KeyValueConfig[]> {
    const keyValueConfigs = await this.configService.getAllKeyValues();
    const districts = parsefromString<KeyValueConfig[]>(
      keyValueConfigs["DISTRICT_LIST"].value,
    );

    return districts
      .filter(
        (data) =>
          data.ATTRIBUTES["COUNTRYKEY"] === countryCode &&
          data.ATTRIBUTES["STATEKEY"] === stateCode,
      )
      .map(this.mapData);
  }

  private mapData(data: KeyValueConfig): KeyValueConfig {
    return {
      KEY: data.KEY,
      VALUE: data.VALUE,
      DESCRIPTION: `${data.VALUE} (${data.KEY})`,
      ATTRIBUTES: data.ATTRIBUTES,
      ACTIVE: data.ACTIVE,
    } as KeyValueConfig;
  }

  private mapDialCodeData(data: KeyValueConfig): KeyValueConfig {
    return {
      KEY: data.ATTRIBUTES["KEY"],
      VALUE: data.ATTRIBUTES["DIALCODE"],
      DESCRIPTION: `${data.VALUE} (${data.ATTRIBUTES["DIALCODE"]})`,
    } as KeyValueConfig;
  }
}
