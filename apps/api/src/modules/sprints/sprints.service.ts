import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import type { SprintStatus } from "../../constants.js";

const ALLOWED_NEXT: Record<SprintStatus, SprintStatus[]> = {
  PLANNED: ["ACTIVE"],
  ACTIVE: ["COMPLETED"],
  COMPLETED: [],
};

export async function createSprint(
  projectId: number,
  input: { name: string; goal?: string | undefined; startsAt: Date; endsAt: Date },
) {
  return prisma.sprint.create({
    data: {
      projectId,
      name: input.name,
      goal: input.goal ?? null,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    },
  });
}

export async function listSprints(projectId: number) {
  return prisma.sprint.findMany({ where: { projectId }, orderBy: { startsAt: "asc" } });
}

export async function setSprintStatus(projectId: number, sprintId: number, status: SprintStatus) {
  const sprint = await prisma.sprint.findFirst({ where: { id: sprintId, projectId } });
  if (!sprint) throw new AppError(404, "Sprint not found");

  if (!ALLOWED_NEXT[sprint.status as SprintStatus].includes(status)) {
    throw new AppError(409, `Cannot move a sprint from ${sprint.status} to ${status}`);
  }
  if (status === "ACTIVE") {
    const active = await prisma.sprint.findFirst({ where: { projectId, status: "ACTIVE" } });
    if (active) throw new AppError(409, "Another sprint is already active");
  }
  return prisma.sprint.update({ where: { id: sprintId }, data: { status } });
}