import { Inject,Injectable,Logger } from "@nestjs/common";
import { FathomWebhookDto } from "src/modules/public/application/dto/fathom-webhook.dto";
import { ProcessJob } from "src/modules/shared/job-processing/application/decorators/process-job.decorator";
import type { Job } from "src/modules/shared/job-processing/presentation/dto/job.dto";
import { JobName } from "src/shared/job-names";
import {
MEETING_REPOSITORY,
type IMeetingRepository,
} from "../../domain/repositories/meeting.repository.interface";

@Injectable()
export class FathomJobsHandler {
  private readonly logger = new Logger(FathomJobsHandler.name);

  constructor(
    @Inject(MEETING_REPOSITORY)
    private readonly meetingRepo: IMeetingRepository,
  ) {}

  @ProcessJob({
    name: JobName.PROCESS_FATHOM_MEETING_WEBHOOK,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  })
  async processFathomMeetingWebhook(job: Job<FathomWebhookDto>) {
    const payload = job.data;

    const fathomTitle = (payload.meeting_title || payload.title || "").trim();
    job.log(`Starting processing for Fathom Meeting: ${fathomTitle}`);

    if (!payload.scheduled_start_time || !payload.scheduled_end_time) {
      job.log(`Skipping: missing start or end time.`);
      return { success: false, reason: "missing_time" };
    }

    // Fuzzy search by time: +/- 30 minutes from start time and end time
    const startRangeGte = new Date(payload.scheduled_start_time);
    startRangeGte.setMinutes(startRangeGte.getMinutes() - 30);

    const startRangeLte = new Date(payload.scheduled_start_time);
    startRangeLte.setMinutes(startRangeLte.getMinutes() + 10);

    const endRangeGte = new Date(payload.scheduled_end_time);
    endRangeGte.setMinutes(endRangeGte.getMinutes() - 10);

    const endRangeLte = new Date(payload.scheduled_end_time);
    endRangeLte.setMinutes(endRangeLte.getMinutes() + 10);

    const meetings = await this.meetingRepo.findByTimeRange(
      startRangeGte,
      startRangeLte,
      endRangeGte,
      endRangeLte,
    );

    job.log(`Found ${meetings.length} meetings within the time range.`);

    // Further fuzzy search by title
    const fathomTitleLower = fathomTitle.toLowerCase();
    const matchedMeetings = meetings.filter((m) => {
      const summary = (m.summary || "").toLowerCase();
      // Simple substring match in either direction
      return (
        summary.includes(fathomTitleLower) || fathomTitleLower.includes(summary)
      );
    });

    if (matchedMeetings.length === 1) {
      const meeting = matchedMeetings[0];
      job.log(`Unique meeting found: ${meeting.id} - ${meeting.summary}`);

      // Update the meeting with Fathom data using our domain model
      meeting.setMeetingData({
        recordingUrl: payload.share_url, // Assuming payload has summary object/string
        meetingNotes: payload.default_summary?.markdown_formatted ?? undefined, // Assuming payload has transcript object/string
        meetingTranscript: payload.transcript
          ? JSON.stringify(payload.transcript)
          : undefined, // Using URL as share_url
        meetingActionItems: payload.action_items
          ? JSON.stringify(payload.action_items)
          : undefined, // Action items array/object
      });
      await this.meetingRepo.update(meeting.id, meeting);

      this.logger.log(`Meeting ${meeting.id} updated with Fathom details.`);
      job.log(`Successfully mapped Fathom webhook to meeting ${meeting.id}`);
      return { success: true, meetingId: meeting.id };
    } else if (matchedMeetings.length > 1) {
      job.log(
        `Warning: Multiple meetings matched the fuzzy search: ${matchedMeetings.map((m) => m.id).join(", ")}`,
      );
      return { success: false, reason: "multiple_matches" };
    } else {
      job.log(`No unique meeting matched the title: ${fathomTitleLower}`);
      return { success: false, reason: "no_match" };
    }
  }
}
