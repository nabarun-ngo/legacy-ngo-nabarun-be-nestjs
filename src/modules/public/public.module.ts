import { Module } from "@nestjs/common";
import { UserModule } from "src/modules/user/user.module";
import { WorkflowModule } from "src/modules/workflow/workflow.module";
import { AuthModule } from "../shared/auth/auth.module";
import { FirebaseModule } from "../shared/firebase/firebase.module";
import { ContentService } from "./application/services/content.service";
import { PublicService } from "./application/services/public.service";
import { CallbackController } from "./presentation/controller/callback.controller";
import { HealthController } from "./presentation/controller/health.controller";
import { PublicController } from "./presentation/controller/public.controller";
import { WebhookController } from "./presentation/controller/webhook.controller";

@Module({
  imports: [FirebaseModule, UserModule, WorkflowModule, AuthModule],
  controllers: [
    PublicController,
    CallbackController,
    HealthController,
    WebhookController,
  ],
  providers: [PublicService, ContentService],
  exports: [],
})
export class PublicModule {}
