import { Meeting } from "../../domain/model/meeting.model";
import { MeetingDto } from "./meetings.dto";

export function toMeetingDto(model: Meeting): MeetingDto {
  return {
    id: model.id,
    summary: model.summary,
    description: model.description,
    agenda: model.agenda,
    outcomes: model.outcomes,
    location: model.location,
    startTime: model.startTime,
    endTime: model.endTime,
    attendees: model.attendees,
    meetLink: model.meetLink,
    calendarLink: model.calendarLink!,
    status: model.status,
    type: model.type,
    hostEmail: model.hostEmail,
  };
}
