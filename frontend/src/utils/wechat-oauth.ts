import { getAppBase } from "@/utils/app-base";

/**
 * 微信扫码登录：跳转 URL 由后端 `GET /auth/wechat/login` 返回；state 与弹窗标记须用 localStorage
 * （`window.open` 子窗与父窗 sessionStorage 相互隔离）。
 */

export const WECHAT_OAUTH_STATE_KEY = "srd_wx_oauth_state";
export const WECHAT_OAUTH_POPUP_FLOW_KEY = "srd_wx_oauth_popup_flow";
export const WECHAT_OAUTH_FULLPAGE_FLOW_KEY = "srd_wx_oauth_fullpage_flow";
export const WECHAT_OAUTH_RETURN_TO_KEY = "srd_wx_oauth_return_to";

export const WECHAT_AUTH_MESSAGE_TYPE = "SRD_WECHAT_AUTH_SUCCESS" as const;
export const WECHAT_AUTH_BC_NAME = "srd_wechat_auth_bc_v1";
export const WECHAT_AUTH_STORAGE_KEY = "srd_wechat_auth_result";
export const WECHAT_AUTH_ERR_BROADCAST_KEY = "srd_wechat_auth_popup_err";

export interface WeChatAuthResult {
  token: string;
  username?: string;
  avatarUrl?: string;
}

export type WeChatAuthBridgeMessage =
  | { type: typeof WECHAT_AUTH_MESSAGE_TYPE; ok: true; result: WeChatAuthResult; nonce?: string }
  | { type: typeof WECHAT_AUTH_MESSAGE_TYPE; ok: false; message: string; nonce?: string };

/** 微信 OAuth 完成后应回到的前端回调页（含 Vite base，如 /aigc/login/wechat-callback）。 */
export function getWeChatOAuthCallbackUrl(origin = window.location.origin): string {
  const base = getAppBase();
  return `${origin}${base}/login/wechat-callback`;
}

/** 从微信 qrconnect URL 解析 redirect_uri 的 origin。 */
export function getWeChatRedirectUriOrigin(loginUrl: string): string | null {
  try {
    const encoded = new URL(loginUrl).searchParams.get("redirect_uri")?.trim();
    if (!encoded) return null;
    return new URL(decodeURIComponent(encoded)).origin;
  } catch {
    return null;
  }
}

/**
 * 将后端返回的微信登录 URL 中的 redirect_uri 改为当前站点的前端回调页。
 * 后端默认指向 `/nexus/api/auth/wechat/callback`，弹窗无法把登录态交回主窗口。
 */
export function rewriteWeChatLoginRedirectUri(loginUrl: string): string {
  const url = new URL(loginUrl);
  url.searchParams.set("redirect_uri", getWeChatOAuthCallbackUrl());
  return url.toString();
}

/** 将 state 写入 localStorage，供回调页与微信回跳比对。 */
export function syncWeChatOAuthStateFromLoginUrl(loginUrl: string, clientState: string): void {
  try {
    const fromUrl = new URL(loginUrl).searchParams.get("state")?.trim();
    localStorage.setItem(WECHAT_OAUTH_STATE_KEY, fromUrl || clientState);
  } catch {
    localStorage.setItem(WECHAT_OAUTH_STATE_KEY, clientState);
  }
}

export function isWeChatOAuthStateValid(state: string | null, savedState: string | null): boolean {
  if (state && savedState && state === savedState) return true;
  return import.meta.env.DEV && state === "STATE";
}

function clearWeChatOAuthPopupFlowFlag(): void {
  try {
    localStorage.removeItem(WECHAT_OAUTH_POPUP_FLOW_KEY);
  } catch {
    /* ignore */
  }
}

