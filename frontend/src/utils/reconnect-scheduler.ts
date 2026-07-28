const INITIAL_DELAY_MS = 3000;
const MAX_DELAY_MS = 60_000;
const MAX_ATTEMPTS = 20;

export interface ReconnectScheduler {
  schedule: (callback: () => void) => void;
  reset: () => void;
  cancel: () => void;
}

/** SSE 重连调度：先清旧 timer 再预约，指数退避，上限 20 次。 */
export function createReconnectScheduler(): ReconnectScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;

  function cancel(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function reset(): void {
    attempt = 0;
    cancel();
  }

  function schedule(callback: () => void): void {
    cancel();
    if (attempt >= MAX_ATTEMPTS) return;

    const delay = Math.min(INITIAL_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
    attempt += 1;

    timer = setTimeout(() => {
      timer = null;
      callback();
    }, delay);
  }

  return { schedule, reset, cancel };
}
