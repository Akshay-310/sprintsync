import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireProjectMember } from "../../middleware/requireProjectMember.js";
import { AppError } from "../../middleware/errorHandler.js";
import * as projectsService from "./projects.service.js";
import { sprintsRouter } from "../sprints/sprints.routes.js";
import { tasksRouter } from "../tasks/tasks.routes.js";
import { githubProjectRouter } from "../github/github.routes.js";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  keyPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,6}$/, "Use 2 to 6 letters"),
});

const addMemberSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const projectsRouter = Router();
projectsRouter.use(requireAuth);
projectsRouter.use("/:projectId/sprints", requireProjectMember, sprintsRouter);
projectsRouter.use("/:projectId/tasks", requireProjectMember, tasksRouter);
projectsRouter.use("/:projectId/github", requireProjectMember, githubProjectRouter);

projectsRouter.post("/", async (req, res) => {
  const input = createSchema.parse(req.body);
  res.status(201).json(await projectsService.createProject(res.locals["userId"], input));
});

projectsRouter.get("/", async (_req, res) => {
  res.json(await projectsService.listProjects(res.locals["userId"]));
});

projectsRouter.get("/:projectId", requireProjectMember, async (_req, res) => {
  res.json(await projectsService.getProject(res.locals["projectId"]));
});

projectsRouter.post("/:projectId/members", requireProjectMember, async (req, res) => {
  if (res.locals["role"] !== "owner") {
    throw new AppError(403, "Only the project owner can add members");
  }
  const { email } = addMemberSchema.parse(req.body);
  res.status(201).json(await projectsService.addMember(res.locals["projectId"], email));
});