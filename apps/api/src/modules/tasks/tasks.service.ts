import type { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import type { TaskStatus } from "../../constants.js";

type Tx = Prisma.TransactionClient;

type TaskRow = {
  number: number;
  title: string;
  description: string | null;
  status: string;
  points: number | null;
  sprintId: number | null;
  assigneeId: number | null;
  createdAt: Date;
  completedAt: Date | null;
};

function toDto(t: TaskRow, keyPrefix: string) {
  return {
    key: `${keyPrefix}-${t.number}`,
    number: t.number,
    title: t.title,
    description: t.description,
    status: t.status,
    points: t.points,
    sprintId: t.sprintId,
    assigneeId: t.assigneeId,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
  };
}

async function keyPrefixOf(projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { keyPrefix: true },
  });
  if (!project) throw new AppError(404, "Project not found");
  return project.keyPrefix;
}

async function assertSprintInProject(projectId: number, sprintId: number) {
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, projectId },
    select: { id: true },
  });
  if (!sprint) throw new AppError(400, "Sprint does not belong to this project");
}

async function assertAssigneeIsMember(projectId: number, userId: number) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new AppError(400, "Assignee is not a member of this project");
}

async function findTask(projectId: number, taskNumber: number) {
  const task = await prisma.task.findUnique({
    where: { projectId_number: { projectId, number: taskNumber } },
  });
  if (!task) throw new AppError(404, "Task not found");
  return task;
}

// Shared by the board and (later) the GitHub webhook. Changes the status and
// records the change in history, as part of the caller's transaction.
export async function applyStatusChange(
  tx: Tx,
  task: { id: number; status: string },
  to: TaskStatus,
  source: "user" | "github",
  changedById: number | null,
) {
  if (task.status === to) return null;
  const updated = await tx.task.update({
    where: { id: task.id },
    data: { status: to, completedAt: to === "DONE" ? new Date() : null },
  });
  await tx.taskStatusHistory.create({
    data: { taskId: task.id, fromStatus: task.status, toStatus: to, source, changedById },
  });
  return updated;
}

export async function createTask(
  projectId: number,
  userId: number,
  input: {
    title: string;
    description?: string | undefined;
    points?: number | undefined;
    sprintId?: number | undefined;
    assigneeId?: number | undefined;
  },
) {
  if (input.sprintId !== undefined) await assertSprintInProject(projectId, input.sprintId);
  if (input.assigneeId !== undefined) await assertAssigneeIsMember(projectId, input.assigneeId);

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: { taskCounter: { increment: 1 } },
      select: { taskCounter: true, keyPrefix: true },
    });
    const task = await tx.task.create({
      data: {
        projectId,
        number: project.taskCounter,
        title: input.title,
        description: input.description ?? null,
        points: input.points ?? null,
        sprintId: input.sprintId ?? null,
        assigneeId: input.assigneeId ?? null,
      },
    });
    await tx.taskStatusHistory.create({
      data: { taskId: task.id, fromStatus: null, toStatus: "TODO", source: "user", changedById: userId },
    });
    return toDto(task, project.keyPrefix);
  });
}

export async function listTasks(
  projectId: number,
  filters: {
    sprintId?: number | undefined;
    status?: TaskStatus | undefined;
    assigneeId?: number | undefined;
  },
) {
  const where: Prisma.TaskWhereInput = { projectId };
  if (filters.sprintId !== undefined) where.sprintId = filters.sprintId;
  if (filters.status !== undefined) where.status = filters.status;
  if (filters.assigneeId !== undefined) where.assigneeId = filters.assigneeId;

  const [prefix, tasks] = await Promise.all([
    keyPrefixOf(projectId),
    prisma.task.findMany({ where, orderBy: { number: "asc" } }),
  ]);
  return tasks.map((t) => toDto(t, prefix));
}

export async function getTask(projectId: number, taskNumber: number) {
  const task = await findTask(projectId, taskNumber);
  return toDto(task, await keyPrefixOf(projectId));
}

export async function updateTask(
  projectId: number,
  taskNumber: number,
  input: {
    title?: string | undefined;
    description?: string | null | undefined;
    points?: number | null | undefined;
    sprintId?: number | null | undefined;
    assigneeId?: number | null | undefined;
  },
) {
  const existing = await findTask(projectId, taskNumber);
  if (input.sprintId) await assertSprintInProject(projectId, input.sprintId);
  if (input.assigneeId) await assertAssigneeIsMember(projectId, input.assigneeId);

  const data: Prisma.TaskUncheckedUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.points !== undefined) data.points = input.points;
  if (input.sprintId !== undefined) data.sprintId = input.sprintId;
  if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId;

  const task = await prisma.task.update({ where: { id: existing.id }, data });
  return toDto(task, await keyPrefixOf(projectId));
}

export async function changeTaskStatus(
  projectId: number,
  taskNumber: number,
  to: TaskStatus,
  userId: number,
) {
  const task = await prisma.$transaction(async (tx) => {
    const current = await tx.task.findUnique({
      where: { projectId_number: { projectId, number: taskNumber } },
    });
    if (!current) throw new AppError(404, "Task not found");
    const updated = await applyStatusChange(tx, current, to, "user", userId);
    return updated ?? current;
  });
  return toDto(task, await keyPrefixOf(projectId));
}

export async function getTaskHistory(projectId: number, taskNumber: number) {
  const task = await findTask(projectId, taskNumber);
  return prisma.taskStatusHistory.findMany({
    where: { taskId: task.id },
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
    select: { fromStatus: true, toStatus: true, source: true, changedById: true, changedAt: true },
  });
}