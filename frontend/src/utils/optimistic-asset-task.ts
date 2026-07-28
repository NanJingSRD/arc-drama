import { useTasksStore } from "@/stores/tasks-store";
import type { TaskItem } from "@/types";

type AssetTaskType = "character" | "scene" | "prop";

function upsertOptimisticTask(task: TaskItem): void {
  useTasksStore.getState().upsertTask(task);
}

/** 资产设计图生成任务提交后立刻写入队列，避免 3s 轮询间隙内按钮无 loading。 */
export function upsertOptimisticAssetTask({
  taskId,
  projectName,
  taskType,
  resourceId,
}: {
  taskId: string;
  projectName: string;
  taskType: AssetTaskType;
  resourceId: string;
}): void {
  const now = new Date().toISOString();
  upsertOptimisticTask({
    task_id: taskId,
    project_name: projectName,
    task_type: taskType,
    media_type: "image",
    resource_id: resourceId,
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
  });
}

/** 剧本 process 异步入队后立刻写入，避免轮询间隙内「生成剧本」可再点 / 空表闪现。 */
export function upsertOptimisticScriptProcessTask({
  taskId,
  projectName,
  resourceId,
}: {
  taskId: string;
  projectName: string;
  /** 默认 projectName；新增剧集等场景可传 script_process_{n} */
  resourceId?: string;
}): void {
  const now = new Date().toISOString();
  upsertOptimisticTask({
    task_id: taskId,
    project_name: projectName,
    task_type: "script_process",
    media_type: "text",
    resource_id: resourceId?.trim() || projectName,
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
  });
}

/** 提取资产（auto-assets/generate）异步入队后立刻写入，避免轮询间隙内按钮可再点。 */
export function upsertOptimisticAutoAssetsTask({
  taskId,
  projectName,
  assetType,
}: {
  taskId: string;
  projectName: string;
  assetType: "character" | "scene" | "prop" | "all";
}): void {
  const now = new Date().toISOString();
  upsertOptimisticTask({
    task_id: taskId,
    project_name: projectName,
    task_type: "auto_assets",
    media_type: "image",
    resource_id: assetType,
    script_file: null,
    payload: { asset_type: assetType },
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
  });
}

/** 分镜配置 generate-config 入队后立刻写入，避免轮询间隙内按钮可再点。 */
export function upsertOptimisticEpisodeConfigTask({
  taskId,
  projectName,
}: {
  taskId: string;
  projectName: string;
}): void {
  const now = new Date().toISOString();
  upsertOptimisticTask({
    task_id: taskId,
    project_name: projectName,
    task_type: "episode_config",
    media_type: "image",
    resource_id: projectName,
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
  });
}

/** 单镜分镜图 / 分镜视频入队后立刻写入，避免轮询间隙内按钮可再点。 */
export function upsertOptimisticShotMediaTask({
  taskId,
  projectName,
  taskType,
  resourceId,
  scriptFile,
}: {
  taskId: string;
  projectName: string;
  taskType: "storyboard" | "video";
  resourceId: string;
  scriptFile?: string | null;
}): void {
  const now = new Date().toISOString();
  upsertOptimisticTask({
    task_id: taskId,
    project_name: projectName,
    task_type: taskType,
    media_type: taskType === "video" ? "video" : "image",
    resource_id: resourceId,
    script_file: scriptFile ?? null,
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
  });
}

/** 批量生成设计图入队后立刻写入（payload.batch 用于与单卡任务区分）。 */
export function upsertOptimisticAssetBatchTask({
  taskId,
  projectName,
  taskType,
}: {
  taskId: string;
  projectName: string;
  taskType: AssetTaskType;
}): void {
  const now = new Date().toISOString();
  upsertOptimisticTask({
    task_id: taskId,
    project_name: projectName,
    task_type: taskType,
    media_type: "image",
    resource_id: `__batch__:${taskType}`,
    script_file: null,
    payload: { batch: true },
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
  });
}
