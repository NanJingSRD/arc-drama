import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useWorkspaceV2AssetTaskRefresh,
  WORKSPACE_V2_PROJECT_DETAIL_TASK_REFRESH_TYPES,
} from "@/hooks/useWorkspaceV2AssetTaskRefresh";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import type { TaskItem } from "@/types";

function Harness({
  projectId,
  onRefresh,
  taskTypes,
}: {
  projectId: string;
  onRefresh: () => void | Promise<unknown>;
  taskTypes?: readonly string[];
}) {
  useWorkspaceV2AssetTaskRefresh(projectId, onRefresh, taskTypes);
  return null;
}

function task(overrides: Partial<TaskItem>): TaskItem {
  return {
    task_id: "t1",
    project_name: "demo",
    task_type: "character",
    media_type: "image",
    resource_id: "hero",
    script_file: null,
    payload: {},
    status: "queued",
    result: null,
    error_message: null,
    cancelled_by: null,
    provider_id: null,
    provider_job_id: null,
    source: "webui",
    queued_at: "",
    started_at: null,
    finished_at: null,
    updated_at: "",
    ...overrides,
  };
}

describe("useWorkspaceV2AssetTaskRefresh", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
    useTasksStore.setState({ tasks: [], connected: true });
  });

  it("does not refresh for tasks already succeeded on baseline", async () => {
    const onRefresh = vi.fn();
    useTasksStore.setState({ tasks: [task({ status: "succeeded" })] });
    render(<Harness projectId="demo" onRefresh={onRefresh} />);
    await waitFor(() => expect(onRefresh).not.toHaveBeenCalled());
  });

  it("refreshes and invalidates entity when an asset task transitions to succeeded", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    useTasksStore.setState({ tasks: [task({ status: "running" })] });
    render(<Harness projectId="demo" onRefresh={onRefresh} />);

    act(() => {
      useTasksStore.setState({ tasks: [task({ status: "succeeded" })] });
    });

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(useAppStore.getState().entityRevisions["character:hero"]).toBe(1);
  });

  it("ignores non-asset tasks by default", async () => {
    const onRefresh = vi.fn();
    useTasksStore.setState({
      tasks: [task({ task_type: "storyboard", resource_id: "E1S01", status: "running" })],
    });
    render(<Harness projectId="demo" onRefresh={onRefresh} />);

    act(() => {
      useTasksStore.setState({
        tasks: [task({ task_type: "storyboard", resource_id: "E1S01", status: "succeeded" })],
      });
    });

    await waitFor(() => expect(onRefresh).not.toHaveBeenCalled());
  });

  it("ignores video tasks by default (asset library reload)", async () => {
    const onRefresh = vi.fn();
    useTasksStore.setState({
      tasks: [task({ task_type: "video", resource_id: "E1S01", status: "running" })],
    });
    render(<Harness projectId="demo" onRefresh={onRefresh} />);

    act(() => {
      useTasksStore.setState({
        tasks: [task({ task_type: "video", resource_id: "E1S01", status: "succeeded" })],
      });
    });

    await waitFor(() => expect(onRefresh).not.toHaveBeenCalled());
  });

  it("refreshes project detail when a video task succeeds with detail task types", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    useTasksStore.setState({
      tasks: [task({ task_type: "video", resource_id: "E1S01", status: "running" })],
    });
    render(
      <Harness
        projectId="demo"
        onRefresh={onRefresh}
        taskTypes={WORKSPACE_V2_PROJECT_DETAIL_TASK_REFRESH_TYPES}
      />,
    );

    act(() => {
      useTasksStore.setState({
        tasks: [task({ task_type: "video", resource_id: "E1S01", status: "succeeded" })],
      });
    });

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it("refreshes when an auto_assets extract task succeeds", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    useTasksStore.setState({
      tasks: [task({ task_type: "auto_assets", resource_id: "scene", status: "running" })],
    });
    render(<Harness projectId="demo" onRefresh={onRefresh} />);

    act(() => {
      useTasksStore.setState({
        tasks: [task({ task_type: "auto_assets", resource_id: "scene", status: "succeeded" })],
      });
    });

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it("ignores tasks from other projects", async () => {
    const onRefresh = vi.fn();
    useTasksStore.setState({
      tasks: [task({ project_name: "other", status: "running" })],
    });
    render(<Harness projectId="demo" onRefresh={onRefresh} />);

    act(() => {
      useTasksStore.setState({
        tasks: [task({ project_name: "other", status: "succeeded" })],
      });
    });

    await waitFor(() => expect(onRefresh).not.toHaveBeenCalled());
  });
});
