import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  addWorkspaceV2Character,
  addWorkspaceV2Prop,
  addWorkspaceV2Scene,
  countWorkspaceV2ExtractedAssets,
  extractWorkspaceV2Assets,
  generateWorkspaceV2Character,
  generateWorkspaceV2CharacterBatch,
  generateWorkspaceV2Prop,
  generateWorkspaceV2PropBatch,
  generateWorkspaceV2Scene,
  generateWorkspaceV2SceneBatch,
  getWorkspaceV2FileUrl,
  listWorkspaceV2Tasks,
  resolveWorkspaceV2BatchGenerateTaskIds,
  resolveWorkspaceV2ExtractAssetsTaskId,
  updateWorkspaceV2Character,
  updateWorkspaceV2Prop,
  updateWorkspaceV2Scene,
  uploadWorkspaceV2File,
  type WorkspaceV2MappedProjectAssets,
} from "@/api/workspace-v2";
import { AssetFormModal } from "@/components/assets/AssetFormModal";
import { CharactersPage } from "@/components/canvas/lorebook/CharactersPage";
import { ProjectAssetFilesProvider } from "@/components/canvas/lorebook/ProjectAssetFilesContext";
import { PropsPage } from "@/components/canvas/lorebook/PropsPage";
import { ScenesPage } from "@/components/canvas/lorebook/ScenesPage";
import { useAppStore } from "@/stores/app-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useTasksStore } from "@/stores/tasks-store";
import type { TaskStatus } from "@/types";
import type { AssetType } from "@/types/asset";
import { WORKSPACE_V2_ASSET_SUB_NAV_LABELS, type WorkspaceV2AssetSubNavId } from "@/types/workspace-v2";
import { errMsg } from "@/utils/async";
import { mergePolledTasks } from "@/utils/merge-polled-tasks";
import {
  upsertOptimisticAssetBatchTask,
  upsertOptimisticAssetTask,
  upsertOptimisticAutoAssetsTask,
} from "@/utils/optimistic-asset-task";
import { isReusedAutoAssetsTaskId } from "@/utils/auto-assets-task-reuse";
import { buildEntityRevisionKey } from "@/utils/project-changes";
import { computeTaskStatsFromTasks } from "@/utils/task-stats";
import { useWorkspaceV2ProjectDetail } from "./WorkspaceV2ProjectDetailContext";
import { cn } from "@/lib/utils";

const EXTRACT_TASK_ACTIVE = new Set<TaskStatus>(["queued", "running", "cancelling"]);

const ASSET_TYPE_BY_SUB_NAV = {
  characters: "character",
  scenes: "scene",
  props: "prop",
} as const satisfies Record<WorkspaceV2AssetSubNavId, AssetType>;

type ExtractableAssetType = (typeof ASSET_TYPE_BY_SUB_NAV)[WorkspaceV2AssetSubNavId];

type ExtractTaskIdByType = Partial<Record<ExtractableAssetType, string | null>>;
type BatchTaskIdsByType = Partial<Record<ExtractableAssetType, string[]>>;

/** auto_assets 任务是否属于当前资产子类（含一次性提全部） */
function isExtractTaskForAssetType(
  task: { resource_id: string; payload: Record<string, unknown> },
  assetType: ExtractableAssetType,
): boolean {
  const fromPayload = task.payload?.asset_type;
  if (typeof fromPayload === "string") {
    return fromPayload === assetType || fromPayload === "all";
  }
  return task.resource_id === assetType || task.resource_id === "all";
}

function isAssetGenerateTaskActive(
  task: { project_name: string; task_type: string; status: TaskStatus },
  projectId: string,
  assetType: ExtractableAssetType,
): boolean {
  return (
    task.project_name === projectId &&
    task.task_type === assetType &&
    EXTRACT_TASK_ACTIVE.has(task.status)
  );
}

/** 单卡生成任务（排除「生成全部」乐观写入的 batch 占位） */
function isPerAssetGenerateTaskActive(
  task: {
    project_name: string;
    task_type: string;
    status: TaskStatus;
    resource_id: string;
    payload: Record<string, unknown>;
  },
  projectId: string,
  assetType: ExtractableAssetType,
): boolean {
  return (
    isAssetGenerateTaskActive(task, projectId, assetType) &&
    task.payload?.batch !== true &&
    !String(task.resource_id).startsWith("__batch__:")
  );
}

