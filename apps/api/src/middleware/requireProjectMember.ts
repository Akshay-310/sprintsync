import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { AppError } from "./errorHandler.js";

const idSchema = z.coerce.number().int().positive();

export const requireProjectMember: RequestHandler = async (req, res, next) => {
  const projectId = idSchema.parse(req.params["projectId"]);
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: res.locals["userId"] } },
  });
  if (!membership) throw new AppError(404, "Project not found");
  res.locals["projectId"] = projectId;
  res.locals["role"] = membership.role;
  next();
};