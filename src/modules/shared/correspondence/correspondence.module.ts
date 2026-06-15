import { Global, Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { FirebaseModule } from "../firebase/firebase.module";
import { NotificationJobsHandler } from "./application/handlers/notification-jobs.handler";
import { CorrespondenceOrchestrator } from "./application/orchestrator/correspondence-orchestrator";
import { EmailService } from "./application/services/email.service";
import { NotificationService } from "./application/services/notification.service";
import { CreateNotificationUseCase } from "./application/use-cases/create-notification.use-case";
import { IPushNotificationProvider } from "./domain/interfaces/push-notification-provider.interface";
import { IFcmTokenRepository } from "./domain/repositories/fcm-token.repository.interface";
import { INotificationRepository } from "./domain/repositories/notification.repository.interface";
import { IUserNotificationRepository } from "./domain/repositories/user-notification.repository.interface";
import { FirebasePushProvider } from "./infrastructure/external/firebase-push.provider";
import { GmailService } from "./infrastructure/external/gmail.service";
import { MetadataService } from "./infrastructure/external/metadata.service";
import { OneSignalPushProvider } from "./infrastructure/external/onesignal-push.provider";
import { EmailChannel } from "./infrastructure/channels/email.channel";
import { PushInAppChannel } from "./infrastructure/channels/push-inapp.channel";
import { FcmTokenRepository } from "./infrastructure/persistence/fcm-token.repository";
import { NotificationRepository } from "./infrastructure/persistence/notification.repository";
import { UserNotificationRepository } from "./infrastructure/persistence/user-notification.repository";
import { CorrespondenceController } from "./presentation/controllers/correspondence.controller";
import { NotificationController } from "./presentation/controllers/notification.controller";

@Global()
@Module({
  imports: [FirebaseModule, AuthModule, DatabaseModule],
  controllers: [CorrespondenceController, NotificationController],
  providers: [
    // ── Infrastructure: external services ──────────────────────────────────
    GmailService,
    MetadataService,
    {
      provide: IPushNotificationProvider,
      useClass: OneSignalPushProvider,
    },
    OneSignalPushProvider,
    FirebasePushProvider,
    // ── Infrastructure: repositories ───────────────────────────────────────
    {
      provide: INotificationRepository,
      useClass: NotificationRepository,
    },
    {
      provide: IUserNotificationRepository,
      useClass: UserNotificationRepository,
    },
    {
      provide: IFcmTokenRepository,
      useClass: FcmTokenRepository,
    },
    // ── Application: services + use-cases ──────────────────────────────────
    EmailService,
    NotificationService,
    CreateNotificationUseCase,
    // ── Infrastructure: channel adapters ───────────────────────────────────
    EmailChannel,
    PushInAppChannel,
    // ── Application: orchestrator + jobs ───────────────────────────────────
    CorrespondenceOrchestrator,
    NotificationJobsHandler,
  ],
  exports: [EmailService, NotificationService, CorrespondenceOrchestrator],
})
export class CorrespondenceModule {}
