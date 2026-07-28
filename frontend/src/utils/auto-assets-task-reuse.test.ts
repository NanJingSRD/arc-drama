import { describe, expect, it } from "vitest";
import type { TaskItem } from "@/types";
import { isReusedAutoAssetsTaskId } from "./auto-assets-task-reuse";

function task(partial: Partial<TaskItem> & Pick<TaskItem, "task_id">): TaskItem {
  const now = new Date().toISOString();
  return {
    project_name: "proj",
    task_type: "auto_assets",
    media_type: "image",
    resource_id: "character",
    script_file: null,
    payload: { asset_type: "character" },
    status: "succeeded",
    result: null,
    error_message: null,
    cancelled_by: null,
    provider_id: null,
    provider_job_id: null,
    source: "webui",
    queued_at: now,
    started_at: now,
    finished_at: now,
    updated_at: now,
    ...partial,
  };
}

describe("isReusedAutoAssetsTaskId", () => {
  it("flags when the same id is already tracked for another asset type", () => {
    expect(
      isReusedAutoAssetsTaskId({
        taskId: "t1",
        extractType: "scene",
        tasks: [],
        extractTaskIdByType: { character: "t1" },
      }),
    ).toBe(true);
  });

  it("flags when returning a terminal auto_assets task id", () => {
    expect(
      isReusedAutoAssetsTaskId({
        taskId: "t1",
        extractType: "prop",
        tasks: [task({ task_id: "t1" })],
        extractTaskIdByType: {},
      }),
    ).toBe(true);
  });

  it("allows the same id while the same asset type is still active", () => {
    expect(
      isReusedAutoAssetsTaskId({
        taskId: "t1",
        extractType: "character",
        tasks: [
          task({
            task_id: "t1",
            status: "running",
            finished_at: null,
            payload: { asset_type: "character" },
          }),
        ],
        extractTaskIdByType: { character: "t1" },
      }),
    ).toBe(false);
  });

  it("allows a brand-new task id", () => {
    expect(
      isReusedAutoAssetsTaskId({
        taskId: "t-new",
        extractType: "scene",
        tasks: [task({ task_id: "t-old" })],
        extractTaskIdByType: { character: "t-old" },
      }),
    ).toBe(false);
  });
});
