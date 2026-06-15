import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { BaseFilter } from "src/shared/models/base-filter-props";
import { PagedResult } from "src/shared/models/paged-result";
import { PrismaPostgresService } from "../../../shared/database/prisma-postgres.service";
import {
TaskAssignment
} from "../../domain/model/task-assignment.model";
import {
WorkflowFilter,
WorkflowInstance,
} from "../../domain/model/workflow-instance.model";
import {
TaskFilter,
WorkflowTask,
} from "../../domain/model/workflow-task.model";
import { IWorkflowInstanceRepository } from "../../domain/repositories/workflow-instance.repository.interface";
import { WorkflowInfraMapper } from "../workflow-infra.mapper";

export type PrismaWorkflowInstanceWithSteps =
  Prisma.WorkflowInstanceGetPayload<{
    include: { steps: true; initiatedBy: true; initiatedFor: true };
  }>;

export type PrismaWorkflowInstanceWithTasks =
  Prisma.WorkflowInstanceGetPayload<{
    include: {
      steps: {
        include: {
          tasks: {
            include: {
              completedBy: true;
              assignments: { include: { assignedTo: true } };
            };
          };
        };
      };
      initiatedBy: true;
      initiatedFor: true;
    };
  }>;

export type PrismaWorkflowTasks = Prisma.WorkflowTaskGetPayload<{
  include: {
    completedBy: true;
    assignments: {
      include: {
        assignedTo: true;
      };
    };
  };
}>;

@Injectable()
class WorkflowInstanceRepository implements IWorkflowInstanceRepository {
  constructor(private readonly prisma: PrismaPostgresService) {}
  async findByTaskId(taskId: string): Promise<WorkflowTask | null> {
    const task: PrismaWorkflowTasks | null =
      await this.prisma.workflowTask.findUnique({
        where: { id: taskId },
        include: {
          completedBy: true,
          assignments: {
            include: {
              assignedTo: true,
            },
          },
        },
      });
    return task ? WorkflowInfraMapper.toWorkflowTask(task) : null;
  }

  async count(filter: WorkflowFilter): Promise<number> {
    return await this.prisma.workflowInstance.count({
      where: this.whereQuery(filter),
    });
  }

  async findAllTasks(filter: TaskFilter): Promise<WorkflowTask[]> {
    const tasks: PrismaWorkflowTasks[] =
      await this.prisma.workflowTask.findMany({
        where: this.whereQueryTasks(filter),
        orderBy: { createdAt: "desc" },
        include: {
          completedBy: true,
          assignments: {
            include: {
              assignedTo: true,
            },
          },
        },
      });
    return tasks.map((w) => WorkflowInfraMapper.toWorkflowTask(w));
  }

