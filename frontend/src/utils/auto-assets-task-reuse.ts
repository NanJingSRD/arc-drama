import type { TaskItem, TaskStatus } from "@/types";

const ACTIVE_STATUSES = new Set<TaskStatus>(["queued", "running", "cancelling"]);

type ExtractableAssetType = "character" | "scene" | "prop";

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

/**
 * 服务端对多次 auto-assets/generate 可能返回同一个 task_id。
 * 若该 id 已占用在其他资产类型、或已是终态/进行中的不同类型任务，则视为未新建任务。
 */
export function isReusedAutoAssetsTaskId({
  taskId,
  extractType,
  tasks,
  extractTaskIdByType,
}: {
  taskId: string;
  extractType: ExtractableAssetType;
  tasks: TaskItem[];
  extractTaskIdByType: Partial<Record<ExtractableAssetType, string | null>>;
}): boolean {
  for (const [type, id] of Object.entries(extractTaskIdByType) as [
    ExtractableAssetType,
    string | null | undefined,
  ][]) {
    if (id === taskId && type !== extractType) return true;
  }

  const existing = tasks.find((task) => task.task_id === taskId);
  if (!existing || existing.task_type !== "auto_assets") return false;

  if (
    ACTIVE_STATUSES.has(existing.status) &&
    isExtractTaskForAssetType(existing, extractType)
  ) {
    // 同类型进行中任务再次返回同一 id：视为幂等，不算「复用冲突」
    return false;
  }

  // 终态，或进行中但类型对不上 / 看不出类型
  return true;
}
