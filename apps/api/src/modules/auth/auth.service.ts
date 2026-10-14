import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma.js";
import { config } from "../../config.js";
import { AppError } from "../../middleware/errorHandler.js";

function signToken(userId: number) {
  return jwt.sign({ sub: String(userId) }, config.JWT_SECRET, { expiresIn: "7d" });
}

function publicUser(u: { id: number; email: string; name: string }) {
  return { id: u.id, email: u.email, name: u.name };
}

export async function register(input: { email: string; name: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, "Email already registered");
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash },
  });
  return { user: publicUser(user), token: signToken(user.id) };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const ok = user ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || !ok) throw new AppError(401, "Invalid email or password");
  return { user: publicUser(user), token: signToken(user.id) };
}