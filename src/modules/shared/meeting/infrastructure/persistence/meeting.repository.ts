import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { PrismaPostgresService } from "../../../database/prisma-postgres.service";
import { Meeting,MeetingFilter } from "../../domain/model/meeting.model";
import { IMeetingRepository } from "../../domain/repositories/meeting.repository.interface";
import { MeetingMapper } from "../mapper/meeting-infra.mapper";

@Injectable()
export default class MeetingRepository implements IMeetingRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}
  async count(filter: MeetingFilter): Promise<number> {
    return await this.prisma.meeting.count({
      where: {
        deletedAt: null,
        ...this.whereQuery(filter),
      },
    });
  }
  async findPaged(
    filter?: BaseFilter<MeetingFilter>,
  ): Promise<PagedResult<Meeting>> {
    const entities = await this.prisma.meeting.findMany({
      where: {
        deletedAt: null,
        ...this.whereQuery(filter?.props!),
      },
      orderBy: { createdAt: "desc" },
      take: filter?.pageSize,
      skip: filter?.pageIndex! * filter?.pageSize!,
    });
    const totalItems = await this.prisma.meeting.count({
      where: {
        deletedAt: null,
        ...this.whereQuery(filter?.props!),
      },
    });
    return {
      content: entities.map((e) => MeetingMapper.fromEntityToModel(e)),
      totalSize: totalItems,
      pageIndex: filter?.pageIndex!,
      pageSize: filter?.pageSize!,
    };
  }

  private whereQuery(filter: MeetingFilter): Prisma.MeetingWhereInput {
    const where: Prisma.MeetingWhereInput = {
      ...(filter?.createdById ? { createdById: filter.createdById } : {}),
      ...(filter?.participantId
        ? { attendees: { contains: filter.participantId } }
        : {}),
      ...(filter?.participantEmail
        ? { attendees: { contains: filter.participantEmail } }
        : {}),
    };
    return where;
  }

  async create(meeting: Meeting): Promise<Meeting> {
    const entity = await this.prisma.meeting.create({
      data: {
        id: meeting.id,
        attendees: JSON.stringify(meeting.attendees),
        extMeetingId: meeting.extMeetingId,
        meetingSummary: meeting.summary,
        meetingDescription: meeting.description,
        meetingAgenda: JSON.stringify(meeting.agenda),
        meetingLocation: meeting.location,
        meetingStartTime: meeting.startTime,
        meetingEndTime: meeting.endTime,
        meetingType: meeting.type,
        status: meeting.status,
        extVideoConferenceLink: meeting.meetLink,
        extHtmlLink: meeting.calendarLink,
        createdAt: meeting.createdAt,
        creatorEmail: meeting.hostEmail,
        createdById: meeting.creator?.id,
        meetingNotes: meeting.meetingNotes
          ? JSON.stringify(meeting.meetingNotes)
          : null,
        meetingTranscript: meeting.meetingTranscript
          ? JSON.stringify(meeting.meetingTranscript)
          : null,
        meetingRecordingUrl: meeting.recordingUrl,
        meetingActionItems: meeting.meetingActionItems
          ? JSON.stringify(meeting.meetingActionItems)
          : null,
      },
    });
    return MeetingMapper.fromEntityToModel(entity);
  }

  async update(id: string, meeting: Meeting): Promise<Meeting> {
    const entity = await this.prisma.meeting.update({
      where: { id },
      data: {
        attendees: JSON.stringify(meeting.attendees),
        meetingSummary: meeting.summary,
        meetingDescription: meeting.description,
        meetingAgenda: JSON.stringify(meeting.agenda),
        meetingOutcomes: meeting.outcomes,
        meetingLocation: meeting.location,
        meetingStartTime: meeting.startTime,
        meetingEndTime: meeting.endTime,
        status: meeting.status,
        extVideoConferenceLink: meeting.meetLink,
        extHtmlLink: meeting.calendarLink,
        meetingNotes: meeting.meetingNotes
          ? JSON.stringify(meeting.meetingNotes)
          : null,
        meetingTranscript: meeting.meetingTranscript
          ? JSON.stringify(meeting.meetingTranscript)
          : null,
        meetingRecordingUrl: meeting.recordingUrl,
        meetingActionItems: meeting.meetingActionItems
          ? JSON.stringify(meeting.meetingActionItems)
          : null,
      },
    });
    return MeetingMapper.fromEntityToModel(entity);
  }

  async findById(id: string): Promise<Meeting | null> {
    const entity = await this.prisma.meeting.findUnique({
      where: { id },
    });
    return entity ? MeetingMapper.fromEntityToModel(entity) : null;
  }

  async findByExtId(extId: string): Promise<Meeting | null> {
    const entity = await this.prisma.meeting.findUnique({
      where: { extMeetingId: extId },
    });
    return entity ? MeetingMapper.fromEntityToModel(entity) : null;
  }

  async findByTimeRange(
    startGte: Date,
    startLte: Date,
    endGte: Date,
    endLte: Date,
  ): Promise<Meeting[]> {
    const entities = await this.prisma.meeting.findMany({
      where: {
        deletedAt: null,
        meetingStartTime: {
          gte: startGte,
          lte: startLte,
        },
        meetingEndTime: {
          gte: endGte,
          lte: endLte,
        },
      },
    });
    return entities.map((e) => MeetingMapper.fromEntityToModel(e));
  }

  async findAll(filter?: MeetingFilter): Promise<Meeting[]> {
    const entities = await this.prisma.meeting.findMany({
      where: {
        deletedAt: null,
        ...this.whereQuery(filter!),
      },
      orderBy: { createdAt: "desc" },
    });
    return entities.map((e) => MeetingMapper.fromEntityToModel(e));
  }

  async delete(extId: string): Promise<void> {
    await this.prisma.meeting.update({
      where: { extMeetingId: extId },
      data: { deletedAt: new Date(), status: "DELETED" },
    });
  }
}