interface AssetLibraryPanelProps {
  subNav: WorkspaceV2AssetSubNavId;
  className?: string;
  /** 来自 GET /projects/{id}/assets 的映射结果 */
  assets: WorkspaceV2MappedProjectAssets;
  /** 重新拉取资产列表（增删改/提取/生成后） */
  onReloadAssets: () => Promise<unknown>;
  addingAsset?: boolean;
  onAddingAssetChange?: (open: boolean) => void;
  /** 子 tab 内容区提取/批量生成 loading，用于禁用顶栏「新增」 */
  onTabContentBusyChange?: (busy: boolean) => void;
}

export function AssetLibraryPanel({
  subNav,
  className,
  assets,
  onReloadAssets,
  addingAsset = false,
  onAddingAssetChange,
  onTabContentBusyChange,
}: AssetLibraryPanelProps) {
  const { t } = useTranslation("dashboard");
  const tRef = useRef(t);
  tRef.current = t;
  const { projectId, detail, refresh } = useWorkspaceV2ProjectDetail();
  const [submittingExtractType, setSubmittingExtractType] = useState<ExtractableAssetType | null>(
    null,
  );
  /** 按资产类型分别跟踪提取任务，避免切 tab / 并发提取时互相覆盖 */
  const [extractTaskIdByType, setExtractTaskIdByType] = useState<ExtractTaskIdByType>({});
  const handledExtractTaskIdsRef = useRef(new Set<string>());
  const [submittingBatchType, setSubmittingBatchType] = useState<ExtractableAssetType | null>(null);
  /** 本轮「生成全部」提交的任务 id（按类型），用于全部终态后刷新；不驱动整 tab loading */
  const [batchTaskIdsByType, setBatchTaskIdsByType] = useState<BatchTaskIdsByType>({});
  /**
   * 提交刚结束后的过渡：整 tab loading 保持到单卡任务出现在队列，
   * 或超时后收起，避免一直挡着卡片「生成中」。
   */
  const [batchWatchByType, setBatchWatchByType] = useState<
    Partial<Record<ExtractableAssetType, boolean>>
  >({});
  const batchSeenActiveRef = useRef<Partial<Record<ExtractableAssetType, boolean>>>({});
  const batchWatchSinceRef = useRef<Partial<Record<ExtractableAssetType, number>>>({});
  const tasks = useTasksStore((s) => s.tasks);

  const project = detail?.sourceProject;
  const assetType = ASSET_TYPE_BY_SUB_NAV[subNav];
  const characters = assets.characters;
  const scenes = assets.scenes;
  const props = assets.props;

  useEffect(() => {
    setExtractTaskIdByType({});
    setSubmittingExtractType(null);
    setSubmittingBatchType(null);
    setBatchTaskIdsByType({});
    setBatchWatchByType({});
    handledExtractTaskIdsRef.current = new Set();
    batchSeenActiveRef.current = {};
    batchWatchSinceRef.current = {};
  }, [projectId]);

  useEffect(() => {
    if (!detail || !project) return;
    useProjectsStore.getState().setCurrentProject(
      projectId,
      {
        ...project,
        characters,
        scenes,
        props,
      },
      {},
      detail.assetFingerprints,
    );
  }, [characters, detail, project, projectId, props, scenes]);

  /** 单卡生成中的资源名（不含批量任务） */
  const generatingNames = useMemo(() => {
    const taskType =
      subNav === "characters" ? "character" : subNav === "scenes" ? "scene" : "prop";
    const names = new Set<string>();
    for (const task of tasks) {
      if (
        task.task_type === taskType &&
        task.project_name === projectId &&
        EXTRACT_TASK_ACTIVE.has(task.status) &&
        task.payload?.batch !== true &&
        !String(task.resource_id).startsWith("__batch__:")
      ) {
        names.add(task.resource_id);
      }
    }
    return names;
  }, [projectId, subNav, tasks]);

  const extractBusy = useMemo(() => {
    if (submittingExtractType === assetType) return true;

    const trackedId = extractTaskIdByType[assetType] ?? null;
    if (trackedId) {
      const tracked = tasks.find((task) => task.task_id === trackedId);
      // 乐观任务可能被轮询整表覆盖暂时找不到；仍视为 busy，直到终态 effect 清掉
      if (!tracked) return true;
      if (
        EXTRACT_TASK_ACTIVE.has(tracked.status) &&
        isExtractTaskForAssetType(tracked, assetType)
      ) {
        return true;
      }
    }

    return tasks.some(
      (task) =>
        task.project_name === projectId &&
        task.task_type === "auto_assets" &&
        EXTRACT_TASK_ACTIVE.has(task.status) &&
        isExtractTaskForAssetType(task, assetType),
    );
  }, [assetType, extractTaskIdByType, projectId, submittingExtractType, tasks]);

  /**
   * 整 tab loading：仅覆盖「请求提交中」+「等到单卡任务出现」的短过渡。
   * 不再跟着整批 task 跑完全程（否则会一直挡着，必须切 tab remount 才露出单卡生成中）。
   */
  const generateAllBusy = useMemo(() => {
    if (submittingBatchType === assetType) return true;

    if (batchWatchByType[assetType]) {
      if (tasks.some((task) => isPerAssetGenerateTaskActive(task, projectId, assetType))) {
        return false;
      }
      const since = batchWatchSinceRef.current[assetType] ?? 0;
      return Date.now() - since < 4500;
    }

    return false;
  }, [assetType, batchWatchByType, projectId, submittingBatchType, tasks]);

  const tabContentBusy = extractBusy || generateAllBusy;

  useEffect(() => {
    onTabContentBusyChange?.(tabContentBusy);
    return () => onTabContentBusyChange?.(false);
  }, [onTabContentBusyChange, tabContentBusy]);

  const handleRefresh = useCallback(async (invalidateKeys: string[] = []) => {
    await Promise.all([refresh(), onReloadAssets()]);
    if (invalidateKeys.length > 0) {
      useAppStore.getState().invalidateEntities(invalidateKeys);
    }
  }, [onReloadAssets, refresh]);

  // 批量生成：单卡任务出现后收起过渡 loading；跟踪的 task 全部终态后刷新
  useEffect(() => {
    const types: ExtractableAssetType[] = ["character", "scene", "prop"];
    for (const type of types) {
      if (batchWatchByType[type] && submittingBatchType !== type) {
        const hasPerAsset = tasks.some((task) =>
          isPerAssetGenerateTaskActive(task, projectId, type),
        );
        if (hasPerAsset) {
          batchSeenActiveRef.current[type] = true;
          delete batchWatchSinceRef.current[type];
          setBatchWatchByType((prev) => (prev[type] ? { ...prev, [type]: false } : prev));
        } else {
          const since = batchWatchSinceRef.current[type] ?? 0;
          const timedOut = Date.now() - since >= 4500;
          const hasTrackedIds = (batchTaskIdsByType[type]?.length ?? 0) > 0;
          const hasActive = tasks.some((task) => isAssetGenerateTaskActive(task, projectId, type));

          if (!hasTrackedIds && hasActive) {
            batchSeenActiveRef.current[type] = true;
          } else if (!hasTrackedIds && batchSeenActiveRef.current[type] && !hasActive) {
            // 无 id：见过活跃任务且已全部结束 → 收尾刷新
            batchSeenActiveRef.current[type] = false;
            delete batchWatchSinceRef.current[type];
            setBatchWatchByType((prev) => (prev[type] ? { ...prev, [type]: false } : prev));
            void handleRefresh();
          } else if (timedOut) {
            batchSeenActiveRef.current[type] = false;
            delete batchWatchSinceRef.current[type];
            setBatchWatchByType((prev) => (prev[type] ? { ...prev, [type]: false } : prev));
          }
        }
      }

      const trackedIds = batchTaskIdsByType[type] ?? [];
      if (trackedIds.length > 0) {
        const allSettled = trackedIds.every((taskId) => {
          const tracked = tasks.find((task) => task.task_id === taskId);
          return tracked != null && !EXTRACT_TASK_ACTIVE.has(tracked.status);
        });
        if (!allSettled) continue;
        setBatchTaskIdsByType((prev) =>
          (prev[type]?.length ?? 0) > 0 ? { ...prev, [type]: [] } : prev,
        );
        void handleRefresh();
      }
    }
  }, [batchTaskIdsByType, batchWatchByType, handleRefresh, projectId, submittingBatchType, tasks]);

  // 各类型提取任务终态：成功刷新资产列表，失败提示（切走 tab 后仍会处理）
  useEffect(() => {
    const entries = Object.entries(extractTaskIdByType) as [
      ExtractableAssetType,
      string | null | undefined,
    ][];

    for (const [type, taskId] of entries) {
      if (!taskId) continue;
      if (handledExtractTaskIdsRef.current.has(taskId)) continue;

      const task = tasks.find((item) => item.task_id === taskId);
      if (!task || EXTRACT_TASK_ACTIVE.has(task.status)) continue;

      handledExtractTaskIdsRef.current.add(taskId);
      setExtractTaskIdByType((prev) =>
        prev[type] === taskId ? { ...prev, [type]: null } : prev,
      );

      if (task.status === "succeeded") {
        void handleRefresh();
        useAppStore
          .getState()
          .pushToast(tRef.current("workspace_asset_extract_ready_toast"), "success");
        continue;
      }

      if (task.status === "failed" || task.status === "cancelled") {
        useAppStore.getState().pushToast(
          tRef.current("workspace_asset_extract_failed", {
            message:
              task.error_message?.trim() ||
              tRef.current("workspace_asset_extract_failed_fallback"),
          }),
          "error",
        );
      }
    }
  }, [extractTaskIdByType, handleRefresh, tasks]);

  const handleExtractAssets = useCallback(async () => {
    if (extractBusy) return;
    const label = WORKSPACE_V2_ASSET_SUB_NAV_LABELS[subNav];
    const extractType = assetType;
    setSubmittingExtractType(extractType);
    try {
      const result = await extractWorkspaceV2Assets(projectId, {
        asset_type: extractType,
      });
      if (!result.success) {
        useAppStore.getState().pushToast(result.message || "提取资产失败", "error");
        return;
      }

      const taskId = resolveWorkspaceV2ExtractAssetsTaskId(result);
      if (taskId) {
        if (
          isReusedAutoAssetsTaskId({
            taskId,
            extractType,
            tasks: useTasksStore.getState().tasks,
            extractTaskIdByType,
          })
        ) {
          useAppStore.getState().pushToast(
            tRef.current("workspace_asset_extract_reused_task", { label }),
            "warning",
          );
          return;
        }
        handledExtractTaskIdsRef.current.delete(taskId);
        upsertOptimisticAutoAssetsTask({
          taskId,
          projectName: projectId,
          assetType: extractType,
        });
        // 无论当前是否仍停留在该子 tab，都记到对应类型下
        setExtractTaskIdByType((prev) => ({ ...prev, [extractType]: taskId }));
        useAppStore
          .getState()
          .pushToast(
            result.message?.trim() || tRef.current("workspace_asset_extract_queued"),
            "info",
          );
        return;
      }

      const count = countWorkspaceV2ExtractedAssets(result, extractType);
      useAppStore.getState().pushToast(`成功提取 ${count} 个${label}`, "success");
      await handleRefresh();
    } catch (err) {
      useAppStore.getState().pushToast(errMsg(err), "error");
    } finally {
      setSubmittingExtractType((current) => (current === extractType ? null : current));
    }
  }, [assetType, extractBusy, extractTaskIdByType, handleRefresh, projectId, subNav]);

  const handleGenerateAll = useCallback(async () => {
    if (!project || generateAllBusy) return;
    const label = WORKSPACE_V2_ASSET_SUB_NAV_LABELS[subNav];
    const generateType = assetType;
    setSubmittingBatchType(generateType);
    try {
      const result =
        generateType === "character"
          ? await generateWorkspaceV2CharacterBatch(projectId)
          : generateType === "scene"
            ? await generateWorkspaceV2SceneBatch(projectId)
            : await generateWorkspaceV2PropBatch(projectId);

      if (result.success === false) {
        useAppStore.getState().pushToast(result.message || "批量生成失败", "error");
        return;
      }

      const taskIds = resolveWorkspaceV2BatchGenerateTaskIds(result);
      // 提交成功后进入短过渡：等单卡任务入队再收起整页 loading
      batchSeenActiveRef.current[generateType] = false;
      batchWatchSinceRef.current[generateType] = Date.now();
      setBatchWatchByType((prev) => ({ ...prev, [generateType]: true }));

      if (taskIds.length > 0) {
        for (const taskId of taskIds) {
          upsertOptimisticAssetBatchTask({
            taskId,
            projectName: projectId,
            taskType: generateType,
          });
        }
        setBatchTaskIdsByType((prev) => ({ ...prev, [generateType]: taskIds }));
      } else {
        setBatchTaskIdsByType((prev) => ({ ...prev, [generateType]: [] }));
      }

      useAppStore.getState().pushToast(
        result.message?.trim() || tRef.current("generate_all_started", { type: label }),
        "success",
      );

      // 立刻拉一次任务列表，用真实 resource_id 替换 batch 占位，尽快切到单卡「生成中」
      try {
        const tasksRes = await listWorkspaceV2Tasks(projectId);
        const previous = useTasksStore.getState().tasks;
        const merged = mergePolledTasks(tasksRes.items, previous);
        useTasksStore.getState().setTasks(merged);
        useTasksStore.getState().setStats(computeTaskStatsFromTasks(merged));
      } catch {
        // 忽略：仍可由常规轮询补齐
      }
    } catch (err) {
      useAppStore.getState().pushToast(errMsg(err), "error");
    } finally {
      setSubmittingBatchType((current) => (current === generateType ? null : current));
    }
  }, [assetType, generateAllBusy, project, projectId, subNav]);

  const handleAddCharacter = useCallback(
    async (name: string, description: string, voiceStyle: string, referenceFile?: File | null) => {
      try {
        await addWorkspaceV2Character(projectId, name, description, voiceStyle);
        if (referenceFile) {
          await uploadWorkspaceV2File(projectId, "character_ref", referenceFile, name);
        }
        await handleRefresh(
          referenceFile ? [buildEntityRevisionKey("character", name)] : [],
        );
        useAppStore.getState().pushToast(tRef.current("character_added_toast", { name }), "success");
      } catch (err) {
        useAppStore
          .getState()
          .pushToast(tRef.current("add_failed", { message: errMsg(err) }), "error");
        throw err;
      }
    },
    [handleRefresh, projectId],
  );

  const handleAddScene = useCallback(
    async (name: string, description: string) => {
      try {
        await addWorkspaceV2Scene(projectId, name, description);
        await handleRefresh();
        useAppStore.getState().pushToast(tRef.current("scene_added_toast", { name }), "success");
      } catch (err) {
        useAppStore
          .getState()
          .pushToast(tRef.current("add_failed", { message: errMsg(err) }), "error");
        throw err;
      }
    },
    [handleRefresh, projectId],
  );

  const handleAddProp = useCallback(
    async (name: string, description: string) => {
      try {
        await addWorkspaceV2Prop(projectId, name, description);
        await handleRefresh();
        useAppStore.getState().pushToast(tRef.current("prop_added_toast", { name }), "success");
      } catch (err) {
        useAppStore
          .getState()
          .pushToast(tRef.current("add_failed", { message: errMsg(err) }), "error");
        throw err;
      }
    },
    [handleRefresh, projectId],
  );

  const fileApi = useMemo(
    () => ({
      getFileUrl: getWorkspaceV2FileUrl,
      uploadFile: (
        pid: string,
        uploadType: string,
        file: File,
        name: string | null,
      ) => uploadWorkspaceV2File(pid, uploadType, file, name),
    }),
    [],
  );

  if (!project) {
    return null;
  }

  const sharedToolbarProps = {
    onExtractAssets: handleExtractAssets,
    extractingAssets: extractBusy,
    generatingAllAssets: generateAllBusy,
    onGenerateAllOverride: handleGenerateAll,
    onRefreshProject: handleRefresh,
  };

  const content = (() => {
    switch (subNav) {
      case "characters":
        return (
          <CharactersPage
            projectName={projectId}
            characters={characters}
            generatingCharacterNames={generatingNames}
            {...sharedToolbarProps}
            onSaveCharacter={async (name, payload) => {
              try {
                await updateWorkspaceV2Character(projectId, name, {
                  description: payload.description,
                  voice_style: payload.voiceStyle,
                  ...(payload.promptTemplate
                    ? { prompt_template: payload.promptTemplate }
                    : { prompt_template: {} }),
                });
                if (payload.referenceFile) {
                  await uploadWorkspaceV2File(projectId, "character_ref", payload.referenceFile, name);
                }
                await handleRefresh(
                  payload.referenceFile
                    ? [buildEntityRevisionKey("character", name)]
                    : [],
                );
                useAppStore
                  .getState()
                  .pushToast(tRef.current("character_updated_toast", { name }), "success");
              } catch (err) {
                useAppStore
                  .getState()
                  .pushToast(tRef.current("update_character_failed", { message: errMsg(err) }), "error");
              }
            }}
            onGenerateCharacter={async (name, context) => {
              try {
                const res = await generateWorkspaceV2Character(
                  projectId,
                  name,
                  context?.description ?? characters[name]?.description ?? "",
                );
                upsertOptimisticAssetTask({
                  taskId: res.task_id,
                  projectName: projectId,
                  taskType: "character",
                  resourceId: name,
                });
                useAppStore
                  .getState()
                  .pushToast(tRef.current("character_task_submitted_toast", { name }), "success");
              } catch (err) {
                useAppStore.getState().pushToast(tRef.current("submit_failed", { message: errMsg(err) }), "error");
                throw err;
              }
            }}
            onAddCharacter={handleAddCharacter}
            onRestoreCharacterVersion={handleRefresh}
          />
        );
      case "scenes":
        return (
          <ScenesPage
            projectName={projectId}
            scenes={scenes}
            generatingSceneNames={generatingNames}
            {...sharedToolbarProps}
            onUpdateScene={async (name, updates) => {
              try {
                await updateWorkspaceV2Scene(projectId, name, updates);
                await handleRefresh();
              } catch (err) {
                useAppStore
                  .getState()
                  .pushToast(tRef.current("update_scene_failed", { message: errMsg(err) }), "error");
              }
            }}
            onGenerateScene={async (name, context) => {
              try {
                const res = await generateWorkspaceV2Scene(
                  projectId,
                  name,
                  context?.description ?? scenes[name]?.description ?? "",
                );
                upsertOptimisticAssetTask({
                  taskId: res.task_id,
                  projectName: projectId,
                  taskType: "scene",
                  resourceId: name,
                });
                useAppStore
                  .getState()
                  .pushToast(tRef.current("scene_task_submitted_toast", { name }), "success");
              } catch (err) {
                useAppStore.getState().pushToast(tRef.current("submit_failed", { message: errMsg(err) }), "error");
                throw err;
              }
            }}
            onAddScene={handleAddScene}
            onRestoreSceneVersion={handleRefresh}
          />
        );
      case "props":
        return (
          <PropsPage
            projectName={projectId}
            props={props}
            generatingPropNames={generatingNames}
            {...sharedToolbarProps}
            onUpdateProp={async (name, updates) => {
              try {
                await updateWorkspaceV2Prop(projectId, name, updates);
                await handleRefresh();
              } catch (err) {
                useAppStore
                  .getState()
                  .pushToast(tRef.current("update_prop_failed", { message: errMsg(err) }), "error");
              }
            }}
            onGenerateProp={async (name, context) => {
              try {
                const res = await generateWorkspaceV2Prop(
                  projectId,
                  name,
                  context?.description ?? props[name]?.description ?? "",
                );
                upsertOptimisticAssetTask({
                  taskId: res.task_id,
                  projectName: projectId,
                  taskType: "prop",
                  resourceId: name,
                });
                useAppStore
                  .getState()
                  .pushToast(tRef.current("prop_task_submitted_toast", { name }), "success");
              } catch (err) {
                useAppStore.getState().pushToast(tRef.current("submit_failed", { message: errMsg(err) }), "error");
                throw err;
              }
            }}
            onAddProp={handleAddProp}
            onRestorePropVersion={handleRefresh}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <ProjectAssetFilesProvider value={fileApi}>
      <div className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden", className)}>
        {content}
      </div>

      {addingAsset ? (
        <AssetFormModal
          key={subNav}
          type={ASSET_TYPE_BY_SUB_NAV[subNav]}
          typeLocked
          mode="create"
          onClose={() => onAddingAssetChange?.(false)}
          onSubmit={async ({ name, description, voice_style, image }) => {
            if (subNav === "characters") {
              await handleAddCharacter(name, description, voice_style, image ?? null);
            } else if (subNav === "scenes") {
              await handleAddScene(name, description);
            } else {
              await handleAddProp(name, description);
            }
            onAddingAssetChange?.(false);
          }}
        />
      ) : null}
    </ProjectAssetFilesProvider>
  );
}
