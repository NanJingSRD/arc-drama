import { describe, expect, it } from "vitest";
import type { TaskItem } from "@/types";
import { mergePolledTasks, OPTIMISTIC_TASK_POLL_GRACE_MS } from "./merge-polled-tasks";

function task(partial: Partial<TaskItem> & Pick<TaskItem, "task_id">): TaskItem {
  const now = new Date().toISOString();
  return {
    project_name: "proj",
    task_type: "auto_assets",
    media_type: "image",
    resource_id: "character",
    script_file: null,
    payload: {},
    status: "queued",
    result: null,
    error_message: null,
    cancelled_by: null,
    provider_id: null,
    provider_job_id: null,
    source: "webui",
    queued_at: now,
    started_at: null,
    finished_at: null,
    updated_at: now,
    ...partial,
  };
}

describe("mergePolledTasks", () => {
  it("keeps recent optimistic active tasks missing from the server poll", () => {
    const now = Date.now();
    const local = task({
      task_id: "t-local",
      queued_at: new Date(now - 1000).toISOString(),
    });
    const server = task({ task_id: "t-server", status: "succeeded", source: "agent" });

    const merged = mergePolledTasks([server], [local], now);
    expect(merged.map((item) => item.task_id)).toEqual(["t-local", "t-server"]);
  });

  it("drops optimistic tasks outside the grace window", () => {
    const now = Date.now();
    const stale = task({
      task_id: "t-stale",
      queued_at: new Date(now - OPTIMISTIC_TASK_POLL_GRACE_MS - 1).toISOString(),
    });

    expect(mergePolledTasks([], [stale], now)).toEqual([]);
  });

  it("does not keep terminal or non-webui locals", () => {
    const now = Date.now();
    const done = task({
      task_id: "t-done",
      status: "succeeded",
      queued_at: new Date(now - 1000).toISOString(),
    });
    const agent = task({
      task_id: "t-agent",
      source: "agent",
      queued_at: new Date(now - 1000).toISOString(),
    });

    expect(mergePolledTasks([], [done, agent], now)).toEqual([]);
  });
});
