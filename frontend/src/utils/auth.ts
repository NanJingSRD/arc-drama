import { normalizeAccessToken } from "@/utils/access-token";

const TOKEN_KEY = "arcreel_auth_token";
const USER_PROFILE_KEY = "arcreel_auth_user";
/** 用户主动退出后，同 tab 刷新不再因 /auth/status enabled=false 自动视为已登录 */
const EXPLICIT_LOGOUT_KEY = "srd_auth_explicit_logout";

export { TOKEN_KEY };
export { isHttpHeaderSafe, normalizeAccessToken } from "@/utils/access-token";

export interface AuthUserProfile {
  username: string;
  avatarUrl: string | null;
}

export function getToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  return normalizeAccessToken(raw);
}

export function setToken(token: string): void {
  const normalized = normalizeAccessToken(token);
  if (!normalized) {
    console.warn("[auth] refused to store invalid access token");
    return;
  }
  localStorage.setItem(TOKEN_KEY, normalized);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthUserProfile(): AuthUserProfile | null {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const username = (parsed as { username?: unknown }).username;
    const avatarUrl = (parsed as { avatarUrl?: unknown }).avatarUrl;
    if (typeof username !== "string" || username.length === 0) return null;
    return {
      username,
      avatarUrl: typeof avatarUrl === "string" && avatarUrl.length > 0 ? avatarUrl : null,
    };
  } catch {
    return null;
  }
}

export function setAuthUserProfile(profile: AuthUserProfile): void {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export function clearAuthUserProfile(): void {
  localStorage.removeItem(USER_PROFILE_KEY);
}

export function markExplicitLogout(): void {
  try {
    sessionStorage.setItem(EXPLICIT_LOGOUT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearExplicitLogout(): void {
  try {
    sessionStorage.removeItem(EXPLICIT_LOGOUT_KEY);
  } catch {
    /* ignore */
  }
}

export function hasExplicitLogout(): boolean {
  try {
    return sessionStorage.getItem(EXPLICIT_LOGOUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function getAuthHeader(): string | null {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
}
