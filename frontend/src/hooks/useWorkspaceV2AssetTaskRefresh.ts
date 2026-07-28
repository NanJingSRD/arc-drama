import { useEffect, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import type { TaskStatus } from "@/types";
import { buildEntityRevisionKey } from "@/utils/project-changes";

/** 资产库 / 资产生成相关任务 */
export const WORKSPACE_V2_ASSET_TASK_REFRESH_TYPES = [
  "character",
  "scene",
  "prop",
  "auto_assets",
] as const;

/**
 * 项目详情页用于同步顶部工作流节点：资产任务 + 视频任务。
 * 视频成功后需重拉详情，以便后端推进 progress（如开放「已完成」）。
 */
export const WORKSPACE_V2_PROJECT_DETAIL_TASK_REFRESH_TYPES = [
  ...WORKSPACE_V2_ASSET_TASK_REFRESH_TYPES,
  "video",
] as const;

function entityTypeForTask(
  taskType: string,
): "character" | "scene" | "prop" | null {
  if (taskType === "character") return "character";
  if (taskType === "scene") return "scene";
  if (taskType === "prop") return "prop";
  return null;
}

/**
 * 指定类型任务 succeeded 后触发刷新。
 * 默认监听资产任务；页面级传入含 video 的类型列表以同步工作流节点。
 */
export function useWorkspaceV2AssetTaskRefresh(
  projectId?: string | null,
  onRefresh?: () => void | Promise<unknown>,
  taskTypes: readonly string[] = WORKSPACE_V2_ASSET_TASK_REFRESH_TYPES,
): void {
  const tasks = useTasksStore((s) => s.tasks);
  const connected = useTasksStore((s) => s.connected);
  const prevStatusRef = useRef<Map<string, TaskStatus>>(new Map());
  const seededRef = useRef(false);
  const taskTypesKey = taskTypes.join("\0");

  useEffect(() => {
    prevStatusRef.current = new Map();
    seededRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !onRefresh || !connected) return;

    const taskTypeSet = new Set(taskTypesKey.split("\0").filter(Boolean));
    const prev = prevStatusRef.current;
    const next = new Map<string, TaskStatus>();
    let shouldRefresh = false;
    const invalidationKeys: string[] = [];

    for (const task of tasks) {
      if (task.project_name !== projectId) continue;
      if (!taskTypeSet.has(task.task_type)) continue;

      const before = prev.get(task.task_id);
      next.set(task.task_id, task.status);

      if (!seededRef.current) continue;

      if (task.status === "succeeded" && before !== "succeeded") {
        shouldRefresh = true;
        const entityType = entityTypeForTask(task.task_type);
        if (entityType) {
          invalidationKeys.push(
            buildEntityRevisionKey(entityType, task.resource_id),
          );
        }
      }
    }

    prevStatusRef.current = next;

    if (!seededRef.current) {
      seededRef.current = true;
      return;
    }

    if (!shouldRefresh) return;

    void (async () => {
      await Promise.resolve(onRefresh());
      if (invalidationKeys.length > 0) {
        useAppStore.getState().invalidateEntities(invalidationKeys);
      }
    })();
  }, [tasks, connected, projectId, onRefresh, taskTypesKey]);
}
