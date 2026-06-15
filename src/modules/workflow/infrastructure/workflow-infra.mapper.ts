import { Prisma } from "@prisma/client";
import { MapperUtils } from "src/modules/shared/database";
import { User } from "src/modules/user/domain/model/user.model";
import {
TaskAssignment,
TaskAssignmentStatus,
} from "../domain/model/task-assignment.model";
import {
WorkflowInstance,
WorkflowInstanceStatus,
} from "../domain/model/workflow-instance.model";
import {
WorkflowStep,
WorkflowStepStatus,
} from "../domain/model/workflow-step.model";
import {
WorkflowTask,
WorkflowTaskStatus,
WorkflowTaskType,
} from "../domain/model/workflow-task.model";
import {
PrismaWorkflowInstanceWithSteps,
PrismaWorkflowInstanceWithTasks,
PrismaWorkflowTasks,
} from "./persistence/workflow-instance.repository";

export class WorkflowInfraMapper {
  static toDomainWithSteps(prisma: PrismaWorkflowInstanceWithSteps) {
    const instance = new WorkflowInstance(
      prisma.id,
      prisma.type,
      prisma.name,
      prisma.description,
      prisma.status as WorkflowInstanceStatus,
      new User(
        prisma.initiatedBy?.id!,
        prisma.initiatedBy?.firstName!,
        prisma.initiatedBy?.lastName!,
        prisma.initiatedBy?.email!,
      ),
      new User(
        prisma.initiatedFor?.id!,
        prisma.initiatedFor?.firstName!,
        prisma.initiatedFor?.lastName!,
        prisma.initiatedFor?.email!,
      ),
      prisma.data ? JSON.parse(prisma.data) : undefined,
      prisma.context ? JSON.parse(prisma.context) : undefined,
      MapperUtils.nullToUndefined(prisma.isExtUser),
      MapperUtils.nullToUndefined(prisma.extUserEmail),
      prisma.currentStepDefId ?? undefined,
      prisma.completedAt ?? undefined,
      prisma.remarks ?? undefined,
      prisma.createdAt,
      prisma.updatedAt,
    );

    // Steps if included
    if (prisma.steps) {
      const sorted = prisma.steps
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex);
      sorted.forEach((s) => {
        const step = new WorkflowStep(
          s.id,
          s.stepDefId,
          s.name,
          s.description ?? "",
          s.status as WorkflowStepStatus,
          s.orderIndex,
          s.transitions ? JSON.parse(s.transitions) : [],
          s.completedAt ?? undefined,
          s.remarks ?? undefined,
          s.startedAt ?? undefined,
          s.createdAt,
          s.updatedAt,
        );
        instance.addSteps(step);
      });
    }
    return instance;
  }

  /**
   * Convert Prisma persistence shape (with only steps) to Domain model
   * Used by repository for queries with steps included
   */

  static toDomainWithTasks(
    prisma: PrismaWorkflowInstanceWithTasks,
  ): WorkflowInstance {
    const instance = new WorkflowInstance(
      prisma.id,
      prisma.type,
      prisma.name,
      prisma.description,
      prisma.status as WorkflowInstanceStatus,
      new User(
        prisma.initiatedBy?.id!,
        prisma.initiatedBy?.firstName!,
        prisma.initiatedBy?.lastName!,
        prisma.initiatedBy?.email!,
      ),
      new User(
        prisma.initiatedFor?.id!,
        prisma.initiatedFor?.firstName!,
        prisma.initiatedFor?.lastName!,
        prisma.initiatedFor?.email!,
      ),
      prisma.data ? JSON.parse(prisma.data) : undefined,
      prisma.context ? JSON.parse(prisma.context) : undefined,
      MapperUtils.nullToUndefined(prisma.isExtUser),
      MapperUtils.nullToUndefined(prisma.extUserEmail),
      prisma.currentStepDefId ?? undefined,
      prisma.completedAt ?? undefined,
      prisma.remarks ?? undefined,
      prisma.createdAt,
      prisma.updatedAt,
    );

    // Steps if included
    if (prisma.steps) {
      const sorted = prisma.steps
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex);
      sorted.forEach((s) => {
        const step = new WorkflowStep(
          s.id,
          s.stepDefId,
          s.name,
          s.description ?? "",
          s.status as WorkflowStepStatus,
          s.orderIndex,
          s.transitions ? JSON.parse(s.transitions) : [],
          s.completedAt ?? undefined,
          s.remarks ?? undefined,
          s.startedAt ?? undefined,
          s.createdAt,
          s.updatedAt,
        );

        // Tasks if included
        if (s.tasks) {
          const tasks = s.tasks.map((t) => {
            return this.toWorkflowTask(t);
          });
          step.setTasks(tasks);
        }

        instance.addSteps(step);
      });
    }

    return instance;
  }

  static toWorkflowTask(prisma: PrismaWorkflowTasks): WorkflowTask {
    const task = new WorkflowTask(
      prisma.id,
      { id: prisma.stepId } as WorkflowStep,
      prisma.workflowId,
      prisma.stepDefId,
      prisma.taskDefId,
      prisma.name,
      prisma.description,
      prisma.type as WorkflowTaskType,
      prisma.status as WorkflowTaskStatus,
      prisma.handler || undefined,
      prisma.checklist?.split("!~!"),
      prisma.autoCloseable || undefined,
      prisma.autoCloseRefId || undefined,
      prisma.autoCloseEventName || undefined,
      prisma.autoCloseCondition || undefined,
      prisma.autoCloseResultData
        ? JSON.parse(prisma.autoCloseResultData)
        : undefined,
      prisma.completedAt || undefined,
      prisma.completedBy
        ? new User(
            prisma.completedBy.id,
            prisma.completedBy.firstName,
            prisma.completedBy.lastName,
            prisma.completedBy.email,
          )
        : undefined,
      prisma.remarks || undefined,
      prisma.resultData ? JSON.parse(prisma.resultData) : undefined,
      prisma.createdAt,
      prisma.updatedAt,
    );

    if (prisma.assignments) {
      const assignments = prisma.assignments.map((assignment) =>
        this.toTaskAssignment(assignment),
      );
      task.setAssignments(assignments);
    }

    return task;
  }

  static toTaskAssignment(
    prisma: Prisma.TaskAssignmentGetPayload<{
      include: {
        assignedTo: true;
      };
    }>,
  ): TaskAssignment {
    return new TaskAssignment(
      prisma.id,
      prisma.taskId,
      new User(
        prisma.assignedTo.id,
        prisma.assignedTo.firstName,
        prisma.assignedTo.lastName,
        prisma.assignedTo.email,
      ),
      prisma.roleName || null,
      prisma.status as TaskAssignmentStatus,
      prisma.createdAt,
      prisma.updatedAt,
      prisma.assignedBy || undefined,
      prisma.acceptedAt || undefined,
      prisma.completedAt || undefined,
      prisma.notes || undefined,
    );
  }

  /**
   * Convert Domain model to Prisma create input
   * Used for creating new workflow instances
   */
  static toWorkflowInstanceCreatePersistence(
    domain: WorkflowInstance,
  ): Prisma.WorkflowInstanceCreateInput {
    return {
      id: domain.id,
      name: domain.name,
      type: domain.type,
      description: domain.description,
      status: domain.status,
      currentStepDefId: domain.currentStepDefId ?? null,
      completedAt: domain.completedAt ?? null,
      remarks: domain.remarks ?? null,
      delegated: domain.isDelegated ?? false,
      createdAt: domain.createdAt ?? new Date(),
      updatedAt: domain.updatedAt ?? new Date(),
      data: domain.requestData ? JSON.stringify(domain.requestData) : null,
      context: domain.context ? JSON.stringify(domain.context) : null,
      //version: BigInt(0),
      initiatedBy: domain.initiatedBy?.id
        ? { connect: { id: domain.initiatedBy?.id } }
        : undefined,
      initiatedFor: domain.initiatedFor?.id
        ? { connect: { id: domain.initiatedFor?.id } }
        : undefined,
      isExtUser: domain.isExternalUser,
      extUserEmail: domain.externalUserEmail,
      // steps: handled separately via nested create/update
    };
  }

  /**
   * Convert Domain model to Prisma update input
   * Used for updating existing workflow instances
   */
  static toWorkflowInstanceUpdatePersistence(
    domain: WorkflowInstance,
  ): Prisma.WorkflowInstanceUpdateInput {
    return {
      name: domain.name,
      type: domain.type,
      description: domain.description,
      status: domain.status,
      currentStepDefId: domain.currentStepDefId ?? null,
      initiatedBy: domain.initiatedBy?.id
        ? { connect: { id: domain.initiatedBy?.id } }
        : undefined,
      initiatedFor: domain.initiatedFor?.id
        ? { connect: { id: domain.initiatedFor?.id } }
        : undefined,
      completedAt: domain.completedAt ?? null,
      remarks: domain.remarks ?? null,
      updatedAt: new Date(),
      isExtUser: domain.isExternalUser,
      extUserEmail: domain.externalUserEmail,
      context: domain.context ? JSON.stringify(domain.context) : null,
      data: domain.requestData ? JSON.stringify(domain.requestData) : null,
      // steps: handled separately via nested create/update
    };
  }

  /**
   * Convert Domain WorkflowStep to Prisma persistence
   * Used for creating and updating workflow steps
   */
  static toWorkflowStepPersistence(domain: WorkflowStep) {
    return {
      id: domain.id,
      //instanceId: domain.instanceId,//no need to set instance id separately
      stepDefId: domain.stepDefId,
      name: domain.name,
      description: domain.description ?? null,
      status: domain.status,
      orderIndex: domain.orderIndex,
      remarks: domain.remarks ?? null,
      startedAt: domain.startedAt ?? null,
      completedAt: domain.completedAt ?? null,
      createdAt: domain.createdAt ?? new Date(),
      updatedAt: domain.updatedAt ?? new Date(),
      transitions: domain.transitions
        ? JSON.stringify(domain.transitions)
        : null,
    };
  }

  static toPrismaWorkflowTaskPersistance(
    domain: WorkflowTask,
    stepId: string,
  ): Prisma.WorkflowTaskCreateInput {
    return {
      id: domain.id,
      stepDefId: domain.stepDefId,
      taskDefId: domain.taskDefId,
      workflowId: domain.workflowId,
      step: { connect: { id: stepId } },
      name: domain.name,
      description: domain.description ?? null,
      type: domain.type,
      status: domain.status,
      handler: domain.handler ?? null,
      checklist:
        domain.checkList && domain.checkList.length > 0
          ? domain.checkList.join("!~!")
          : null,
      autoCloseable: domain.isAutoCloseable ?? null,
      autoCloseRefId: domain.autoCloseRefId ?? null,
      autoCloseEventName: domain.autoCloseEventName ?? null,
      autoCloseCondition: domain.autoCloseCondition ?? null,
      autoCloseResultData: domain.autoCloseResultData
        ? JSON.stringify(domain.autoCloseResultData)
        : null,
      resultData: domain.resultData ? JSON.stringify(domain.resultData) : null,
      completedAt: domain.completedAt ?? null,
      completedBy: domain.completedBy?.id
        ? { connect: { id: domain.completedBy?.id } }
        : {},
      remarks: domain.remarks ?? null,
      createdAt: domain.createdAt ?? new Date(),
      updatedAt: domain.updatedAt ?? new Date(),
    };
  }
  static toPrismaTaskAssignment(
    assignment: TaskAssignment,
  ): Prisma.TaskAssignmentCreateInput {
    return {
      id: assignment.id,
      task: { connect: { id: assignment.taskId } },
      assignedTo: { connect: { id: assignment.assignedTo.id } },
      roleName: assignment.roleName,
      assignedBy: assignment.assignedBy,
      status: assignment.status,
      acceptedAt: assignment.acceptedAt,
      completedAt: assignment.completedAt,
      notes: assignment.notes,
      createdAt: assignment.createdAt ?? new Date(),
      updatedAt: assignment.updatedAt ?? new Date(),
    };
  }
}
