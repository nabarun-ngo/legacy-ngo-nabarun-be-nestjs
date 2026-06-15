import { IRepository } from "src/shared/interfaces/repository.interface";
import { Meeting,MeetingFilter } from "../model/meeting.model";

export const MEETING_REPOSITORY = "MEETING_REPOSITORY";

export interface IMeetingRepository
  extends IRepository<Meeting, string, MeetingFilter> {
  findByExtId(extId: string): Promise<Meeting | null>;
  findByTimeRange(
    startGte: Date,
    startLte: Date,
    endGte: Date,
    endLte: Date,
  ): Promise<Meeting[]>;
}
