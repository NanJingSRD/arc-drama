import {
  parseWeChatAuthBridgeMessage,
  readWeChatAuthErrorBroadcast,
  readWeChatAuthStorageResult,
  WECHAT_AUTH_BC_NAME,
  WECHAT_AUTH_MESSAGE_TYPE,
  type WeChatAuthResult,
} from "@/utils/wechat-oauth";

export type { WeChatAuthResult } from "@/utils/wechat-oauth";
export { publishWeChatAuthResult } from "@/utils/wechat-oauth";

function normalizeResult(result: WeChatAuthResult): WeChatAuthResult {
  return {
    token: result.token,
    username: typeof result.username === "string" ? result.username : "微信用户",
    avatarUrl:
      typeof result.avatarUrl === "string" && result.avatarUrl.length > 0
        ? result.avatarUrl
        : undefined,
  };
}

/** 等待已打开的微信 OAuth 弹窗回传登录结果（BroadcastChannel / postMessage / localStorage）。 */
export function waitForWeChatAuthPopupResult(popup: Window): Promise<WeChatAuthResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: WeChatAuthResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      resolve(normalizeResult(result));
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    const handleBridgeMessage = (data: unknown) => {
      const message = parseWeChatAuthBridgeMessage(data);
      if (!message) return;
      if (message.ok) {
        finish(message.result);
        return;
      }
      fail(message.message);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (
        typeof event.data !== "object" ||
        event.data === null ||
        (event.data as { type?: unknown }).type !== WECHAT_AUTH_MESSAGE_TYPE
      ) {
        return;
      }
      handleBridgeMessage(event.data);
    };

    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(WECHAT_AUTH_BC_NAME) : null;
    if (channel) {
      channel.onmessage = (event: MessageEvent) => handleBridgeMessage(event.data);
    }

    const poll = window.setInterval(() => {
      const stored = readWeChatAuthStorageResult();
      if (stored) {
        finish(stored);
        return;
      }

      const err = readWeChatAuthErrorBroadcast();
      if (err) {
        fail(err);
        return;
      }

      if (popup.closed) {
        if (closeTimer) return;
        closeTimer = window.setTimeout(() => {
          const late = readWeChatAuthStorageResult();
          if (late) {
            finish(late);
            return;
          }
          const lateErr = readWeChatAuthErrorBroadcast();
          if (lateErr) {
            fail(lateErr);
            return;
          }
          if (!settled) fail("授权窗口已关闭");
        }, 800);
      }
    }, 400);

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(poll);
      if (closeTimer) window.clearTimeout(closeTimer);
      channel?.close();
    };

    window.addEventListener("message", onMessage);
  });
}

/** @deprecated 请先用 about:blank 打开弹窗，再调用 {@link waitForWeChatAuthPopupResult}。 */
export function openWeChatAuthPopup(authUrl: string): Promise<WeChatAuthResult> {
  const popup = window.open(
    authUrl,
    `srd_wechat_oauth_${crypto.randomUUID()}`,
    "width=520,height=720,menubar=no,toolbar=no,location=no,status=no",
  );

  if (!popup) {
    return Promise.reject(new Error("无法打开授权窗口，请检查浏览器是否拦截弹窗"));
  }

  return waitForWeChatAuthPopupResult(popup);
}
