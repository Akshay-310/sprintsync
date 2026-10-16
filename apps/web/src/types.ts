import type { TaskStatus } from "./constants";

export type User = { id: number; email: string; name: string };
export type Project = { id: number; name: string; keyPrefix: string; role: string };
export type Member = { id: number; name: string; email: string; role: string };
export type ProjectDetail = {
  id: number;
  name: string;
  keyPrefix: string;
  members: Member[];
};
export type Sprint = {
  id: number;
  projectId: number;
  name: string;
  goal: string | null;
  startsAt: string;
  endsAt: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
};
export type Task = {
  key: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  points: number | null;
  sprintId: number | null;
  assigneeId: number | null;
  createdAt: string;
  completedAt: string | null;
};