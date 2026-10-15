import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";

export async function createProject(
  userId: number,
  input: { name: string; keyPrefix: string },
) {
  const taken = await prisma.project.findUnique({ where: { keyPrefix: input.keyPrefix } });
  if (taken) throw new AppError(409, "That project key is already in use");
  const project = await prisma.project.create({
    data: {
      name: input.name,
      keyPrefix: input.keyPrefix,
      members: { create: { userId, role: "owner" } },
    },
  });
  return { id: project.id, name: project.name, keyPrefix: project.keyPrefix, role: "owner" };
}

export async function listProjects(userId: number) {
  const rows = await prisma.projectMember.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { project: { createdAt: "desc" } },
  });
  return rows.map((r) => ({
    id: r.project.id,
    name: r.project.name,
    keyPrefix: r.project.keyPrefix,
    role: r.role,
  }));
}

export async function getProject(projectId: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!project) throw new AppError(404, "Project not found");
  return {
    id: project.id,
    name: project.name,
    keyPrefix: project.keyPrefix,
    members: project.members.map((m) => ({ ...m.user, role: m.role })),
  };
}

export async function addMember(projectId: number, email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(404, "No registered user with that email");
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (existing) throw new AppError(409, "User is already a member");
  await prisma.projectMember.create({
    data: { projectId, userId: user.id, role: "member" },
  });
  return { id: user.id, name: user.name, email: user.email, role: "member" };
}