import { Global,Module } from "@nestjs/common";
import { CreateMeetingUseCase } from "./application/use-cases/create-meeting.use-case";
import { DeleteMeetingUseCase } from "./application/use-cases/delete-meeting.use-case";
import { UpdateMeetingUseCase } from "./application/use-cases/update-meeting.use-case";
import { MeetingController } from "./presentation/controllers/meeting.controller";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { FathomJobsHandler } from "./application/handlers/fathom-jobs.handler";
import { MeetingService } from "./application/service/meeting.service";
import { MEETING_REPOSITORY } from "./domain/repositories/meeting.repository.interface";
import { GoogleCalendarService } from "./infrastructure/external/google-calendar.service";
import MeetingRepository from "./infrastructure/persistence/meeting.repository";

@Global()
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MeetingController],
  providers: [
    // Use Cases
    CreateMeetingUseCase,
    UpdateMeetingUseCase,
    DeleteMeetingUseCase,
    // Infrastructure
    GoogleCalendarService,
    MeetingService,
    {
      provide: MEETING_REPOSITORY,
      useClass: MeetingRepository,
    },
    FathomJobsHandler,
  ],
  exports: [],
})
export class MeetingModule {}
