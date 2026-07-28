import { useEffect, useRef } from "react";
import { listWorkspaceV2Tasks } from "@/api/workspace-v2";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useTasksStore } from "@/stores/tasks-store";
import { isAuthExpiredError, isAuthSessionExpired } from "@/utils/auth-session";
import { voidCall } from "@/utils/async";
import { mergePolledTasks } from "@/utils/merge-polled-tasks";
import { computeTaskStatsFromTasks } from "@/utils/task-stats";

const POLL_INTERVAL_MS = 3000;

/** 工作空间 2.0 任务队列轮询（仅拉 tasks 列表，stats 由本地聚合）。 */
export function useWorkspaceV2Tasks(projectId?: string | null): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageVisible = usePageVisibility();
  const { setTasks, setStats, setConnected } = useTasksStore();

  useEffect(() => {
    if (!projectId) return;

    let disposed = false;

    function stopPolling(): void {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function startPolling(): void {
      stopPolling();
      if (disposed || !pageVisible || isAuthSessionExpired()) return;
      timerRef.current = setInterval(() => {
        if (!disposed) voidCall(poll());
      }, POLL_INTERVAL_MS);
    }

    async function poll() {
      if (disposed || !pageVisible || isAuthSessionExpired()) return;

      try {
        const tasksRes = await listWorkspaceV2Tasks(projectId!);
        if (disposed) return;
        const previous = useTasksStore.getState().tasks;
        const merged = mergePolledTasks(tasksRes.items, previous);
        setTasks(merged);
        setStats(computeTaskStatsFromTasks(merged));
        setConnected(true);
      } catch (err) {
        if (disposed) return;
        setConnected(false);
        if (isAuthExpiredError(err) || isAuthSessionExpired()) {
          disposed = true;
          stopPolling();
        }
      }
    }

    voidCall(poll());
    startPolling();

    return () => {
      disposed = true;
      stopPolling();
      setConnected(false);
    };
  }, [pageVisible, projectId, setConnected, setStats, setTasks]);
}
