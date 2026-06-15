import { Inject,Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { ApiKey } from "../../domain/models/api-key.model";
import {
API_KEY_REPOSITORY,
type IApiKeyRepository,
} from "../../domain/repository/api-key.repository.interface";

@Injectable()
export class ApiKeyEventsHandler {
  constructor(
    @Inject(API_KEY_REPOSITORY)
    private readonly apiKeyRepository: IApiKeyRepository,
  ) {}

  @OnEvent("api-key.updated", { async: true })
  async handleApiKeyUsedEvent(event: ApiKey) {
    await this.apiKeyRepository.update(event.id, event);
  }
}
