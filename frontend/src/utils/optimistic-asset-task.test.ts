import { describe, expect, it } from "vitest";
import { useTasksStore } from "@/stores/tasks-store";
import {
  upsertOptimisticAssetTask,
  upsertOptimisticAssetBatchTask,
  upsertOptimisticAutoAssetsTask,
  upsertOptimisticScriptProcessTask,
} from "./optimistic-asset-task";

describe("upsertOptimisticAssetTask", () => {
  it("inserts a queued character task for immediate loading UI", () => {
    useTasksStore.setState({ tasks: [], stats: useTasksStore.getState().stats, connected: false });

    upsertOptimisticAssetTask({
      taskId: "task-123",
      projectName: "demo",
      taskType: "character",
      resourceId: "alice",
    });

    const tasks = useTasksStore.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      task_id: "task-123",
      project_name: "demo",
      task_type: "character",
      resource_id: "alice",
      status: "queued",
    });
  });
});

describe("upsertOptimisticScriptProcessTask", () => {
  it("inserts a queued script_process task", () => {
    useTasksStore.setState({ tasks: [], stats: useTasksStore.getState().stats, connected: false });

    upsertOptimisticScriptProcessTask({
      taskId: "script-task-1",
      projectName: "proj-demo",
    });

    expect(useTasksStore.getState().tasks[0]).toMatchObject({
      task_id: "script-task-1",
      project_name: "proj-demo",
      task_type: "script_process",
      media_type: "text",
      status: "queued",
    });
  });
});

describe("upsertOptimisticAutoAssetsTask", () => {
  it("inserts a queued auto_assets task", () => {
    useTasksStore.setState({ tasks: [], stats: useTasksStore.getState().stats, connected: false });

    upsertOptimisticAutoAssetsTask({
      taskId: "auto-task-1",
      projectName: "proj-demo",
      assetType: "scene",
    });

    expect(useTasksStore.getState().tasks[0]).toMatchObject({
      task_id: "auto-task-1",
      project_name: "proj-demo",
      task_type: "auto_assets",
      resource_id: "scene",
      status: "queued",
    });
  });
});

describe("upsertOptimisticAssetBatchTask", () => {
  it("inserts a queued batch task with batch payload", () => {
    useTasksStore.setState({ tasks: [], stats: useTasksStore.getState().stats, connected: false });

    upsertOptimisticAssetBatchTask({
      taskId: "batch-1",
      projectName: "proj-demo",
      taskType: "character",
    });

    expect(useTasksStore.getState().tasks[0]).toMatchObject({
      task_id: "batch-1",
      task_type: "character",
      payload: { batch: true },
      status: "queued",
    });
  });
});
