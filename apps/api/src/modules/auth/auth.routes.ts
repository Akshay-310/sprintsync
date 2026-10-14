import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { AppError } from "../../middleware/errorHandler.js";
import * as authService from "./auth.service.js";

const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(1).max(100),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const input = registerSchema.parse(req.body);
  res.status(201).json(await authService.register(input));
});

authRouter.post("/login", async (req, res) => {
  const input = loginSchema.parse(req.body);
  res.json(await authService.login(input));
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { id: res.locals["userId"] } });
  if (!user) throw new AppError(404, "User not found");
  res.json({ id: user.id, email: user.email, name: user.name });
});