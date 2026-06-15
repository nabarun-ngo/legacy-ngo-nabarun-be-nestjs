import { Inject,Injectable } from "@nestjs/common";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import type { IMeetingRepository } from "../../domain/repositories/meeting.repository.interface";
import { MEETING_REPOSITORY } from "../../domain/repositories/meeting.repository.interface";
import { GoogleCalendarService } from "../../infrastructure/external/google-calendar.service";

@Injectable()
export class DeleteMeetingUseCase implements IUseCase<string, void> {
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: IMeetingRepository,
    private readonly googleCalendarService: GoogleCalendarService,
  ) {}

  async execute(eventId: string): Promise<void> {
    // 1. Delete from Google Calendar
    await this.googleCalendarService.deleteEvent(eventId);

    // 2. Delete from local database (mark as deleted)
    await this.meetingRepository.delete(eventId);
  }
}
