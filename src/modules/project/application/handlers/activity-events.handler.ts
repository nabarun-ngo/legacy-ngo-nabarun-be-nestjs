import { Injectable,Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { JobProcessingService } from "src/modules/shared/job-processing/infrastructure/services/job-processing.service";
import { JobName } from "src/shared/job-names";
import { ActivityCompletedEvent } from "../../domain/events/activity-completed.event";

@Injectable()
export class ActivityEventsHandler {
  private readonly logger = new Logger(ActivityEventsHandler.name);

  constructor(private readonly jobProcessingService: JobProcessingService) {}

  @OnEvent(ActivityCompletedEvent.name, { async: true })
  async handleActivityCompletedEvent(event: ActivityCompletedEvent) {
    this.logger.log(
      `Handling ActivityCompletedEvent for activity: ${event.activity.id}`,
    );
    try {
      await this.jobProcessingService.addJob(JobName.TriggerReportJobEvent, {
        reportCode: "ACTIVITY_REPORT",
        params: { activityId: event.activity.id },
      });
      this.logger.log(
        `Successfully enqueued ACTIVITY_REPORT generation for activity: ${event.activity.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue ACTIVITY_REPORT generation for activity: ${event.activity.id}`,
        error,
      );
    }
  }
}
