import { useDraggable } from "@dnd-kit/core";
import type { Task } from "../types";

export function TaskCard({ task, assignee }: { task: Task; assignee: string | null }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.number,
  });

  return (
    <article
      ref={setNodeRef}
      className="card"
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
      {...listeners}
      {...attributes}
    >
      <div className="card-top">
        <strong>{task.key}</strong>
        {task.points !== null && <span className="badge">{task.points} pts</span>}
      </div>
      <p>{task.title}</p>
      {assignee && <small>{assignee}</small>}
    </article>
  );
}