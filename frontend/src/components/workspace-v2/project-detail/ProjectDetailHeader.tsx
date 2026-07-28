import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Settings, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import { WS2_GHOST_BTN_CLS, WS2_HEADER_BAR_CLASS } from "../workspace-v2-theme";
import { WS2_HOME_BADGE_CLASS } from "../workspace-v2-home-theme";
import type { WorkspaceV2DramaType } from "@/types/workspace-v2";
import { cn } from "@/lib/utils";
import { WorkspaceV2TaskHud } from "./WorkspaceV2TaskHud";

/** 流程节点相对左右区域再多留出的安全间距 */
const WORKFLOW_SIDE_BUFFER_PX = 100;

interface ProjectDetailHeaderProps {
  projectName: string;
  contentModeLabel?: string;
  dramaType?: WorkspaceV2DramaType;
  onBack: () => void;
  onSettings?: () => void;
  /** 居中放入 header 的流程节点（紧凑版） */
  centerSlot?: ReactNode;
}

export function ProjectDetailHeader({
  projectName,
  contentModeLabel,
  dramaType,
  onBack,
  onSettings,
  centerSlot,
}: ProjectDetailHeaderProps) {
  const { t } = useTranslation("dashboard");
  const { taskHudOpen, setTaskHudOpen } = useAppStore();
  const { stats } = useTasksStore();
  const taskHudAnchorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [workflowMaxWidth, setWorkflowMaxWidth] = useState<number | undefined>();
  const runningCount = stats.running + stats.queued;
  const initial = projectName.charAt(0) || "P";

  useLayoutEffect(() => {
    if (!centerSlot) return;

    const headerEl = headerRef.current;
    const leftEl = leftRef.current;
    const rightEl = rightRef.current;
    if (!headerEl || !leftEl || !rightEl) return;

    const updateMaxWidth = () => {
      const next = Math.max(
        0,
        headerEl.clientWidth - leftEl.offsetWidth - rightEl.offsetWidth - WORKFLOW_SIDE_BUFFER_PX,
      );
      setWorkflowMaxWidth(next);
    };

    updateMaxWidth();

    const ro = new ResizeObserver(updateMaxWidth);
    ro.observe(headerEl);
    ro.observe(leftEl);
    ro.observe(rightEl);
    return () => ro.disconnect();
  }, [centerSlot, projectName, contentModeLabel, dramaType]);

  return (
    <header
      ref={headerRef}
      className={cn("relative z-30 flex h-14 shrink-0 items-center px-6", WS2_HEADER_BAR_CLASS)}
    >
      <div ref={leftRef} className="relative z-20 flex min-w-0 items-center">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          aria-label="返回项目列表"
          className={WS2_GHOST_BTN_CLS}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="ml-3 flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-cyan-500/15 text-[13px] font-bold text-cyan-200">
            {initial}
          </span>
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">
            {projectName}
          </h1>
          {contentModeLabel && dramaType ? (
            <Badge className={cn(WS2_HOME_BADGE_CLASS, "shrink-0 border-0")}>
              {contentModeLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      {centerSlot ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-14 items-end justify-center pb-1.5">
          <div
            className="@container pointer-events-auto max-w-full overflow-visible"
            style={{ width: workflowMaxWidth }}
          >
            {centerSlot}
          </div>
        </div>
      ) : null}

      <div ref={rightRef} className="relative z-20 ml-auto flex items-center gap-1">
        <div className="relative" ref={taskHudAnchorRef}>
          <Button
            variant={taskHudOpen ? "secondary" : "outline"}
            size="icon"
            onClick={() => setTaskHudOpen(!taskHudOpen)}
            title={t("task_status_tooltip", {
              running: stats.running,
              queued: stats.queued,
            })}
            aria-label={t("toggle_task_panel")}
            className={cn("relative", WS2_GHOST_BTN_CLS, taskHudOpen && "border-cyan-400/35 bg-cyan-400/10 text-white")}
          >
            <ListChecks
              className={cn("h-[18px] w-[18px]", runningCount > 0 && "animate-shot-pulse")}
              strokeWidth={2}
            />
            {runningCount > 0 && (
              <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]">
                {runningCount}
              </Badge>
            )}
          </Button>
          <WorkspaceV2TaskHud
            anchorRef={taskHudAnchorRef}
            channelsMaxHeightClass="max-h-[28rem]"
          />
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={onSettings}
          aria-label="项目设置"
          title="项目设置"
          className={WS2_GHOST_BTN_CLS}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={2} />
        </Button>
      </div>
    </header>
  );
}
