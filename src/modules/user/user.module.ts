import { Global, Module } from '@nestjs/common';
import { UserController } from './presentation/controllers/user.controller';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import UserRepository from './infrastructure/persistence/user.repository';
import { UserEventsHandler } from './application/handlers/user-events.handler';
import { UserJobsHandler } from './application/handlers/user-jobs.handler';
import { Auth0UserService } from './infrastructure/external/auth0-user.service';
import { FirebaseModule } from '../shared/firebase/firebase.module';
import { UserMetadataService } from './infrastructure/external/user-metadata.service';
import { UserService } from './application/services/user.service';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { AssignRoleUseCase } from './application/use-cases/assign-role.use-case';
import { DMSModule } from '../shared/dms/dms.module';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case';
import { AuthModule } from '../shared/auth/auth.module';
import { Auth0UserCreationHandler } from './application/handlers/workflow/auth0-user-creation.handler';
import { UserNotRegisteredTaskHandler } from './application/handlers/workflow/user-not-registered.handler';
import { UserDeleteAndDataCleanupHandler } from './application/handlers/workflow/user-delete-and-data-cleanup.handler';
import { StaticDocsModule } from '../shared/static-docs/static-docs.module';

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
    UserDeleteAndDataCleanupHandler
  ],
  exports: [USER_REPOSITORY, CreateUserUseCase, DeleteUserUseCase],
})
export class UserModule { }
