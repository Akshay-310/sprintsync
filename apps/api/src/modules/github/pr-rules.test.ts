import { describe, expect, it } from "vitest";
import { extractTaskNumbers, prStateFromPayload, statusFromPullRequests } from "./pr-rules.js";

describe("statusFromPullRequests", () => {
  it("leaves the task alone when there are no PRs", () => {
    expect(statusFromPullRequests([])).toBeNull();
  });
  it("draft PR means In Progress", () => {
    expect(statusFromPullRequests(["DRAFT"])).toBe("IN_PROGRESS");
  });
  it("open PR means In Review", () => {
    expect(statusFromPullRequests(["OPEN"])).toBe("IN_REVIEW");
  });
  it("merged PR means Done", () => {
    expect(statusFromPullRequests(["MERGED"])).toBe("DONE");
  });
  it("a merged PR plus an open PR stays In Review", () => {
    expect(statusFromPullRequests(["MERGED", "OPEN"])).toBe("IN_REVIEW");
  });
  it("all merged means Done", () => {
    expect(statusFromPullRequests(["MERGED", "MERGED"])).toBe("DONE");
  });
  it("only closed-unmerged PRs sends the task back to In Progress", () => {
    expect(statusFromPullRequests(["CLOSED"])).toBe("IN_PROGRESS");
  });
  it("an abandoned PR does not block Done", () => {
    expect(statusFromPullRequests(["CLOSED", "MERGED"])).toBe("DONE");
  });
  it("open beats draft", () => {
    expect(statusFromPullRequests(["DRAFT", "OPEN"])).toBe("IN_REVIEW");
  });
  it("gives the same answer whatever order the PRs arrive in", () => {
    expect(statusFromPullRequests(["OPEN", "MERGED"])).toBe(
      statusFromPullRequests(["MERGED", "OPEN"]),
    );
  });
});

describe("prStateFromPayload", () => {
  it("merged wins", () => {
    expect(prStateFromPayload({ state: "closed", merged: true, draft: false })).toBe("MERGED");
  });
  it("closed without merge", () => {
    expect(prStateFromPayload({ state: "closed", merged: false, draft: false })).toBe("CLOSED");
  });
  it("open draft", () => {
    expect(prStateFromPayload({ state: "open", merged: false, draft: true })).toBe("DRAFT");
  });
  it("open and ready", () => {
    expect(prStateFromPayload({ state: "open", merged: false, draft: false })).toBe("OPEN");
  });
});

describe("extractTaskNumbers", () => {
  it("finds a key in a branch name", () => {
    expect(extractTaskNumbers("SS", "feature/SS-12-login-page")).toEqual([12]);
  });
  it("is case-insensitive and finds several keys", () => {
    expect(extractTaskNumbers("SS", "Fixes SS-3 and ss-4")).toEqual([3, 4]);
  });
  it("ignores longer words that merely end in the prefix", () => {
    expect(extractTaskNumbers("SS", "XSS-9")).toEqual([]);
  });
  it("removes duplicates across fields", () => {
    expect(extractTaskNumbers("SS", "SS-12", "also SS-12")).toEqual([12]);
  });
  it("finds a key after an underscore", () => {
    expect(extractTaskNumbers("SS", "feature_SS-7")).toEqual([7]);
  });
  it("ignores a prefix with no number", () => {
    expect(extractTaskNumbers("SS", "SS- nothing here", null, undefined)).toEqual([]);
  });
});