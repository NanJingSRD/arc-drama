import { useTasksStore } from "@/stores/tasks-store";
import type { TaskItem } from "@/types";

/** 工作空间 2.0：分镜配置入队乐观任务（可带 episode，便于按集匹配）。 */
export function upsertWorkspaceV2EpisodeConfigTask({
  taskId,
  projectName,
  episode,
  resourceId,
}: {
  taskId: string;
  projectName: string;
  episode?: number;
  /** 覆盖默认 resource_id（如 episode_1_storyboard_add） */
  resourceId?: string;
}): void {
  const now = new Date().toISOString();
  const resolvedResourceId =
    resourceId?.trim() ||
    (episode != null ? String(episode) : projectName);
  const task: TaskItem = {
    task_id: taskId,
    project_name: projectName,
    task_type: "episode_config",
    media_type: "image",
    resource_id: resolvedResourceId,
    script_file: null,
    payload: episode != null ? { episode } : {},
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
  };
  useTasksStore.getState().upsertTask(task);
}
