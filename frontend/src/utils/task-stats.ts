import type { TaskItem, TaskStats } from "@/types";

export function computeTaskStatsFromTasks(tasks: TaskItem[]): TaskStats {
  const stats: TaskStats = {
    queued: 0,
    running: 0,
    cancelling: 0,
    succeeded: 0,
    failed: 0,
    cancelled: 0,
    total: tasks.length,
  };

  for (const task of tasks) {
    stats[task.status] += 1;
  }

  return stats;
}
