import { Router } from "express";
import { z } from "zod";
import { SPRINT_STATUSES } from "../../constants.js";
import * as sprintsService from "./sprints.service.js";

const idSchema = z.coerce.number().int().positive();

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    goal: z.string().trim().max(500).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((v) => v.endsAt > v.startsAt, {
    message: "endsAt must be after startsAt",
    path: ["endsAt"],
  });

const statusSchema = z.object({ status: z.enum(SPRINT_STATUSES) });

export const sprintsRouter = Router();

sprintsRouter.post("/", async (req, res) => {
  const input = createSchema.parse(req.body);
  res.status(201).json(await sprintsService.createSprint(res.locals["projectId"], input));
});

sprintsRouter.get("/", async (_req, res) => {
  res.json(await sprintsService.listSprints(res.locals["projectId"]));
});

sprintsRouter.patch("/:sprintId/status", async (req, res) => {
  const sprintId = idSchema.parse(req.params["sprintId"]);
  const { status } = statusSchema.parse(req.body);
  res.json(await sprintsService.setSprintStatus(res.locals["projectId"], sprintId, status));
});