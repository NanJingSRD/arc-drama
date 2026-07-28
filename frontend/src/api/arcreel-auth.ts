import { WORKSPACE_V2_API_BASE } from "@/utils/app-base";
import { normalizeAccessToken } from "@/utils/access-token";

/** 鉴权接口 — 工作空间 2.0 后端（/api/ws2/v1 → 1242） */
const AUTH_BASE = `${WORKSPACE_V2_API_BASE}/auth`;

/** 校验 access token 是否被后端接受。 */
export async function verifyArcReelAccessToken(token: string): Promise<boolean> {
  const safe = normalizeAccessToken(token);
  if (!safe) return false;
  const res = await fetch(`${AUTH_BASE}/verify`, {
    headers: { Authorization: `Bearer ${safe}` },
  });
  return res.ok;
}

/** POST /auth/token — OAuth2 密码模式登录 */
export async function loginForAccessToken(
  params: { username: string; password: string },
  options?: { acceptLanguage?: string },
): Promise<Response> {
  const body = new URLSearchParams({
    username: params.username,
    password: params.password,
    grant_type: "password",
  });
  const headers: HeadersInit = {};
  if (options?.acceptLanguage) {
    headers["Accept-Language"] = options.acceptLanguage;
  }
  return fetch(`${AUTH_BASE}/token`, {
    method: "POST",
    headers,
    body,
  });
}

/** GET /auth/status — 探测服务端是否启用免登录（微信环境） */
export async function fetchAuthStatus(signal?: AbortSignal): Promise<Response> {
  return fetch(`${AUTH_BASE}/status`, { signal });
}
