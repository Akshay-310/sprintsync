import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler.js";
import * as githubService from "./github.service.js";
import { isValidSignature } from "./signature.js";

const linkSchema = z.object({
  repoFullName: z
    .string()
    .trim()
    .regex(/^[\w.-]+\/[\w.-]+$/, "Use the form owner/repo"),
});

const repoSchema = z.object({ repository: z.object({ full_name: z.string() }) });

// Mounted under /api/projects/:projectId/github (members only).
export const githubProjectRouter = Router();

githubProjectRouter.get("/", async (_req, res) => {
  res.json(await githubService.getLink(res.locals["projectId"]));
});

githubProjectRouter.get("/events", async (_req, res) => {
  res.json(await githubService.recentEvents(res.locals["projectId"]));
});

githubProjectRouter.post("/", async (req, res) => {
  if (res.locals["role"] !== "owner") {
    throw new AppError(403, "Only the project owner can link a repository");
  }
  const { repoFullName } = linkSchema.parse(req.body);
  const link = await githubService.linkRepository(res.locals["projectId"], repoFullName);
  res.status(201).json(link);
});

// Mounted at /api/github/webhook. The body arrives as raw bytes (see app.ts).
export const githubWebhookRouter = Router();

githubWebhookRouter.post("/", async (req, res) => {
  if (!Buffer.isBuffer(req.body)) {
    throw new AppError(415, "Webhook content type must be application/json");
  }
  const rawBody = req.body;
  const event = req.get("x-github-event");
  const deliveryId = req.get("x-github-delivery");
  if (!event || !deliveryId) throw new AppError(400, "Missing GitHub headers");

  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new AppError(400, "Malformed JSON body");
  }

  const repo = repoSchema.safeParse(json);
  const link = repo.success
    ? await githubService.findLinkByRepo(repo.data.repository.full_name)
    : null;

  // The same answer for an unknown repo and a bad signature, so nothing is revealed.
  if (!link || !isValidSignature(link.webhookSecret, rawBody, req.get("x-hub-signature-256"))) {
    throw new AppError(401, "Invalid signature");
  }

  const result = await githubService.handleEvent(link.projectId, deliveryId, event, json);
  console.log(`webhook ${event} ${deliveryId} -> ${result.outcome}`);
  res.status(200).json(result);
});