import { IRepository } from "src/shared/interfaces/repository.interface";
import { Activity,ActivityFilterProps } from "../model/activity.model";

export interface IActivityRepository
  extends IRepository<Activity, string, ActivityFilterProps> {
  findById(id: string): Promise<Activity | null>;
  findByProjectId(projectId: string): Promise<Activity[]>;
  findByStatus(status: string): Promise<Activity[]>;
  findByScale(scale: string): Promise<Activity[]>;
  findByType(type: string): Promise<Activity[]>;
  findByAssignedTo(userId: string): Promise<Activity[]>;
  findByOrganizerId(organizerId: string): Promise<Activity[]>;
  findByParentActivityId(parentActivityId: string): Promise<Activity[]>;
  create(activity: Activity): Promise<Activity>;
  update(id: string, activity: Activity): Promise<Activity>;
  delete(id: string): Promise<void>;
  findAll(filter?: ActivityFilterProps): Promise<Activity[]>;
}

export const ACTIVITY_REPOSITORY = Symbol("ACTIVITY_REPOSITORY");
