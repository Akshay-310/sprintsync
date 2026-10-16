import { useDroppable } from "@dnd-kit/core";
import { STATUS_LABELS } from "../constants";
import type { TaskStatus } from "../constants";
import type { Task } from "../types";
import { TaskCard } from "./TaskCard";

export function Column({
  status,
  tasks,
  memberNames,
}: {
  status: TaskStatus;
  tasks: Task[];
  memberNames: Map<number, string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section ref={setNodeRef} className={`column${isOver ? " over" : ""}`}>
      <h3>
        {STATUS_LABELS[status]} <span>{tasks.length}</span>
      </h3>
      {tasks.map((t) => (
        <TaskCard
          key={t.number}
          task={t}
          assignee={t.assigneeId !== null ? (memberNames.get(t.assigneeId) ?? null) : null}
        />
      ))}
    </section>
  );
}