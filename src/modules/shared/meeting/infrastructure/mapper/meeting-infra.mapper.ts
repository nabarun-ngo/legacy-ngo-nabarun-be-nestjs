import { calendar_v3 } from "@googleapis/calendar";
import { Meeting as MeetingEntity } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database";
import {
AgendaItem,
Meeting,
MeetingType,
Participant,
} from "../../domain/model/meeting.model";
import { EventData } from "../external/google-calendar.service";

export class MeetingMapper {
  static fromGoogleEventToDto(event: calendar_v3.Schema$Event): EventData {
    const meetLink =
      event.hangoutLink ||
      event.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === "video",
      )?.uri;
    return {
      eventId: event.id ?? "",
      summary: event.summary ?? "(No title)",
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      startTime: new Date(event.start?.dateTime || event.start?.date || ""),
      endTime: new Date(event.end?.dateTime || event.end?.date || ""),
      attendees:
        event.attendees?.map((a) => a.email).filter((e): e is string => !!e) ??
        [],
      meetLink: meetLink ?? undefined,
      calendarLink: event.htmlLink ?? "",
      status: event.status ?? "unknown",
      timeZone: event.start?.timeZone ?? "UTC",
      hostEmail: event.creator?.email,
    };
  }

  static fromEntityToModel(entity: MeetingEntity): Meeting {
    const meeting = new Meeting(
      entity.id,
      entity.meetingSummary,
      entity.meetingType as MeetingType,
      entity.meetingDescription ?? "",
      new Date(entity.meetingStartTime!),
      new Date(entity.meetingEndTime!),
      entity.meetingAgenda?.startsWith("[")
        ? (JSON.parse(entity.meetingAgenda ?? "[]") as AgendaItem[])
        : [],
      entity.status,
      entity.meetingLocation ?? "",
      JSON.parse(entity.attendees ?? "[]") as Participant[], //Attendees fix later
      MapperUtils.nullToUndefined(entity.creatorEmail),
      { id: MapperUtils.nullToUndefined(entity.createdById) },
      entity.extHtmlLink ?? "",
      entity.extMeetingId ?? "",
      entity.meetingOutcomes ?? "",
      entity.extVideoConferenceLink ?? "",
      entity.createdAt,
      entity.updatedAt,
    );

    if (
      entity.meetingNotes ||
      entity.meetingTranscript ||
      entity.meetingActionItems
    ) {
      meeting.setMeetingData({
        recordingUrl: entity.meetingRecordingUrl ?? "",
        meetingNotes: entity.meetingNotes ?? "",
        meetingTranscript: entity.meetingTranscript ?? "",
        meetingActionItems: entity.meetingActionItems ?? "",
      });
    }

    return meeting;
  }
}
