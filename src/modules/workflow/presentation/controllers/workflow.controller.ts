import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../shared/models/response-model';
import { StartWorkflowDto, TaskFilterDto, UpdateTaskDto, WorkflowFilterDto, WorkflowInstanceDto, WorkflowRefDataDto, WorkflowTaskDto } from '../../application/dto/workflow.dto';
import { WorkflowService } from '../../application/services/workflow.service';
import { CurrentUser } from 'src/modules/shared/auth/application/decorators/current-user.decorator';
import { type AuthUser } from 'src/modules/shared/auth/domain/models/api-user.model';
import { PagedResult } from 'src/shared/models/paged-result';
import { RequireAllPermissions } from 'src/modules/shared/auth/application/decorators/require-permissions.decorator';
import { ApiAutoResponse, ApiAutoPagedResponse, ApiAutoPrimitiveResponse } from 'src/shared/decorators/api-auto-response.decorator';
import { WorkflowTask, WorkflowTaskStatus, WorkflowTaskType } from '../../domain/model/workflow-task.model';
import { ApiSecurity } from '@nestjs/swagger';
import { FieldAttributeDto } from 'src/shared/utilities/additional-field.util';

@ApiTags(WorkflowController.name)
@ApiBearerAuth('jwt')
@Controller('workflows')
@ApiSecurity('api-key')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
  ) { }

  @RequireAllPermissions('create:workflow')
  @Post('create')
  @ApiOperation({ summary: 'Start a new workflow instance' })
  @ApiAutoResponse(WorkflowInstanceDto, { status: 201, description: 'Workflow started successfully' })
  async startWorkflow(@Body() dto: StartWorkflowDto, @CurrentUser() user: AuthUser): Promise<SuccessResponse<WorkflowInstanceDto>> {
    const result = await this.workflowService.createWorkflow(dto, user);
    return new SuccessResponse<WorkflowInstanceDto>(result);
  }


  @RequireAllPermissions('update:task')
  @Post(':id/tasks/:taskId/update')
  @ApiOperation({ summary: 'Update a workflow task' })
  @ApiAutoResponse(WorkflowTaskDto, { status: 200, description: 'Task updated successfully' })
  async updateTask(@Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto, @CurrentUser() user: AuthUser): Promise<SuccessResponse<WorkflowTaskDto>> {
    const result = await this.workflowService.updateTask(id, taskId, dto, user);
    return new SuccessResponse<WorkflowTaskDto>(result);
  }

  @RequireAllPermissions('update:task')
  @Post(':id/tasks/:taskId/reassign')
  @ApiOperation({ summary: 'Reassign a workflow task' })
  @ApiAutoResponse(WorkflowTaskDto, { status: 200, description: 'Task reassigned successfully' })
  @ApiQuery({ name: 'userId', required: false, description: 'User ID to reassign the task to' })
  @ApiQuery({ name: 'fromDefinition', required: false, description: 'Reassign based on workflow definition roles' })
  async reassignTask(@Param('id') id: string,
    @Param('taskId') taskId: string,
    @Query('fromDefinition') fromDefinition: boolean,
    @Query('userId') userId?: string,
  ): Promise<SuccessResponse<WorkflowTaskDto>> {
    const result = await this.workflowService.reassignTask(id, taskId, userId, fromDefinition);
    return new SuccessResponse<WorkflowTaskDto>(result);
  }


  @RequireAllPermissions('read:workflow')
  @Get(':id/instance')
  @ApiOperation({ summary: 'Get workflow instance by ID' })
  @ApiAutoResponse(WorkflowInstanceDto, { description: 'Workflow instance retrieved successfully' })
  async getInstance(@Param('id') id: string): Promise<SuccessResponse<WorkflowInstanceDto>> {
    const instance = await this.workflowService.getWorkflow(id, true);
    if (!instance) {
      throw new Error('Workflow instance not found');
    }
    return new SuccessResponse<WorkflowInstanceDto>(instance);
  }

  @RequireAllPermissions('read:workflow')
  @Get('instances/forMe')
  @ApiOperation({ summary: 'List workflow instances' })
  @ApiAutoPagedResponse(WorkflowInstanceDto, { description: 'Workflow instances retrieved successfully', wrapInSuccessResponse: true })
  @ApiQuery({ name: 'pageIndex', required: false, type: Number, description: 'Index of the page to retrieve' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Count of content to load per page' })
  async listInstancesForMe(
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @CurrentUser() user?: AuthUser,
    @Query() filter?: WorkflowFilterDto,
  ): Promise<SuccessResponse<PagedResult<WorkflowInstanceDto>>> {
    const instances =
      await this.workflowService.getWorkflows({
        pageIndex: pageIndex,
        pageSize: pageSize,
        props: {
          initiatedFor: user?.profile_id,
          ...filter,
          delegated: filter?.delegated ? (filter?.delegated === 'Y') : undefined,
        }
      })
    return new SuccessResponse<PagedResult<WorkflowInstanceDto>>(instances);
  }

  @RequireAllPermissions('read:workflow')
  @Get('instances/byMe')
  @ApiOperation({ summary: 'List workflow instances' })
  @ApiAutoPagedResponse(WorkflowInstanceDto, { description: 'Workflow instances retrieved successfully' })
  @ApiQuery({ name: 'pageIndex', required: false, type: Number, description: 'Index of the page to retrieve' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Count of content to load per page' })
  async listInstancesByMe(
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @Query() filter?: WorkflowFilterDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<SuccessResponse<PagedResult<WorkflowInstanceDto>>> {
    const instances =
      await this.workflowService.getWorkflows({
        pageIndex: pageIndex,
        pageSize: pageSize,
        props: {
          initiatedBy: user?.profile_id,
          ...filter,
          delegated: filter?.delegated ? (filter?.delegated === 'Y') : undefined,
        }
      })
    return new SuccessResponse<PagedResult<WorkflowInstanceDto>>(instances);
  }

  @RequireAllPermissions('read:task')
  @Get('tasks/forMe')
  @ApiOperation({ summary: 'List workflow tasks', description: 'Filter by completed (set true to get completed tasks, set false to get pending tasks)' })
  @ApiAutoPagedResponse(WorkflowTaskDto, { description: 'Workflow tasks retrieved successfully' })
  @ApiQuery({ name: 'pageIndex', required: false, type: Number, description: 'Index of the page to retrieve' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Count of content to load per page' })
  async listTasks(
    @Query() filter: TaskFilterDto,
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @CurrentUser() user?: AuthUser,
  ): Promise<SuccessResponse<PagedResult<WorkflowTaskDto>>> {

    const instances =
      await this.workflowService.getWorkflowTasks({
        pageIndex: pageIndex,
        pageSize: pageSize,
        props: {
          assignedTo: user?.profile_id,
          status: filter.completed === 'Y' ? WorkflowTask.completedTaskStatus : WorkflowTask.pendingTaskStatus,
          type: filter.type,
          workflowId: filter.workflowId,
          taskId: filter.taskId,
        }
      })
    return new SuccessResponse<PagedResult<WorkflowTaskDto>>(instances);
  }

  @RequireAllPermissions('read:task')
  @Get('tasks/automatic')
  @ApiOperation({ summary: 'List automatic workflow tasks' })
  @ApiAutoPagedResponse(WorkflowTaskDto, { description: 'Workflow tasks retrieved successfully' })
  @ApiQuery({ name: 'pageIndex', required: false, type: Number, description: 'Index of the page to retrieve' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Count of content to load per page' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Status of the task' })
  async listAutomaticTasks(
    @Query('pageIndex') pageIndex?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: WorkflowTaskStatus,
  ): Promise<SuccessResponse<PagedResult<WorkflowTaskDto>>> {
    const instances =
      await this.workflowService.getWorkflowTasks({
        pageIndex: pageIndex,
        pageSize: pageSize,
        props: {
          type: [WorkflowTaskType.AUTOMATIC],
          status: status ? [status] : undefined,
        }
      })
    return new SuccessResponse<PagedResult<WorkflowTaskDto>>(instances);
  }

  @Post(':id/tasks/:taskId/processTask')
  @ApiOperation({ summary: 'Process a workflow task' })
  @ApiAutoPrimitiveResponse('string', { description: 'Task processed successfully' })
  async processTask(@Param('id') id: string,
    @Param('taskId') taskId: string): Promise<SuccessResponse<WorkflowTaskDto>> {
    return new SuccessResponse<WorkflowTaskDto>(
      await this.workflowService.processAutomaticTask(id, taskId)
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a workflow instance' })
  @ApiAutoResponse(WorkflowInstanceDto, { description: 'Workflow instance cancelled successfully' })
  @ApiQuery({ name: 'reason', required: true, description: 'Reason for cancellation' })
  async cancelWorkflow(@Param('id') id: string, @Query('reason') reason: string, @CurrentUser() user: AuthUser): Promise<SuccessResponse<WorkflowInstanceDto>> {
    const result = await this.workflowService.cancelWorkflow(id, reason, user);
    return new SuccessResponse<WorkflowInstanceDto>(result);
  }

  @Get('static/referenceData')
  @ApiOperation({ summary: 'Get static reference data' })
  @ApiAutoResponse(WorkflowRefDataDto, { description: 'Static reference data retrieved successfully' })
  async workflowReferenceData(): Promise<SuccessResponse<WorkflowRefDataDto>> {
    return new SuccessResponse<WorkflowRefDataDto>(
      await this.workflowService.getWorkflowRefData()
    );
  }

  @Get('static/additionalFields')
  @ApiOperation({ summary: 'Get additional fields for a workflow type' })
  @ApiAutoResponse(FieldAttributeDto, { description: 'Additional fields retrieved successfully', wrapInSuccessResponse: true, isArray: true })
  @ApiQuery({ name: 'workflowType', required: true, description: 'Workflow type' })
  @ApiQuery({ name: 'stepId', required: false, description: 'Step ID' })
  @ApiQuery({ name: 'taskId', required: false, description: 'Task ID' })
  async additionalFields(
    @Query('workflowType') type: string,
    @Query('stepId') stepId?: string,
    @Query('taskId') taskId?: string,
  ): Promise<SuccessResponse<FieldAttributeDto[]>> {
    return new SuccessResponse<FieldAttributeDto[]>(
      await this.workflowService.getAdditionalFields(type, stepId, taskId)
    );
  }

}

