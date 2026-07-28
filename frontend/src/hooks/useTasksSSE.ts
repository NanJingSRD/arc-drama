import { useEffect, useRef } from "react";
import { API } from "@/api";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useTasksStore } from "@/stores/tasks-store";
import { isAuthExpiredError, isAuthSessionExpired } from "@/utils/auth-session";
import { voidCall } from "@/utils/async";

const POLL_INTERVAL_MS = 3000;

/**
 * 轮询任务队列状态的 Hook。
 * 挂载时立即拉取一次，之后每 3 秒轮询，卸载时清理。
 * 后台标签页暂停轮询；认证过期后停止，避免无效请求堆积。
 */
export function useTasksSSE(projectName?: string | null): void {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageVisible = usePageVisibility();
  const { setTasks, setStats, setConnected } = useTasksStore();

  useEffect(() => {
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
        const [tasksRes, statsRes] = await Promise.all([
          API.listTasks({
            projectName: projectName ?? undefined,
            pageSize: 200,
          }),
          API.getTaskStats(projectName ?? null),
        ]);
        if (disposed) return;
        setTasks(tasksRes.items);
        setStats(statsRes.stats);
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
  }, [pageVisible, projectName, setTasks, setStats, setConnected]);
}
