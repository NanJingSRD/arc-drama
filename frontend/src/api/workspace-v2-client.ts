import { WORKSPACE_V2_API_BASE, getAppBase, isAppPath } from "@/utils/app-base";
import { getToken, normalizeAccessToken } from "@/utils/auth";
import { AUTH_EXPIRED_MESSAGE, markAuthSessionExpired } from "@/utils/auth-session";
import { isWorkspaceAppPath, WORKSPACE_REQUIRES_WECHAT_AUTH } from "@/utils/workspace-auth";
import i18n from "@/i18n";

function handleWorkspaceV2Unauthorized(response: Response): void {
  if (response.status !== 401) return;

  markAuthSessionExpired();
  const pathname = globalThis.location?.pathname ?? "";
  const search = globalThis.location?.search ?? "";
  const hash = globalThis.location?.hash ?? "";
  const current = pathname
    ? `${pathname}${search}${hash}`
    : (globalThis.location?.href ?? "");
  const base = getAppBase();

  if (!WORKSPACE_REQUIRES_WECHAT_AUTH && isWorkspaceAppPath(pathname)) {
    throw new Error(AUTH_EXPIRED_MESSAGE);
  }
  if (isAppPath(pathname)) {
    const from = encodeURIComponent(current);
    globalThis.location.href = `${base}/app/home?wechat=1&from=${from}`;
  } else {
    globalThis.location.href = `${base}/app/home?wechat=1`;
  }
  throw new Error(AUTH_EXPIRED_MESSAGE);
}

export function withWorkspaceV2Auth(options: RequestInit = {}): RequestInit {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const lang = (i18n.language || "zh").split("-")[0] || "zh";
  headers.set("Accept-Language", lang);
  if (token) {
    const safe = normalizeAccessToken(token);
    if (safe) {
      headers.set("Authorization", `Bearer ${safe}`);
    }
  }
  return { ...options, headers };
}

function parseWorkspaceV2Error(
  detail: string | { msg?: string }[] | undefined,
  fallback: string,
): string {
  if (typeof detail === "string") {
    return detail || fallback;
  }
  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).filter(Boolean).join("; ") || fallback;
  }
  return fallback;
}

/** 工作空间 2.0 统一 JSON 请求（`/api/ws2/v1` → 1242）。 */
export async function requestWorkspaceV2<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${WORKSPACE_V2_API_BASE}${endpoint}`, withWorkspaceV2Auth(options));

  if (!response.ok) {
    handleWorkspaceV2Unauthorized(response);
    const error = (await response.json().catch(() => ({
      detail: response.statusText,
    }))) as { detail?: string | { msg?: string }[] };
    throw new Error(parseWorkspaceV2Error(error.detail, response.statusText || "请求失败"));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function throwIfWorkspaceV2NotOk(
  response: Response,
  fallbackMsg: string,
): Promise<void> {
  if (!response.ok) {
    handleWorkspaceV2Unauthorized(response);
    const error = (await response.json().catch(() => ({
      detail: response.statusText,
    }))) as { detail?: string | { msg?: string }[] };
    throw new Error(parseWorkspaceV2Error(error.detail, fallbackMsg));
  }
}