/** 整页跳转微信授权前保存回跳路径（弹窗被拦截时的 fallback）。 */
export function saveWeChatOAuthFullPageFlow(returnTo?: string | null): void {
  try {
    localStorage.setItem(WECHAT_OAUTH_FULLPAGE_FLOW_KEY, "1");
    if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
      localStorage.setItem(WECHAT_OAUTH_RETURN_TO_KEY, returnTo);
    } else {
      localStorage.removeItem(WECHAT_OAUTH_RETURN_TO_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearWeChatOAuthFullPageFlow(): void {
  try {
    localStorage.removeItem(WECHAT_OAUTH_FULLPAGE_FLOW_KEY);
  } catch {
    /* ignore */
  }
}

export function consumeWeChatOAuthReturnTo(): string | null {
  try {
    const raw = localStorage.getItem(WECHAT_OAUTH_RETURN_TO_KEY);
    localStorage.removeItem(WECHAT_OAUTH_RETURN_TO_KEY);
    if (raw?.startsWith("/") && !raw.startsWith("//")) return raw;
    return null;
  } catch {
    return null;
  }
}

function broadcastWeChatAuthMessage(
  payload: { ok: true; result: WeChatAuthResult } | { ok: false; message: string },
  nonce: string,
): void {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const msg: WeChatAuthBridgeMessage =
      payload.ok === true
        ? { type: WECHAT_AUTH_MESSAGE_TYPE, ok: true, result: payload.result, nonce }
        : { type: WECHAT_AUTH_MESSAGE_TYPE, ok: false, message: payload.message, nonce };
    const channel = new BroadcastChannel(WECHAT_AUTH_BC_NAME);
    channel.postMessage(msg);
    channel.close();
  } catch {
    /* ignore */
  }
}

function tryNotifyOpener(
  payload: { ok: true; result: WeChatAuthResult } | { ok: false; message: string },
  nonce: string,
): boolean {
  try {
    const opener = window.opener as Window | null;
    if (!opener || opener === window) return false;
    if (opener.closed) return false;

    const msg: WeChatAuthBridgeMessage =
      payload.ok === true
        ? { type: WECHAT_AUTH_MESSAGE_TYPE, ok: true, result: payload.result, nonce }
        : { type: WECHAT_AUTH_MESSAGE_TYPE, ok: false, message: payload.message, nonce };

    try {
      opener.focus();
    } catch {
      /* ignore */
    }
    opener.postMessage(msg, window.location.origin);
    window.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * 回调页：优先 postMessage 通知 opener；失败且为弹窗流程时写 localStorage 广播并 close。
 * 返回 true 表示已交给主窗口处理，调用方勿再 navigate 本窗口。
 */
export function notifyWeChatAuthOpenerOrBroadcast(
  payload: { ok: true; result: WeChatAuthResult } | { ok: false; message: string },
): boolean {
  const nonce = crypto.randomUUID();
  broadcastWeChatAuthMessage(payload, nonce);

  if (tryNotifyOpener(payload, nonce)) {
    clearWeChatOAuthPopupFlowFlag();
    return true;
  }

  try {
    if (localStorage.getItem(WECHAT_OAUTH_POPUP_FLOW_KEY) !== "1") return false;
    clearWeChatOAuthPopupFlowFlag();

    if (payload.ok === true) {
      localStorage.setItem(WECHAT_AUTH_STORAGE_KEY, JSON.stringify(payload.result));
    } else {
      localStorage.setItem(
        WECHAT_AUTH_ERR_BROADCAST_KEY,
        JSON.stringify({ message: payload.message, nonce }),
      );
    }
    window.close();
    return true;
  } catch {
    return false;
  }
}

export function publishWeChatAuthResult(result: WeChatAuthResult): void {
  localStorage.setItem(WECHAT_AUTH_STORAGE_KEY, JSON.stringify(result));
  notifyWeChatAuthOpenerOrBroadcast({ ok: true, result });
}

export function readWeChatAuthStorageResult(): WeChatAuthResult | null {
  try {
    const raw = localStorage.getItem(WECHAT_AUTH_STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(WECHAT_AUTH_STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const token = (parsed as { token?: unknown }).token;
    if (typeof token !== "string" || !token) return null;
    return parsed as WeChatAuthResult;
  } catch {
    return null;
  }
}

export function readWeChatAuthErrorBroadcast(): string | null {
  try {
    const raw = localStorage.getItem(WECHAT_AUTH_ERR_BROADCAST_KEY);
    if (!raw) return null;
    localStorage.removeItem(WECHAT_AUTH_ERR_BROADCAST_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      const message = (parsed as { message?: unknown }).message;
      if (typeof message === "string" && message) return message;
    }
    return raw;
  } catch {
    return null;
  }
}

export function parseWeChatAuthBridgeMessage(data: unknown): WeChatAuthBridgeMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as WeChatAuthBridgeMessage;
  if (record.type !== WECHAT_AUTH_MESSAGE_TYPE) return null;
  if (record.ok === true) {
    const token = record.result?.token;
    if (typeof token !== "string" || !token) return null;
    return record;
  }
  if (record.ok === false && typeof record.message === "string" && record.message) {
    return record;
  }
  return null;
}
