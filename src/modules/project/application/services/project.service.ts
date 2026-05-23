import { Inject, Injectable } from '@nestjs/common';
import { ProjectDetailDto, CreateProjectDto, UpdateProjectDto, ProjectDetailFilterDto, ProjectRefDataDto } from '../dto/project.dto';
import { ActivityDtoMapper, ProjectDtoMapper } from '../dto/project-dto.mapper';
import { PagedResult } from 'src/shared/models/paged-result';
import { BaseFilter } from 'src/shared/models/base-filter-props';
import { CreateProjectUseCase } from '../use-cases/create-project.use-case';
import { UpdateProjectUseCase } from '../use-cases/update-project.use-case';
import { ACTIVITY_REPOSITORY, type IActivityRepository } from '../../domain/repositories/activity.repository.interface';
import { PROJECT_REPOSITORY, type IProjectRepository } from '../../domain/repositories/project.repository.interface';
import { ActivityDetailDto, ActivityDetailFilterDto, CreateActivityDto, UpdateActivityDto } from '../dto/activity.dto';
import { CreateActivityUseCase } from '../use-cases/create-activity.use-case';
import { UpdateActivityUseCase } from '../use-cases/update-activity.use-case';
import { BusinessException } from 'src/shared/exceptions/business-exception';
import { RemoteConfigService } from 'src/modules/shared/firebase/remote-config/remote-config.service';
import { parseKeyValueConfigs, toKeyValueDto } from 'src/shared/utilities/kv-config.util';

@Injectable()
export class ProjectService {

  constructor(
    private readonly createProjectUseCase: CreateProjectUseCase,
    private readonly createActivityUseCase: CreateActivityUseCase,
    private readonly updateActivityUseCase: UpdateActivityUseCase,
    private readonly updateProjectUseCase: UpdateProjectUseCase,
    @Inject(ACTIVITY_REPOSITORY)
    private readonly activityRepository: IActivityRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
    private readonly remoteConfigService: RemoteConfigService,
  ) { }

  async list(filter: BaseFilter<ProjectDetailFilterDto>): Promise<PagedResult<ProjectDetailDto>> {
    const result = await this.projectRepository.findPaged({
      pageIndex: filter.pageIndex,
      pageSize: filter.pageSize,
      props: filter.props,
    });
    return new PagedResult(
      result.content.map(p => ProjectDtoMapper.toDto(p)),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }

  async getById(id: string): Promise<ProjectDetailDto> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new BusinessException('Project not found with id ' + id);
    }
    return ProjectDtoMapper.toDto(project);
  }

  async create(dto: CreateProjectDto): Promise<ProjectDetailDto> {
    const project = await this.createProjectUseCase.execute(dto);
    return ProjectDtoMapper.toDto(project);
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectDetailDto> {
    const project = await this.updateProjectUseCase.execute({ id, data: dto });
    return ProjectDtoMapper.toDto(project);
  }

  async activityList(projectid: string, baseFilter: BaseFilter<ActivityDetailFilterDto>): Promise<PagedResult<ActivityDetailDto>> {
    const result = await this.activityRepository.findPaged({
      pageIndex: baseFilter.pageIndex,
      pageSize: baseFilter.pageSize,
      props: {
        ...baseFilter.props,
        ...(projectid == undefined || projectid == 'undefined' ? {} : { projectId: projectid })
      },
    });
    return new PagedResult(
      result.content.map(p => ActivityDtoMapper.toDto(p)),
      result.totalSize,
      result.pageIndex,
      result.pageSize,
    );
  }

  async createActivity(id: string, dto: CreateActivityDto): Promise<any> {
    const activity = await this.createActivityUseCase.execute({ ...dto, projectId: id });
    return ActivityDtoMapper.toDto(activity);
  }


  async updateActivity(id: string, activityId: string, dto: UpdateActivityDto): Promise<ActivityDetailDto> {
    const activity = await this.updateActivityUseCase.execute({ activityId, data: dto });
    return ActivityDtoMapper.toDto(activity);
  }

  async getReferenceData(): Promise<ProjectRefDataDto> {
    const configs = await this.remoteConfigService.getAllKeyValues();
    return {
      projectCategories: parseKeyValueConfigs(configs['PROJECT_CATEGORIES'].value).map(toKeyValueDto),
      projectStatuses: parseKeyValueConfigs(configs['PROJECT_STATUSES'].value).map(toKeyValueDto),
      projectPhases: parseKeyValueConfigs(configs['PROJECT_PHASES'].value).map(toKeyValueDto),
      activityScales: parseKeyValueConfigs(configs['PROJECT_ACTIVITY_SCALES'].value).map(toKeyValueDto),
      activityTypes: parseKeyValueConfigs(configs['PROJECT_ACTIVITY_TYPES'].value).map(toKeyValueDto),
      activityPriorities: parseKeyValueConfigs(configs['PROJECT_ACTIVITY_PRIORITIES'].value).map(toKeyValueDto),
      activityStatuses: parseKeyValueConfigs(configs['PROJECT_ACTIVITY_STATUSES'].value).map(toKeyValueDto),
    };
  }
}

