import type { TaskItem, TaskStatus } from "@/types";

const ACTIVE_STATUSES = new Set<TaskStatus>(["queued", "running", "cancelling"]);

/** 乐观入队后、服务端列表尚未出现时的保留窗口 */
export const OPTIMISTIC_TASK_POLL_GRACE_MS = 12_000;

/**
 * 轮询整表覆盖时，短暂保留尚未出现在服务端列表中的本地乐观进行中任务，
 * 避免连点多个 auto_assets / 生成任务时被中间一次 poll 冲掉。
 */
export function mergePolledTasks(
  serverItems: TaskItem[],
  previousItems: TaskItem[],
  nowMs: number = Date.now(),
  graceMs: number = OPTIMISTIC_TASK_POLL_GRACE_MS,
): TaskItem[] {
  if (previousItems.length === 0) return serverItems;

  const serverIds = new Set(serverItems.map((task) => task.task_id));
  const extras: TaskItem[] = [];

  for (const local of previousItems) {
    if (serverIds.has(local.task_id)) continue;
    if (!ACTIVE_STATUSES.has(local.status)) continue;
    if (local.source !== "webui") continue;

    const queuedAt = local.queued_at ? Date.parse(local.queued_at) : Number.NaN;
    if (!Number.isFinite(queuedAt) || nowMs - queuedAt > graceMs) continue;
    extras.push(local);
  }

  return extras.length > 0 ? [...extras, ...serverItems] : serverItems;
}
