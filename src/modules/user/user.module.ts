import { Global,Module } from "@nestjs/common";
import { AuthModule } from "../shared/auth/auth.module";
import { DMSModule } from "../shared/dms/dms.module";
import { FirebaseModule } from "../shared/firebase/firebase.module";
import { StaticDocsModule } from "../shared/static-docs/static-docs.module";
import { UserEventsHandler } from "./application/handlers/user-events.handler";
import { UserJobsHandler } from "./application/handlers/user-jobs.handler";
import { Auth0UserCreationHandler } from "./application/handlers/workflow/auth0-user-creation.handler";
import { UserDeleteAndDataCleanupHandler } from "./application/handlers/workflow/user-delete-and-data-cleanup.handler";
import { UserNotRegisteredTaskHandler } from "./application/handlers/workflow/user-not-registered.handler";
import { UserService } from "./application/services/user.service";
import { AssignRoleUseCase } from "./application/use-cases/assign-role.use-case";
import { ChangePasswordUseCase } from "./application/use-cases/change-password.use-case";
import { CreateUserUseCase } from "./application/use-cases/create-user.use-case";
import { DeleteUserUseCase } from "./application/use-cases/delete-user.use-case";
import { UpdateUserUseCase } from "./application/use-cases/update-user.use-case";
import { USER_REPOSITORY } from "./domain/repositories/user.repository.interface";
import { Auth0UserService } from "./infrastructure/external/auth0-user.service";
import { UserMetadataService } from "./infrastructure/external/user-metadata.service";
import UserRepository from "./infrastructure/persistence/user.repository";
import { UserController } from "./presentation/controllers/user.controller";

@Global()
@Module({
  controllers: [UserController],
  imports: [FirebaseModule, DMSModule, AuthModule, StaticDocsModule],
  providers: [
    CreateUserUseCase,
    UpdateUserUseCase,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    Auth0UserService,
    UserEventsHandler,
    UserJobsHandler,
    UserMetadataService,
    UserService,
    AssignRoleUseCase,
    ChangePasswordUseCase,
    DeleteUserUseCase,
    Auth0UserCreationHandler,
    UserNotRegisteredTaskHandler,
    UserDeleteAndDataCleanupHandler,
  ],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
