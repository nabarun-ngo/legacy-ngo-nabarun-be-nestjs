import { Injectable } from "@nestjs/common";
import { existsSync,readFileSync } from "fs";
import Handlebars from "handlebars";
import { join } from "path";
import { RemoteConfigService } from "src/modules/shared/firebase/remote-config/remote-config.service";
import { mapToAdditionalFields } from "src/shared/utilities/additional-field.util";
import {
parsefromString,
parseKeyValueConfigs,
} from "src/shared/utilities/kv-config.util";
import { WorkflowDefinition } from "../../domain/vo/workflow-def.vo";

@Injectable()
export class WorkflowDefService {
  constructor(private readonly remoteConfig: RemoteConfigService) {}

  async findWorkflowByType(type: string, context?: Record<string, unknown>) {
    let value = await this.getWorkflowConfigValue(type);

    if (value == null) {
      throw new Error(`Workflow definition not found for type: ${type}`);
    }
    if (context) {
      const template = Handlebars.compile(value);
      value = template(context);
    }
    return parsefromString<WorkflowDefinition>(value);
  }

  async getAdditionalFields(type: string, stepId?: string, taskId?: string) {
    const def = await this.findWorkflowByType(type);
    const defFields =
      stepId && taskId
        ? (def.steps
            .find((s) => s.stepId === stepId)
            ?.tasks.find((t) => t.taskId === taskId)?.taskDetail?.fields ?? [])
        : def.fields;
    const additionalFields = (
      await this.getWorkflowRefData()
    ).additionalFields.filter((f) => f.ACTIVE);
    const requiredFields = defFields.map((m) =>
      mapToAdditionalFields(m, additionalFields),
    );
    return [...requiredFields];
  }

  async getWorkflowRefData() {
    const config = await this.remoteConfig.getAllKeyValues();

    const WORKFLOW_TYPES = parseKeyValueConfigs(
      config["WORKFLOW_TYPES"]?.value,
    );
    const ADDITIONAL_FIELDS = parseKeyValueConfigs(
      config["ADDITIONAL_FIELDS"]?.value,
    );
    const WORKFLOW_STATUS = parseKeyValueConfigs(
      config["WORKFLOW_STATUS"]?.value,
    );

    const WORKFLOW_STEP_STATUS = parseKeyValueConfigs(
      config["WORKFLOW_STEP_STATUS"]?.value,
    );
    const WORKFLOW_TASK_STATUS = parseKeyValueConfigs(
      config["WORKFLOW_TASK_STATUS"]?.value,
    );
    const WORKFLOW_TASK_TYPE = parseKeyValueConfigs(
      config["WORKFLOW_TASK_TYPE"]?.value,
    );
    return {
      workflowTypes: WORKFLOW_TYPES,
      visibleWorkflowTypes: WORKFLOW_TYPES.filter(
        (w) => w.getAttribute<boolean>("IS_VISIBLE") === true,
      ),
      additionalFields: ADDITIONAL_FIELDS,
      workflowStatus: WORKFLOW_STATUS,
      workflowStepStatus: WORKFLOW_STEP_STATUS,
      workflowTaskStatus: WORKFLOW_TASK_STATUS,
      workflowTaskType: WORKFLOW_TASK_TYPE,
      visibleTaskStatus: WORKFLOW_TASK_STATUS.filter(
        (w) => w.getAttribute<boolean>("IS_VISIBLE") === true,
      ),
    };
  }

  private async getWorkflowConfigValue(
    key: string,
  ): Promise<string | undefined> {
    // For local development, allow fetching from local templates
    if (process.env.LOCAL_WORKFLOW_DEF) {
      console.log(`Fetching workflow config for key: ${key}`);
      const localPath = join(
        process.cwd(),
        "src/modules/workflow/infrastructure/templates",
        `${key}.json`,
      );
      if (existsSync(localPath)) {
        return readFileSync(localPath, "utf8");
      }
    }
    const config = (await this.remoteConfig.getAllKeyValues())[key];
    return config?.value;
  }
}
