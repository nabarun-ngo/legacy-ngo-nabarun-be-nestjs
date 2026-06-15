import { Inject,Injectable,Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DateTime } from "luxon";
import { Configkey } from "src/shared/config-keys";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import { isTrue } from "src/shared/utilities/common.util";
import { Meeting,MeetingType } from "../../domain/model/meeting.model";
import type { IMeetingRepository } from "../../domain/repositories/meeting.repository.interface";
import { MEETING_REPOSITORY } from "../../domain/repositories/meeting.repository.interface";
import { GoogleCalendarService } from "../../infrastructure/external/google-calendar.service";
import {
CreateMeetingDto,
MeetingParticipantDto
} from "../dto/meetings.dto";

@Injectable()
export class CreateMeetingUseCase
  implements
    IUseCase<{ request: CreateMeetingDto; creatorId?: string }, Meeting>
{
  private readonly logger = new Logger(CreateMeetingUseCase.name);

  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: IMeetingRepository,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async execute({
    request,
    creatorId,
  }: {
    request: CreateMeetingDto;
    creatorId?: string;
  }): Promise<Meeting> {
    // 1. Create in Google Calendar
    const googleEvent = await this.googleCalendarService.createEvent({
      summary: request.summary,
      description: request.description
        ? `${request.description}\n\n`
        : "" +
          "Agenda: " +
          request.agenda
            ?.map((agenda, index) => `\n${index + 1}. ${agenda.agenda}`)
            .join("\n"),
      startTime: DateTime.fromISO(request.startTime, {
        zone: "Asia/Kolkata",
      }).toJSDate(),
      endTime: DateTime.fromISO(request.endTime, {
        zone: "Asia/Kolkata",
      }).toJSDate(),
      attendees: this.prepareAttendees(request.attendees),
      location: request.location,
      timeZone: "Asia/Kolkata",
      addMeetLink: request.type == MeetingType.ONLINE,
      meetingOptions: {
        guestsCanSeeOtherGuests: true,
        guestsCanModify: true,
        guestsCanInviteOthers: true,
        anyoneCanAddSelf: true,
      },
      reminders:
        request.type == MeetingType.ONLINE
          ? [
              {
                method: "popup",
                minutes: 10,
              },
              {
                method: "popup",
                minutes: 30,
              },
              {
                method: "popup",
                minutes: 60,
              },
              {
                method: "email",
                minutes: 60,
              },
            ]
          : [
              {
                method: "popup",
                minutes: 1 * 60,
              },
              {
                method: "popup",
                minutes: 2 * 60,
              },
              {
                method: "popup",
                minutes: 4 * 60,
              },
              {
                method: "popup",
                minutes: 6 * 60,
              },
              {
                method: "email",
                minutes: 6 * 60,
              },
            ],
    });

    // 2. Create Domain Model
    const meeting = Meeting.create({
      agenda: request.agenda ?? [],
      description: request.description ?? "",
      location: request.location ?? "",
      summary: request.summary,
      type: request.type,
      startTime: DateTime.fromISO(request.startTime, {
        zone: "Asia/Kolkata",
      }).toJSDate(),
      endTime: DateTime.fromISO(request.endTime, {
        zone: "Asia/Kolkata",
      }).toJSDate(),
      attendees: request.attendees,
      status: googleEvent.status ?? "",
      hostEmail: googleEvent.hostEmail,
      creator: { id: creatorId },
    });

    meeting.addExtEvent(
      googleEvent.eventId!,
      googleEvent.meetLink!,
      googleEvent.calendarLink!,
    );

    // 3. Save to Repository
    const savedMeeting = await this.meetingRepository.create(meeting);

    // Emit domain events
    for (const event of meeting.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    meeting.clearEvents();

    return savedMeeting;
  }

  private prepareAttendees(
    attendees: MeetingParticipantDto[],
  ): string[] | undefined {
    const isProdEnv = this.configService.get(Configkey.ENVIRONMENT) == "prod";

    const isProdMode = isTrue(
      this.configService.get(Configkey.ENABLE_PROD_MODE),
    );

    if (isProdEnv || isProdMode) {
      return attendees.map((attendee) => attendee.email);
    }

    const mockedEmail = this.configService.get<string>(
      Configkey.MOCKED_EMAIL_ADDRESS,
    );

    this.logger.warn(`📧 Mocking email. Redirecting to ${mockedEmail}`);

    return [mockedEmail!];
  }
}
