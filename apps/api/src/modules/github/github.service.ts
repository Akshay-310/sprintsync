import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { applyStatusChange } from "../tasks/tasks.service.js";
import { extractTaskNumbers, prStateFromPayload, statusFromPullRequests } from "./pr-rules.js";
import type { PrState } from "./pr-rules.js";

const prPayloadSchema = z.object({
  action: z.string(),
  pull_request: z.object({
    number: z.number().int(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.string(),
    merged: z.boolean().default(false),
    draft: z.boolean().default(false),
    html_url: z.string(),
    head: z.object({ ref: z.string() }),
    user: z.object({ login: z.string() }).nullable(),
    updated_at: z.coerce.date(),
  }),
});

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

export async function linkRepository(projectId: number, repoFullName: string) {
  const name = repoFullName.toLowerCase();
  const clash = await prisma.githubLink.findUnique({ where: { repoFullName: name } });
  if (clash && clash.projectId !== projectId) {
    throw new AppError(409, "That repository is linked to another project");
  }
  const webhookSecret = randomBytes(24).toString("hex");
  const link = await prisma.githubLink.upsert({
    where: { projectId },
    create: { projectId, repoFullName: name, webhookSecret },
    update: { repoFullName: name, webhookSecret },
  });
  return { repoFullName: link.repoFullName, webhookSecret: link.webhookSecret };
}

export async function getLink(projectId: number) {
  const link = await prisma.githubLink.findUnique({ where: { projectId } });
  return link ? { linked: true, repoFullName: link.repoFullName } : { linked: false };
}

export async function findLinkByRepo(repoFullName: string) {
  return prisma.githubLink.findUnique({ where: { repoFullName: repoFullName.toLowerCase() } });
}

export async function recentEvents(projectId: number) {
  return prisma.webhookEvent.findMany({
    where: { projectId },
    orderBy: { receivedAt: "desc" },
    take: 20,
    select: { deliveryId: true, event: true, action: true, outcome: true, receivedAt: true },
  });
}

async function recordOnly(
  projectId: number,
  deliveryId: string,
  event: string,
  outcome: string,
) {
  try {
    await prisma.webhookEvent.create({ data: { deliveryId, projectId, event, outcome } });
  } catch (err) {
    if (isUniqueViolation(err)) return { outcome: "duplicate" };
    throw err;
  }
  return { outcome };
}

export async function handleEvent(
  projectId: number,
  deliveryId: string,
  event: string,
  payload: unknown,
) {
  const seen = await prisma.webhookEvent.findUnique({ where: { deliveryId } });
  if (seen) return { outcome: "duplicate" };

  if (event !== "pull_request") {
    return recordOnly(projectId, deliveryId, event, event === "ping" ? "ping" : "ignored");
  }

  const parsed = prPayloadSchema.safeParse(payload);
  if (!parsed.success) throw new AppError(400, "Unexpected pull_request payload");
  const { action, pull_request: pr } = parsed.data;

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: { keyPrefix: true },
      });
      if (!project) throw new AppError(404, "Project not found");

      // The unique delivery ID makes this fail if a duplicate sneaks past the check above.
      const eventRow = await tx.webhookEvent.create({
        data: { deliveryId, projectId, event, action, outcome: "processing" },
      });

      const existing = await tx.pullRequest.findUnique({
        where: { projectId_number: { projectId, number: pr.number } },
      });
      if (existing && pr.updated_at.getTime() < existing.lastEventAt.getTime()) {
        await tx.webhookEvent.update({ where: { id: eventRow.id }, data: { outcome: "stale" } });
        return "stale";
      }

      const state = prStateFromPayload(pr);
      const fields = {
        title: pr.title,
        state,
        url: pr.html_url,
        authorLogin: pr.user?.login ?? null,
        lastEventAt: pr.updated_at,
      };
      const pullRequest = await tx.pullRequest.upsert({
        where: { projectId_number: { projectId, number: pr.number } },
        create: { projectId, number: pr.number, ...fields },
        update: fields,
      });

      // Link any tasks mentioned in the branch name, title or description.
      const numbers = extractTaskNumbers(project.keyPrefix, pr.head.ref, pr.title, pr.body);
      if (numbers.length > 0) {
        const tasks = await tx.task.findMany({
          where: { projectId, number: { in: numbers } },
          select: { id: true },
        });
        const already = await tx.taskPullRequest.findMany({
          where: { pullRequestId: pullRequest.id },
          select: { taskId: true },
        });
        const alreadyIds = new Set(already.map((l) => l.taskId));
        for (const t of tasks) {
          if (!alreadyIds.has(t.id)) {
            await tx.taskPullRequest.create({
              data: { taskId: t.id, pullRequestId: pullRequest.id },
            });
          }
        }
      }

      // Recompute the status of every task this PR is linked to.
      const links = await tx.taskPullRequest.findMany({
        where: { pullRequestId: pullRequest.id },
        select: { taskId: true },
      });
      let moved = 0;
      for (const { taskId } of links) {
        const prs = await tx.pullRequest.findMany({
          where: { tasks: { some: { taskId } } },
          select: { state: true },
        });
        const next = statusFromPullRequests(prs.map((p) => p.state as PrState));
        if (next === null) continue;
        const task = await tx.task.findUnique({
          where: { id: taskId },
          select: { id: true, status: true },
        });
        if (task && (await applyStatusChange(tx, task, next, "github", null))) moved += 1;
      }

      const result = moved > 0 ? "task_moved" : "pr_recorded";
      await tx.webhookEvent.update({ where: { id: eventRow.id }, data: { outcome: result } });
      return result;
    });
    return { outcome };
  } catch (err) {
    if (isUniqueViolation(err)) return { outcome: "duplicate" };
    throw err;
  }
}