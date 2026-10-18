import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(1433),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_TRUST_CERT: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

export const config = schema.parse(process.env);