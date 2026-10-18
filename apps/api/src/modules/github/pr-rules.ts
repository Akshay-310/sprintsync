import type { TaskStatus } from "../../constants.js";

export type PrState = "DRAFT" | "OPEN" | "MERGED" | "CLOSED";

// Decides a task's status from the current state of all PRs linked to it.
// Returns null when there are no PRs, meaning "leave the task alone".
export function statusFromPullRequests(states: readonly PrState[]): TaskStatus | null {
  if (states.length === 0) return null;
  const active = states.filter((s) => s !== "CLOSED");
  if (active.length === 0) return "IN_PROGRESS";
  if (active.includes("OPEN")) return "IN_REVIEW";
  if (active.includes("DRAFT")) return "IN_PROGRESS";
  return "DONE";
}

// Turns GitHub's pull request fields into one of our four states.
export function prStateFromPayload(pr: {
  state: string;
  merged: boolean;
  draft: boolean;
}): PrState {
  if (pr.merged) return "MERGED";
  if (pr.state === "closed") return "CLOSED";
  if (pr.draft) return "DRAFT";
  return "OPEN";
}

// Finds task keys like SS-12 in a branch name, title or description.
export function extractTaskNumbers(
  keyPrefix: string,
  ...texts: (string | null | undefined)[]
): number[] {
  const re = new RegExp(`(?<![A-Za-z0-9])${keyPrefix}-(\\d+)`, "gi");
  const found = new Set<number>();
  for (const text of texts) {
    if (!text) continue;
    for (const m of text.matchAll(re)) {
      if (m[1] !== undefined) found.add(Number(m[1]));
    }
  }
  return [...found].sort((a, b) => a - b);
}