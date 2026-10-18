import { PrismaMssql } from "@prisma/adapter-mssql";
import { PrismaClient } from "../../generated/prisma/client.js";
import { config } from "../config.js";

const adapter = new PrismaMssql({
  server: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  connectionTimeout: 60_000,
  options: { encrypt: true, trustServerCertificate: config.DB_TRUST_CERT },
});

export const prisma = new PrismaClient({ adapter });