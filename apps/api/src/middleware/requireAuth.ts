import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "./errorHandler.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "Missing token");
  try {
    const payload = jwt.verify(header.slice(7), config.JWT_SECRET);
    if (typeof payload === "string" || !payload.sub) throw new Error("bad payload");
    res.locals["userId"] = Number(payload.sub);
  } catch {
    throw new AppError(401, "Invalid or expired token");
  }
  next();
};