import {
Body,
Controller,
Get,
HttpCode,
HttpStatus,
Param,
Patch,
Post,
Query,
} from "@nestjs/common";
import {
ApiBearerAuth,
ApiOperation,
ApiParam,
ApiQuery,
ApiSecurity,
ApiTags,
} from "@nestjs/swagger";
import { RequirePermissions } from "src/modules/shared/auth/application/decorators/require-permissions.decorator";
import {
ApiAutoPagedResponse,
ApiAutoResponse,
} from "src/shared/decorators/api-auto-response.decorator";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { SuccessResponse } from "src/shared/models/response-model";
import {
ActivityDetailDto,
CreateActivityDto,
UpdateActivityDto,
} from "../../application/dto/activity.dto";
import {
CreateProjectDto,
ProjectDetailDto,
ProjectDetailFilterDto,
ProjectRefDataDto,
UpdateProjectDto,
} from "../../application/dto/project.dto";
import { ProjectService } from "../../application/services/project.service";
import { ActivityFilterProps } from "../../domain/model/activity.model";

@ApiTags(ProjectController.name)
@Controller("projects")
@ApiBearerAuth("jwt")
@ApiSecurity("api-key")
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}
  @Get()
  @ApiOperation({ summary: "List projects with filters and pagination" })
  @RequirePermissions("read:project")
  @ApiQuery({ name: "pageIndex", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiAutoPagedResponse(ProjectDetailDto, {
    description: "Projects retrieved successfully",
    wrapInSuccessResponse: true,
  })
  async listProjects(
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: ProjectDetailFilterDto,
  ): Promise<SuccessResponse<PagedResult<ProjectDetailDto>>> {
    const baseFilter: BaseFilter<ProjectDetailFilterDto> = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      props: filter,
    };
    return new SuccessResponse(await this.projectService.list(baseFilter));
  }

  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions("create:project")
  @ApiOperation({ summary: "Create a new project" })
  @ApiAutoResponse(ProjectDetailDto, {
    status: 201,
    description: "Project created successfully",
    wrapInSuccessResponse: true,
  })
  async createProject(
    @Body() dto: CreateProjectDto,
  ): Promise<SuccessResponse<ProjectDetailDto>> {
    return new SuccessResponse(await this.projectService.create(dto));
  }

  @Patch(":id/update")
  @RequirePermissions("update:project")
  @ApiOperation({ summary: "Update a project" })
  @ApiParam({ name: "id", description: "Project ID" })
  @ApiAutoResponse(ProjectDetailDto, {
    status: 200,
    description: "Project updated successfully",
    wrapInSuccessResponse: true,
  })
  async updateProject(
    @Param("id") id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<SuccessResponse<ProjectDetailDto>> {
    return new SuccessResponse(await this.projectService.update(id, dto));
  }

  @Get(":id")
  @RequirePermissions("read:project")
  @ApiOperation({ summary: "Get project by ID" })
  @ApiParam({ name: "id", description: "Project ID" })
  @ApiAutoResponse(ProjectDetailDto, {
    status: 200,
    description: "Project retrieved successfully",
    wrapInSuccessResponse: true,
  })
  async getProjectById(
    @Param("id") id: string,
  ): Promise<SuccessResponse<ProjectDetailDto>> {
    return new SuccessResponse(await this.projectService.getById(id));
  }

  @Get(":id/activities")
  @RequirePermissions("read:activity")
  @ApiOperation({
    summary: "List project activities with filters and pagination",
  })
  @ApiQuery({ name: "pageIndex", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiAutoPagedResponse(ActivityDetailDto, {
    description: "Project activities retrieved successfully",
    wrapInSuccessResponse: true,
  })
  async listActivities(
    @Param("id") id: string,
    @Query("pageIndex") pageIndex?: number,
    @Query("pageSize") pageSize?: number,
    @Query() filter?: ActivityFilterProps,
  ): Promise<SuccessResponse<PagedResult<ActivityDetailDto>>> {
    const baseFilter: BaseFilter<ActivityFilterProps> = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      props: filter,
    };
    return new SuccessResponse(
      await this.projectService.activityList(id, baseFilter),
    );
  }

  @Post(":id/activity")
  @RequirePermissions("create:activity")
  @ApiOperation({ summary: "create new activity" })
  @ApiAutoResponse(ActivityDetailDto, {
    description: "Project activity created successfully",
    wrapInSuccessResponse: true,
  })
  async createActivity(
    @Param("id") id: string,
    @Body() dto: CreateActivityDto,
  ): Promise<SuccessResponse<ActivityDetailDto>> {
    return new SuccessResponse(
      await this.projectService.createActivity(id, dto),
    );
  }

  @Patch(":id/activity/:activityId")
  @RequirePermissions("update:activity")
  @ApiOperation({ summary: "Update project activity" })
  @ApiAutoResponse(ActivityDetailDto, {
    description: "Project activity updated successfully",
    wrapInSuccessResponse: true,
  })
  async updateActivity(
    @Param("id") id: string,
    @Param("activityId") activityId: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<SuccessResponse<ActivityDetailDto>> {
    return new SuccessResponse(
      await this.projectService.updateActivity(id, activityId, dto),
    );
  }

  @Get("static/referenceData")
  @RequirePermissions("read:project")
  @ApiOperation({ summary: "Get project reference data" })
  @ApiAutoResponse(ProjectRefDataDto, {
    wrapInSuccessResponse: true,
    description: "Project reference data retrieved successfully",
  })
  async getProjectReferenceData(): Promise<SuccessResponse<ProjectRefDataDto>> {
    return new SuccessResponse<ProjectRefDataDto>(
      await this.projectService.getReferenceData(),
    );
  }
}