  async findTasksPaged(
    filter: BaseFilter<TaskFilter>,
  ): Promise<PagedResult<WorkflowTask>> {
    const [data, total] = await Promise.all([
      this.prisma.workflowTask.findMany({
        where: this.whereQueryTasks(filter.props),
        orderBy: { createdAt: "desc" },
        include: {
          completedBy: true,
          assignments: {
            include: {
              assignedTo: true,
            },
          },
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.workflowTask.count({
        where: this.whereQueryTasks(filter.props),
      }),
    ]);

    return new PagedResult<WorkflowTask>(
      data.map((m) => WorkflowInfraMapper.toWorkflowTask(m)),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 0,
    );
  }

  private whereQueryTasks(
    filter: TaskFilter | undefined,
  ): Prisma.WorkflowTaskWhereInput {
    const where: Prisma.WorkflowTaskWhereInput = {
      ...(filter?.type ? { type: { in: filter.type } } : {}),
      ...(filter?.assignedTo
        ? {
            assignments: {
              some: {
                assignedToId: filter.assignedTo,
                status: {
                  in: TaskAssignment.pendingStatus,
                },
              },
            },
          }
        : {}),
      ...(filter?.status ? { status: { in: filter.status } } : {}),
      ...(filter?.workflowId ? { workflowId: filter.workflowId } : {}),
      ...(filter?.taskId ? { id: filter.taskId } : {}),
      ...(filter?.autoCloseRefId
        ? {
            autoCloseRefId: Array.isArray(filter.autoCloseRefId)
              ? { in: filter.autoCloseRefId }
              : filter.autoCloseRefId,
          }
        : {}),
    };
    return where;
  }

  async findAll(filter?: WorkflowFilter): Promise<WorkflowInstance[]> {
    const workflows: PrismaWorkflowInstanceWithSteps[] =
      await this.prisma.workflowInstance.findMany({
        where: this.whereQuery(filter),
        orderBy: { createdAt: "desc" },
        include: {
          steps: true,
          initiatedBy: true,
          initiatedFor: true,
        },
      });

    return workflows.map((w) => WorkflowInfraMapper.toDomainWithSteps(w));
  }

  async findPaged(
    filter?: BaseFilter<WorkflowFilter>,
  ): Promise<PagedResult<WorkflowInstance>> {
    const [data, total] = await Promise.all([
      this.prisma.workflowInstance.findMany({
        where: this.whereQuery(filter?.props),
        orderBy: { createdAt: "desc" },
        include: {
          steps: true,
          initiatedBy: true,
          initiatedFor: true,
        },
        skip: (filter?.pageIndex ?? 0) * (filter?.pageSize ?? 1000),
        take: filter?.pageSize ?? 1000,
      }),
      this.prisma.workflowInstance.count({
        where: this.whereQuery(filter?.props),
      }),
    ]);

    return new PagedResult<WorkflowInstance>(
      data.map((m) => WorkflowInfraMapper.toDomainWithSteps(m)),
      total,
      filter?.pageIndex ?? 0,
      filter?.pageSize ?? 0,
    );
  }

  private whereQuery(
    props?: WorkflowFilter,
  ): Prisma.WorkflowInstanceWhereInput {
    const where: Prisma.WorkflowInstanceWhereInput = {
      ...(props?.type ? { type: { in: props.type } } : {}),
      ...(props?.status ? { status: { in: props.status } } : {}),
      ...(props?.initiatedBy ? { initiatedById: props.initiatedBy } : {}),
      ...(props?.initiatedFor ? { initiatedForId: props.initiatedFor } : {}),
      ...(props?.delegated ? { delegated: props.delegated } : {}),
      ...(props?.workflowId ? { id: props.workflowId } : {}),
    };
    return where;
  }

  async findById(
    id: string,
    includeTask: boolean = false,
  ): Promise<WorkflowInstance | null> {
    if (includeTask) {
      const workflow0: PrismaWorkflowInstanceWithTasks | null =
        await this.prisma.workflowInstance.findUnique({
          where: { id },
          include: {
            steps: {
              include: {
                tasks: {
                  include: {
                    completedBy: true,
                    assignments: {
                      include: {
                        assignedTo: true,
                      },
                    },
                  },
                },
              },
            },
            initiatedBy: true,
            initiatedFor: true,
          },
        });
      return WorkflowInfraMapper.toDomainWithTasks(workflow0!);
    }
    const workflow0: PrismaWorkflowInstanceWithSteps | null =
      await this.prisma.workflowInstance.findUnique({
        where: { id },
        include: {
          steps: true,
          initiatedBy: true,
          initiatedFor: true,
        },
      });

    return WorkflowInfraMapper.toDomainWithSteps(workflow0!);
  }

  async create(instance: WorkflowInstance): Promise<WorkflowInstance> {
    const createData: Prisma.WorkflowInstanceCreateInput = {
      ...WorkflowInfraMapper.toWorkflowInstanceCreatePersistence(instance),
      initiatedBy:
        instance.initiatedBy?.id && instance.initiatedBy.id !== "system"
          ? { connect: { id: instance.initiatedBy.id } }
          : undefined,
      initiatedFor:
        instance.initiatedFor?.id && instance.initiatedFor.id !== "system"
          ? { connect: { id: instance.initiatedFor.id } }
          : undefined,
      steps: {
        create: instance.steps.map((step) =>
          WorkflowInfraMapper.toWorkflowStepPersistence(step),
        ),
      },
    };

    const createdWorkflow: PrismaWorkflowInstanceWithSteps =
      await this.prisma.workflowInstance.create({
        data: createData,
        include: {
          steps: true,
          initiatedBy: true,
          initiatedFor: true,
        },
      });
    return WorkflowInfraMapper.toDomainWithSteps(createdWorkflow);
  }

  async update(
    id: string,
    instance: WorkflowInstance,
  ): Promise<WorkflowInstance> {
    const data =
      WorkflowInfraMapper.toWorkflowInstanceUpdatePersistence(instance);

    const updated = await this.prisma.workflowInstance.update({
      where: { id },
      data: {
        ...data,
        steps: {
          upsert: instance.steps.map((step) => {
            const stepData =
              WorkflowInfraMapper.toWorkflowStepPersistence(step);
            return {
              where: { id: step.id },
              update: {
                ...stepData,
                tasks: {
                  upsert: step.tasks.map((task) => {
                    const taskPersistence =
                      WorkflowInfraMapper.toPrismaWorkflowTaskPersistance(
                        task,
                        step.id,
                      );
                    const { step: _, ...taskData } = taskPersistence;
                    return {
                      where: { id: task.id },
                      update: {
                        ...taskData,
                        assignments: {
                          upsert: task.assignments.map((assignment) => {
                            const assignmentPersistence =
                              WorkflowInfraMapper.toPrismaTaskAssignment(
                                assignment,
                              );
                            const { task: __, ...assignmentData } =
                              assignmentPersistence;
                            return {
                              where: { id: assignment.id },
                              update: assignmentData,
                              create: assignmentData,
                            };
                          }),
                        },
                      },
                      create: {
                        ...taskData,
                        assignments: {
                          create: task.assignments.map((assignment) => {
                            const { task: __, ...assignmentData } =
                              WorkflowInfraMapper.toPrismaTaskAssignment(
                                assignment,
                              );
                            return assignmentData;
                          }),
                        },
                      },
                    };
                  }),
                },
              },
              create: {
                ...stepData,
                tasks: {
                  create: step.tasks.map((task) => {
                    const { step: _, ...taskData } =
                      WorkflowInfraMapper.toPrismaWorkflowTaskPersistance(
                        task,
                        step.id,
                      );
                    return {
                      ...taskData,
                      assignments: {
                        create: task.assignments.map((assignment) => {
                          const { task: __, ...assignmentData } =
                            WorkflowInfraMapper.toPrismaTaskAssignment(
                              assignment,
                            );
                          return assignmentData;
                        }),
                      },
                    };
                  }),
                },
              },
            };
          }),
        },
      },
      // Include EVERYTHING here so we don't need a second query
      include: {
        steps: {
          include: {
            tasks: {
              include: {
                completedBy: true,
                assignments: {
                  include: {
                    assignedTo: true,
                  },
                },
              },
            },
          },
        },
        initiatedBy: true,
        initiatedFor: true,
      },
    });

    const mappedInstance = WorkflowInfraMapper.toDomainWithTasks(
      updated as PrismaWorkflowInstanceWithTasks,
    );
    if (!mappedInstance) {
      throw new Error("Failed to map updated workflow instance");
    }

    return mappedInstance;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workflowInstance.delete({ where: { id } });
  }
}

export default WorkflowInstanceRepository;
