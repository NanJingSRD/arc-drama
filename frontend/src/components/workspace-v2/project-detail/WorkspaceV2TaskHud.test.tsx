import { act, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRef } from "react";
import { WorkspaceV2TaskHud } from "@/components/workspace-v2/project-detail/WorkspaceV2TaskHud";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import { makeTask } from "@/test/factories";
import i18n from "@/i18n";

function HostedWorkspaceV2TaskHud() {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div>
      <div ref={anchorRef} data-testid="anchor" />
      <WorkspaceV2TaskHud anchorRef={anchorRef} />
    </div>
  );
}

describe("WorkspaceV2TaskHud", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    useAppStore.setState({ taskHudOpen: false });
    useTasksStore.setState({
      tasks: [],
      stats: { queued: 0, running: 0, cancelling: 0, succeeded: 0, failed: 0, cancelled: 0, total: 0 },
    });
  });

  it("keeps succeeded tasks visible", async () => {
    vi.useFakeTimers();
    await i18n.changeLanguage("zh");
    useAppStore.setState({ taskHudOpen: true });
    useTasksStore.setState({
      tasks: [
        makeTask({
          task_id: "done-1",
          status: "succeeded",
          task_type: "character",
          media_type: "image",
          resource_id: "hero",
        }),
      ],
    });

    render(<HostedWorkspaceV2TaskHud />);
    expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getAllByText("已完成").length).toBeGreaterThan(0);
  });

  it("shows more than five completed tasks", async () => {
    await i18n.changeLanguage("zh");
    useAppStore.setState({ taskHudOpen: true });
    useTasksStore.setState({
      tasks: Array.from({ length: 7 }, (_, i) =>
        makeTask({
          task_id: `done-${i}`,
          status: "succeeded",
          task_type: "character",
          media_type: "image",
          resource_id: `char-${i}`,
        }),
      ),
    });

    render(<HostedWorkspaceV2TaskHud />);
    expect(screen.getAllByText("已完成")).toHaveLength(7);
  });

  it("prefers auto_assets payload.asset_type for the resource label", async () => {
    await i18n.changeLanguage("zh");
    useAppStore.setState({ taskHudOpen: true });
    useTasksStore.setState({
      tasks: [
        makeTask({
          task_id: "extract-1",
          status: "succeeded",
          task_type: "auto_assets",
          media_type: "image",
          resource_id: "auto_assets",
          payload: { asset_type: "scene" },
        }),
      ],
    });

    render(<HostedWorkspaceV2TaskHud />);
    expect(screen.getByText("scene")).toBeTruthy();
    expect(screen.getByText("auto_assets")).toBeTruthy();
  });

  it("labels text media_type as text channel, not audio", async () => {
    await i18n.changeLanguage("zh");
    useAppStore.setState({ taskHudOpen: true });
    useTasksStore.setState({
      tasks: [
        makeTask({
          task_id: "script-1",
          status: "succeeded",
          task_type: "script_process",
          media_type: "text",
          resource_id: "script_process",
        }),
      ],
    });

    render(<HostedWorkspaceV2TaskHud />);
    expect(screen.getAllByText("文本通道").length).toBeGreaterThan(0);
    expect(screen.queryByText("音频通道")).toBeNull();
  });
});
