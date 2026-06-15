import { calendar_v3 } from "@googleapis/calendar";
import { Inject,Injectable,Logger } from "@nestjs/common";
import {
GOOGLE_OAUTH_SERVICE,
OAuthService,
} from "src/modules/shared/auth/application/services";
import { GOOGLE_SCOPES } from "src/modules/shared/auth/scopes";
import { MeetingMapper } from "../mapper/meeting-infra.mapper";

export interface EventData {
  summary?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  status?: string;
  attendees?: string[];
  location?: string;
  timeZone?: string;
  addMeetLink?: boolean;
  eventId?: string;
  meetLink?: string;
  calendarLink?: string;
  meetingOptions?: {
    guestsCanSeeOtherGuests?: boolean;
    guestsCanModify?: boolean;
    guestsCanInviteOthers?: boolean;
    anyoneCanAddSelf?: boolean;
  };
  hostEmail?: string;
  reminders?: {
    method: "popup" | "email";
    minutes: number;
  }[];
}

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private readonly scope = GOOGLE_SCOPES.calendar;

  constructor(
    @Inject(GOOGLE_OAUTH_SERVICE)
    private readonly googleOAuthService: OAuthService,
  ) {}

  /**
   * Create a calendar event with optional Google Meet link
   */
  async createEvent(
    eventData: EventData,
    calendarId: string = "primary",
  ): Promise<EventData> {
    try {
      const auth = await this.googleOAuthService.getAuthenticatedClient(
        this.scope,
      );
      if (!auth) {
        throw new Error("Failed to get authenticated client");
      }
      const calendar = new calendar_v3.Calendar({ auth });

      const event: calendar_v3.Schema$Event = {
        summary: eventData.summary,
        description: eventData.description,
        location: eventData.location,
        attendees: eventData.attendees?.map((email) => ({ email })),
        anyoneCanAddSelf: eventData.meetingOptions?.anyoneCanAddSelf ?? true,
        guestsCanInviteOthers:
          eventData.meetingOptions?.guestsCanInviteOthers ?? true,
        guestsCanModify: eventData.meetingOptions?.guestsCanModify ?? true,
        guestsCanSeeOtherGuests:
          eventData.meetingOptions?.guestsCanSeeOtherGuests ?? true,
        start: {
          dateTime: eventData?.startTime?.toISOString(),
          timeZone: eventData?.timeZone || "Asia/Kolkata",
        },
        end: {
          dateTime: eventData?.endTime?.toISOString(),
          timeZone: eventData?.timeZone || "Asia/Kolkata",
        },
        reminders: {
          ...(eventData?.reminders && eventData?.reminders?.length > 0
            ? { useDefault: false }
            : { useDefault: true }),
          ...(eventData?.reminders && eventData?.reminders?.length > 0
            ? { overrides: eventData?.reminders }
            : {}),
        },
      };

      // Add Google Meet conference if requested
      if (eventData.addMeetLink) {
        event.conferenceData = {
          createRequest: {
            requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }

      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
        conferenceDataVersion: eventData.addMeetLink ? 1 : 0,
        sendUpdates: "all", // Send email notifications to attendees
        auth: auth,
      });
      this.logger.log(`Event created: ${response.data.id}`);
      return MeetingMapper.fromGoogleEventToDto(response.data);
    } catch (error) {
      this.logger.error("Error creating calendar event", error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    updateData: EventData,
    calendarId: string = "primary",
  ): Promise<EventData> {
    try {
      const auth = await this.googleOAuthService.getAuthenticatedClient(
        this.scope,
      );
      if (!auth) {
        throw new Error("Failed to get authenticated client");
      }
      const calendar = new calendar_v3.Calendar({ auth });
      const existingEvent = await calendar.events.get({
        auth,
        calendarId,
        eventId,
      });

      // Prepare updated event data
      const updatedEvent: calendar_v3.Schema$Event = {
        ...existingEvent.data,
        summary: updateData.summary ?? existingEvent.data.summary,
        description: updateData.description ?? existingEvent.data.description,
        location: updateData.location ?? existingEvent.data.location,
      };

      // Update start time if provided
      if (updateData.startTime) {
        updatedEvent.start = {
          dateTime: updateData.startTime.toISOString(),
          timeZone:
            updateData?.timeZone || existingEvent.data.start?.timeZone || "UTC",
        };
      }

      // Update end time if provided
      if (updateData.endTime) {
        updatedEvent.end = {
          dateTime: updateData.endTime.toISOString(),
          timeZone:
            updateData.timeZone || existingEvent.data.end?.timeZone || "UTC",
        };
      }

      // Update attendees if provided
      if (updateData.attendees) {
        updatedEvent.attendees = updateData.attendees.map((email) => ({
          email,
        }));
      }

      const response = await calendar.events.update({
        auth,
        calendarId,
        eventId,
        requestBody: updatedEvent,
        sendUpdates: "all", // Notify attendees of changes
      });

      this.logger.log(`Event updated: ${eventId}`);
      return MeetingMapper.fromGoogleEventToDto(response.data);
    } catch (error) {
      this.logger.error(`Error updating calendar event: ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(
    eventId: string,
    calendarId: string = "primary",
    notifyAttendees: boolean = true,
  ): Promise<void> {
    try {
      const auth = await this.googleOAuthService.getAuthenticatedClient(
        this.scope,
      );
      if (!auth) {
        throw new Error("Failed to get authenticated client");
      }
      const calendar = new calendar_v3.Calendar({ auth });
      await calendar.events.delete({
        auth,
        calendarId,
        eventId,
        sendUpdates: notifyAttendees ? "all" : "none",
      });

      this.logger.log(`Event deleted: ${eventId}`);
    } catch (error) {
      this.logger.error(`Error deleting calendar event: ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Get a specific event
   */
  async getEvent(
    eventId: string,
    calendarId: string = "primary",
  ): Promise<EventData> {
    try {
      const auth = await this.googleOAuthService.getAuthenticatedClient(
        this.scope,
      );
      if (!auth) {
        throw new Error("Failed to get authenticated client");
      }
      const calendar = new calendar_v3.Calendar({ auth });
      const response = await calendar.events.get({
        auth,
        calendarId,
        eventId,
      });

      return MeetingMapper.fromGoogleEventToDto(response.data);
    } catch (error) {
      this.logger.error(`Error fetching calendar event: ${eventId}`, error);
      throw error;
    }
  }

  /**
   * List upcoming events
   */
  async listEvents(
    calendarId: string = "primary",
    maxResults: number = 10,
  ): Promise<EventData[]> {
    try {
      const auth = await this.googleOAuthService.getAuthenticatedClient(
        this.scope,
      );
      if (!auth) {
        throw new Error("Failed to get authenticated client");
      }
      const calendar = new calendar_v3.Calendar({ auth });

      const response = await calendar.events.list({
        auth,
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      return (response.data.items || []).map((item) =>
        MeetingMapper.fromGoogleEventToDto(item),
      );
    } catch (error) {
      this.logger.error("Error listing calendar events", error);
      throw error;
    }
  }
}
