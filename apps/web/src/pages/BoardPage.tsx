import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { isTaskStatus, TASK_STATUSES } from "../constants";
import type { TaskStatus } from "../constants";
import type { ProjectDetail, Sprint, Task } from "../types";
import { Column } from "../components/Column";

export function BoardPage() {
  const params = useParams();
  const projectId = Number(params["projectId"]);
  const enabled = Number.isInteger(projectId) && projectId > 0;
  const base = `/api/projects/${projectId}`;
  const queryClient = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [sprintFilter, setSprintFilter] = useState("all");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPoints, setTaskPoints] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [sprintStart, setSprintStart] = useState("");
  const [sprintEnd, setSprintEnd] = useState("");

  const projectKey = ["project", projectId];
  const sprintsKey = ["sprints", projectId];
  const tasksKey = ["tasks", projectId];

  const project = useQuery({
    queryKey: projectKey,
    queryFn: () => api<ProjectDetail>(base),
    enabled,
  });
  const sprints = useQuery({
    queryKey: sprintsKey,
    queryFn: () => api<Sprint[]>(`${base}/sprints`),
    enabled,
  });
  const tasks = useQuery({
    queryKey: tasksKey,
    queryFn: () => api<Task[]>(`${base}/tasks`),
    enabled,
  });

  const createTask = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<Task>(`${base}/tasks`, { method: "POST", body }),
    onSuccess: async () => {
      setTaskTitle("");
      setTaskPoints("");
      setTaskAssignee("");
      await queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });

  const createSprint = useMutation({
    mutationFn: (body: { name: string; startsAt: string; endsAt: string }) =>
      api<Sprint>(`${base}/sprints`, { method: "POST", body }),
    onSuccess: async () => {
      setSprintName("");
      setSprintStart("");
      setSprintEnd("");
      await queryClient.invalidateQueries({ queryKey: sprintsKey });
    },
  });

  const advanceSprint = useMutation({
    mutationFn: (v: { id: number; status: "ACTIVE" | "COMPLETED" }) =>
      api<Sprint>(`${base}/sprints/${v.id}/status`, {
        method: "PATCH",
        body: { status: v.status },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sprintsKey });
    },
  });

  const move = useMutation({
    mutationFn: (v: { number: number; status: TaskStatus }) =>
      api<Task>(`${base}/tasks/${v.number}/status`, {
        method: "PATCH",
        body: { status: v.status },
      }),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: tasksKey });
      const previous = queryClient.getQueryData<Task[]>(tasksKey);
      queryClient.setQueryData<Task[]>(tasksKey, (old) =>
        old?.map((t) => (t.number === v.number ? { ...t, status: v.status } : t)),
      );
      return { previous };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(tasksKey, ctx.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: tasksKey });
    },
  });

  if (!enabled) return <p className="center">Invalid project.</p>;
  if (project.error) {
    return (
      <main className="center">
        <p className="error">{project.error.message}</p>
        <Link to="/">Back to projects</Link>
      </main>
    );
  }

  const memberNames = new Map<number, string>(
    (project.data?.members ?? []).map((m): [number, string] => [m.id, m.name]),
  );
  const selectedSprint = sprints.data?.find((s) => String(s.id) === sprintFilter);
  const visible = (tasks.data ?? []).filter((t) => {
    if (sprintFilter === "all") return true;
    if (sprintFilter === "none") return t.sprintId === null;
    return t.sprintId === Number(sprintFilter);
  });

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (!isTaskStatus(overId)) return;
    const number = Number(event.active.id);
    const task = tasks.data?.find((t) => t.number === number);
    if (!task || task.status === overId) return;
    move.mutate({ number, status: overId });
  }

  function onCreateTask(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = { title: taskTitle };
    if (taskPoints !== "") body["points"] = Number(taskPoints);
    if (taskAssignee !== "") body["assigneeId"] = Number(taskAssignee);
    if (selectedSprint) body["sprintId"] = selectedSprint.id;
    createTask.mutate(body);
  }

  function onCreateSprint(e: FormEvent) {
    e.preventDefault();
    createSprint.mutate({ name: sprintName, startsAt: sprintStart, endsAt: sprintEnd });
  }

  return (
    <main className="board-page">
      <header className="topbar">
        <div>
          <Link to="/" className="back">
            ← Projects
          </Link>
          <h1>
            {project.data?.name ?? "Loading…"}{" "}
            {project.data && <span className="badge">{project.data.keyPrefix}</span>}
          </h1>
        </div>
      </header>

      <div className="toolbar">
        <label>
          Sprint
          <select value={sprintFilter} onChange={(e) => setSprintFilter(e.target.value)}>
            <option value="all">All tasks</option>
            <option value="none">Backlog (no sprint)</option>
            {sprints.data?.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </label>
        {selectedSprint && (
          <>
            <span>
              {new Date(selectedSprint.startsAt).toLocaleDateString()} to{" "}
              {new Date(selectedSprint.endsAt).toLocaleDateString()}
              {selectedSprint.goal ? `. ${selectedSprint.goal}` : ""}
            </span>
            {selectedSprint.status === "PLANNED" && (
              <button
                type="button"
                onClick={() => advanceSprint.mutate({ id: selectedSprint.id, status: "ACTIVE" })}
              >
                Start sprint
              </button>
            )}
            {selectedSprint.status === "ACTIVE" && (
              <button
                type="button"
                onClick={() =>
                  advanceSprint.mutate({ id: selectedSprint.id, status: "COMPLETED" })
                }
              >
                Complete sprint
              </button>
            )}
          </>
        )}
      </div>
      {advanceSprint.error && <p className="error">{advanceSprint.error.message}</p>}
      {move.error && <p className="error">Could not move task: {move.error.message}</p>}

      <details className="panel">
        <summary>New task</summary>
        <form onSubmit={onCreateTask}>
          <label>
            Title
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
          </label>
          <label>
            Story points (optional)
            <input
              type="number"
              min={0}
              max={100}
              value={taskPoints}
              onChange={(e) => setTaskPoints(e.target.value)}
            />
          </label>
          <label>
            Assignee (optional)
            <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {project.data?.members.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <small>
            {selectedSprint
              ? `New tasks go into ${selectedSprint.name}.`
              : "No sprint selected, so new tasks go to the backlog."}
          </small>
          {createTask.error && <p className="error">{createTask.error.message}</p>}
          <button disabled={createTask.isPending}>Add task</button>
        </form>
      </details>

      <details className="panel">
        <summary>New sprint</summary>
        <form onSubmit={onCreateSprint}>
          <label>
            Name
            <input value={sprintName} onChange={(e) => setSprintName(e.target.value)} required />
          </label>
          <label>
            Starts
            <input
              type="date"
              value={sprintStart}
              onChange={(e) => setSprintStart(e.target.value)}
              required
            />
          </label>
          <label>
            Ends
            <input
              type="date"
              value={sprintEnd}
              onChange={(e) => setSprintEnd(e.target.value)}
              required
            />
          </label>
          {createSprint.error && <p className="error">{createSprint.error.message}</p>}
          <button disabled={createSprint.isPending}>Create sprint</button>
        </form>
      </details>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="board">
          {TASK_STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={visible.filter((t) => t.status === status)}
              memberNames={memberNames}
            />
          ))}
        </div>
      </DndContext>
    </main>
  );
}