import { Inject,Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DateTime } from "luxon";
import { BusinessException } from "src/shared/exceptions/business-exception";
import { IUseCase } from "src/shared/interfaces/use-case.interface";
import { Meeting } from "../../domain/model/meeting.model";
import type { IMeetingRepository } from "../../domain/repositories/meeting.repository.interface";
import { MEETING_REPOSITORY } from "../../domain/repositories/meeting.repository.interface";
import { GoogleCalendarService } from "../../infrastructure/external/google-calendar.service";
import { UpdateEventDto } from "../dto/meetings.dto";

export interface UpdateMeetingRequest {
  id: string;
  updateData: UpdateEventDto;
}

@Injectable()
export class UpdateMeetingUseCase
  implements IUseCase<UpdateMeetingRequest, Meeting>
{
  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepository: IMeetingRepository,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(request: UpdateMeetingRequest): Promise<Meeting> {
    const { id, updateData } = request;

    const existingMeeting = await this.meetingRepository.findById(id);
    if (!existingMeeting) {
      throw new BusinessException("Meeting not found locally");
    }

    const needUpdate = existingMeeting.update({
      summary: updateData.summary,
      agenda: updateData.agenda,
      attendees: updateData.attendees,
      description: updateData.description,
      startTime: updateData.startTime
        ? DateTime.fromISO(updateData.startTime, {
            zone: "Asia/Kolkata",
          }).toJSDate()
        : undefined,
      endTime: updateData.endTime
        ? DateTime.fromISO(updateData.endTime, {
            zone: "Asia/Kolkata",
          }).toJSDate()
        : undefined,
      location: updateData.location,
      outcomes: updateData.outcomes,
    });
    console.log(`needUpdate: ${needUpdate}`);
    if (needUpdate && !updateData.cancelEvent) {
      // 1. Update in Google Calendar
      const googleEvent = await this.googleCalendarService.updateEvent(
        existingMeeting.extMeetingId!,
        {
          summary: updateData.summary,
          description:
            `${updateData.description ?? existingMeeting.description}\n\n` +
            "Agenda: " +
            updateData.agenda
              ?.map((agenda, index) => `\n${index + 1}. ${agenda.agenda}`)
              .join("\n"),
          startTime: updateData.startTime
            ? DateTime.fromISO(updateData.startTime, {
                zone: "Asia/Kolkata",
              }).toJSDate()
            : undefined,
          endTime: updateData.endTime
            ? DateTime.fromISO(updateData.endTime, {
                zone: "Asia/Kolkata",
              }).toJSDate()
            : undefined,
          location: updateData.location,
          attendees: updateData.attendees?.map((attendee) => attendee.email),
        },
      );

      existingMeeting.update({
        status: googleEvent.status,
      });
    } else if (updateData.cancelEvent) {
      await this.googleCalendarService.deleteEvent(
        existingMeeting.extMeetingId!,
      );
      existingMeeting.update({
        status: "cancelled",
      });
    }

    // 4. Save to Repository
    const savedMeeting = await this.meetingRepository.update(
      existingMeeting.id,
      existingMeeting,
    );
    // Emit domain events
    for (const event of existingMeeting.domainEvents) {
      this.eventEmitter.emit(event.constructor.name, event);
    }
    existingMeeting.clearEvents();
    return savedMeeting;
  }
}
