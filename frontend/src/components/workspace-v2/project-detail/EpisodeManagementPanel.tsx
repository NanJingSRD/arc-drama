import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollText } from "lucide-react";
import {
  listWorkspaceV2Scripts,
  parseWorkspaceV2ListedScripts,
  parseWorkspaceV2ScriptEpisodes,
  processWorkspaceV2Script,
  resolveWorkspaceV2ScriptProcessTaskId,
  type WorkspaceV2ScriptEpisode,
} from "@/api/workspace-v2";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import type { TaskStatus } from "@/types";
import { errMsg } from "@/utils/async";
import { upsertOptimisticScriptProcessTask } from "@/utils/optimistic-asset-task";
import { cn } from "@/lib/utils";
import { WORKSPACE_V2_PROGRESS_LABELS } from "@/types/workspace-v2";
import { ProjectScriptEpisodesSection } from "./ProjectScriptEpisodesSection";
import { useWorkspaceV2ProjectDetail } from "./WorkspaceV2ProjectDetailContext";
import { Ws2NodeContentLayout } from "./Ws2NodeContentLayout";

const SCRIPT_PROCESS_ACTIVE = new Set<TaskStatus>(["queued", "running", "cancelling"]);

export function EpisodeManagementPanel() {
  const { t } = useTranslation(["dashboard", "common"]);
  const tRef = useRef(t);
  tRef.current = t;
  const { projectId, detail, refresh } = useWorkspaceV2ProjectDetail();

  const [loadingScripts, setLoadingScripts] = useState(true);
  const [submittingScript, setSubmittingScript] = useState(false);
  const [scriptEpisodes, setScriptEpisodes] = useState<WorkspaceV2ScriptEpisode[]>([]);
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false);

  const scriptTaskStatusesRef = useRef<Map<string, TaskStatus>>(new Map());
  const scriptTasksSeededRef = useRef(false);
  const busyTipShownRef = useRef(false);
  const suppressBusyTipRef = useRef(false);

  /** 仅订阅本项目 script_process，避免 tasks 轮询拖着整页（含场景详情弹框）每 3s 重绘 */
  const scriptProcessBusy = useTasksStore((s) =>
    s.tasks.some(
      (task) =>
        task.project_name === projectId &&
        task.task_type === "script_process" &&
        SCRIPT_PROCESS_ACTIVE.has(task.status),
    ),
  );

  const activeScriptTaskStatus = useTasksStore((s) => {
    const task = s.tasks.find(
      (item) =>
        item.project_name === projectId &&
        item.task_type === "script_process" &&
        SCRIPT_PROCESS_ACTIVE.has(item.status),
    );
    return task?.status ?? null;
  });

  const scriptProcessSignature = useTasksStore((s) =>
    s.tasks
      .filter(
        (task) => task.project_name === projectId && task.task_type === "script_process",
      )
      .map((task) => `${task.task_id}:${task.status}:${task.error_message ?? ""}`)
      .join("|"),
  );

  /** 拉取 GET /scripts；表格列读 scripts[file].metadata */
  const loadScripts = useCallback(async () => {
    const result = await listWorkspaceV2Scripts(projectId);
    return parseWorkspaceV2ListedScripts(result);
  }, [projectId]);

  const refreshScripts = useCallback(async () => {
    try {
      const episodes = await loadScripts();
      setScriptEpisodes(episodes);
    } catch (err) {
      useAppStore
        .getState()
        .pushNotification(
          tRef.current("workspace_script_process_failed", { message: errMsg(err) }),
          "error",
        );
    }
  }, [loadScripts]);

  useEffect(() => {
    scriptTaskStatusesRef.current = new Map();
    scriptTasksSeededRef.current = false;
    busyTipShownRef.current = false;
    suppressBusyTipRef.current = false;
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoadingScripts(true);
      try {
        const episodes = await loadScripts();
        if (!cancelled) setScriptEpisodes(episodes);
      } catch (err) {
        if (!cancelled) {
          setScriptEpisodes([]);
          useAppStore
            .getState()
            .pushNotification(
              tRef.current("workspace_script_process_failed", { message: errMsg(err) }),
              "error",
            );
        }
      } finally {
        if (!cancelled) setLoadingScripts(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadScripts]);

  // 任务终态：成功则刷分集（再调 GET /scripts）；失败则提示
  useEffect(() => {
    const tasks = useTasksStore.getState().tasks;
    const prev = scriptTaskStatusesRef.current;
    const next = new Map<string, TaskStatus>();
    let shouldReload = false;
    let failedMessage: string | null = null;

    for (const task of tasks) {
      if (task.project_name !== projectId || task.task_type !== "script_process") continue;
      const before = prev.get(task.task_id);
      next.set(task.task_id, task.status);

      if (!scriptTasksSeededRef.current) continue;

      // 仅在「已知上一状态 → 终态」时提示；进页首次看见已成功任务不算新完成
      if (
        task.status === "succeeded" &&
        before != null &&
        before !== "succeeded"
      ) {
        shouldReload = true;
      }
      if (task.status === "failed" && before != null && before !== "failed") {
        failedMessage =
          task.error_message?.trim() || tRef.current("workspace_script_empty_result");
      }
      if (task.status === "cancelled" && before != null && before !== "cancelled") {
        // 取消后恢复空表可操作态即可
      }
    }

    scriptTaskStatusesRef.current = next;

    if (!scriptTasksSeededRef.current) {
      scriptTasksSeededRef.current = true;
      return;
    }

    if (shouldReload) {
      // 分集列表 + 项目详情（进度/激活节点可能已推进）
      void refreshScripts();
      void refresh();
      useAppStore
        .getState()
        .pushToast(tRef.current("workspace_script_ready_toast"), "success");
    }
    if (failedMessage) {
      useAppStore
        .getState()
        .pushNotification(
          tRef.current("workspace_script_process_failed", { message: failedMessage }),
          "error",
        );
    }
  }, [projectId, refresh, refreshScripts, scriptProcessSignature]);

  // 队列中已有 script_process（含进页即排队）时给 tip；本地点击提交已 toast 则跳过一次
  useEffect(() => {
    if (!scriptProcessBusy) {
      busyTipShownRef.current = false;
      return;
    }
    if (busyTipShownRef.current) return;
    busyTipShownRef.current = true;
    if (suppressBusyTipRef.current) {
      suppressBusyTipRef.current = false;
      return;
    }
    useAppStore.getState().pushToast(tRef.current("script_generation_notice_toast"), "info");
  }, [scriptProcessBusy]);

  const handleGenerateScript = useCallback(async () => {
    if (submittingScript || scriptProcessBusy) return;

    setSubmittingScript(true);
    suppressBusyTipRef.current = true;
    useAppStore.getState().pushToast(tRef.current("script_generation_notice_toast"), "info");

    try {
      const result = await processWorkspaceV2Script(projectId);
      // 生成后优先拉 GET /scripts，表格用响应中的 scripts 字段
      let episodes = await loadScripts();
      if (episodes.length === 0) {
        episodes = parseWorkspaceV2ScriptEpisodes(result);
      }
      if (episodes.length > 0) {
        setScriptEpisodes(episodes);
        void refresh();
        useAppStore
          .getState()
          .pushToast(tRef.current("workspace_script_ready_toast"), "success");
        return;
      }

      const taskId = resolveWorkspaceV2ScriptProcessTaskId(result);
      if (taskId) {
        upsertOptimisticScriptProcessTask({ taskId, projectName: projectId });
        return;
      }

      throw new Error(result.message?.trim() || tRef.current("workspace_script_empty_result"));
    } catch (err) {
      useAppStore
        .getState()
        .pushNotification(
          tRef.current("workspace_script_process_failed", { message: errMsg(err) }),
          "error",
        );
    } finally {
      setSubmittingScript(false);
    }
  }, [loadScripts, projectId, refresh, scriptProcessBusy, submittingScript]);

  const showGenerateButton = Boolean(detail?.hasOverview);
  const scriptGenerating = submittingScript || scriptProcessBusy;
  const hasScriptEpisodes = scriptEpisodes.length > 0;
  const generateButtonLabel = hasScriptEpisodes
    ? t("workspace_regenerate_script")
    : t("workspace_generate_script");
  const tableLoading = loadingScripts || scriptGenerating;
  // 任务队列忙碌 →「生成中/排队中」；仅进页拉 GET /scripts →「获取数据中」
  const loadingTitle = scriptGenerating
    ? activeScriptTaskStatus === "queued"
      ? t("workspace_script_queued")
      : t("workspace_generating_script")
    : t("workspace_script_fetching");
  const loadingMessage = scriptGenerating
    ? activeScriptTaskStatus === "queued"
      ? t("workspace_script_queued_hint")
      : t("script_generation_notice_toast")
    : t("workspace_script_fetching_hint");

  const handleGenerateClick = () => {
    if (tableLoading) return;
    if (hasScriptEpisodes) {
      setRegenConfirmOpen(true);
      return;
    }
    void handleGenerateScript();
  };

  const handleConfirmRegenerate = () => {
    setRegenConfirmOpen(false);
    void handleGenerateScript();
  };

  return (
    <>
      <Ws2NodeContentLayout
        title={WORKSPACE_V2_PROGRESS_LABELS.script_episoding}
        titleAction={
          showGenerateButton ? (
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateClick}
              disabled={tableLoading}
              title={scriptGenerating ? loadingTitle : generateButtonLabel}
            >
              <ScrollText
                className={cn("h-3.5 w-3.5", scriptGenerating && "animate-pulse")}
                strokeWidth={2.4}
              />
              {scriptGenerating ? loadingTitle : generateButtonLabel}
            </Button>
          ) : undefined
        }
        plainBody
        scrollBody={false}
        bodyClassName="overflow-hidden"
        bodyInnerClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      >
        <ProjectScriptEpisodesSection
          episodes={scriptEpisodes}
          projectId={projectId}
          loading={tableLoading}
          loadingTitle={loadingTitle}
          loadingMessage={loadingMessage}
          onSceneSaved={refreshScripts}
        />
      </Ws2NodeContentLayout>

      <ConfirmDialog
        open={regenConfirmOpen}
        tone="danger"
        title={t("workspace_regenerate_script_confirm_title")}
        description={t("workspace_regenerate_script_confirm_desc")}
        confirmLabel={t("workspace_regenerate_script")}
        cancelLabel={t("common:cancel")}
        onCancel={() => setRegenConfirmOpen(false)}
        onConfirm={handleConfirmRegenerate}
      />
    </>
  );
}
