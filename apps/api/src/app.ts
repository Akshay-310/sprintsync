import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { githubWebhookRouter } from "./modules/github/github.routes.js";
import { config } from "./config.js";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(
    "/api/github/webhook",
    express.raw({ type: "application/json", limit: "5mb" }),
    githubWebhookRouter,
  );
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectsRouter);

  app.use(errorHandler);
  return app;
}