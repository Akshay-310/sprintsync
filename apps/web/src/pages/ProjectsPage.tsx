import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { useAuth } from "../auth-context";
import type { Project } from "../types";

export function ProjectsPage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [keyPrefix, setKeyPrefix] = useState("");

  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => api<Project[]>("/api/projects"),
  });

  const create = useMutation({
    mutationFn: (input: { name: string; keyPrefix: string }) =>
      api<Project>("/api/projects", { method: "POST", body: input }),
    onSuccess: async () => {
      setName("");
      setKeyPrefix("");
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ name, keyPrefix });
  }

  return (
    <main className="page">
      <header className="topbar">
        <h1>Projects</h1>
        <div className="row">
          <span>{user?.name}</span>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <form onSubmit={onSubmit}>
        <h2>New project</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Key (2 to 6 letters)
          <input
            value={keyPrefix}
            onChange={(e) => setKeyPrefix(e.target.value)}
            maxLength={6}
            required
          />
        </label>
        {create.error && <p className="error">{create.error.message}</p>}
        <button disabled={create.isPending}>Create project</button>
      </form>

      {projects.isLoading && <p>Loading…</p>}
      {projects.error && <p className="error">{projects.error.message}</p>}
      <ul className="project-list">
        {projects.data?.map((p) => (
          <li key={p.id}>
            <Link to={`/projects/${p.id}`}>
              <span>{p.name}</span>
              <span>
                {p.keyPrefix} · {p.role}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}