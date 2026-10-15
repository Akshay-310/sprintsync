import { Router } from "express";
import { z } from "zod";
import { TASK_STATUSES } from "../../constants.js";
import * as tasksService from "./tasks.service.js";

const idSchema = z.coerce.number().int().positive();
const statusEnum = z.enum(TASK_STATUSES);

const createSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional(),
  points: z.number().int().min(0).max(100).optional(),
  sprintId: z.number().int().positive().optional(),
  assigneeId: z.number().int().positive().optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  points: z.number().int().min(0).max(100).nullable().optional(),
  sprintId: z.number().int().positive().nullable().optional(),
  assigneeId: z.number().int().positive().nullable().optional(),
});

const listQuery = z.object({
  sprintId: z.coerce.number().int().positive().optional(),
  status: statusEnum.optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
});

const statusBody = z.object({ status: statusEnum });

export const tasksRouter = Router();

tasksRouter.post("/", async (req, res) => {
  const input = createSchema.parse(req.body);
  res
    .status(201)
    .json(await tasksService.createTask(res.locals["projectId"], res.locals["userId"], input));
});

tasksRouter.get("/", async (req, res) => {
  const filters = listQuery.parse(req.query);
  res.json(await tasksService.listTasks(res.locals["projectId"], filters));
});

tasksRouter.get("/:taskNumber", async (req, res) => {
  const taskNumber = idSchema.parse(req.params["taskNumber"]);
  res.json(await tasksService.getTask(res.locals["projectId"], taskNumber));
});

tasksRouter.patch("/:taskNumber", async (req, res) => {
  const taskNumber = idSchema.parse(req.params["taskNumber"]);
  const input = updateSchema.parse(req.body);
  res.json(await tasksService.updateTask(res.locals["projectId"], taskNumber, input));
});

tasksRouter.patch("/:taskNumber/status", async (req, res) => {
  const taskNumber = idSchema.parse(req.params["taskNumber"]);
  const { status } = statusBody.parse(req.body);
  res.json(
    await tasksService.changeTaskStatus(
      res.locals["projectId"],
      taskNumber,
      status,
      res.locals["userId"],
    ),
  );
});

tasksRouter.get("/:taskNumber/history", async (req, res) => {
  const taskNumber = idSchema.parse(req.params["taskNumber"]);
  res.json(await tasksService.getTaskHistory(res.locals["projectId"], taskNumber));
});