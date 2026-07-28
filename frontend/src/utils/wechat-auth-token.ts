const TOKEN_KEYS = ["access_token", "accessToken", "token", "jwt", "bearerToken"] as const;

function tokenFromRecord(value: Record<string, unknown> | null): string | null {
  if (!value) return null;
  for (const key of TOKEN_KEYS) {
    const token = value[key];
    if (typeof token === "string" && token.trim()) return token.trim();
  }
  return null;
}

function userRecord(payload: Record<string, unknown>): Record<string, unknown> | null {
  if (typeof payload.user === "object" && payload.user !== null) {
    return payload.user as Record<string, unknown>;
  }
  if (typeof payload.data === "object" && payload.data !== null) {
    const nested = payload.data as Record<string, unknown>;
    if (typeof nested.user === "object" && nested.user !== null) {
      return nested.user as Record<string, unknown>;
    }
  }
  return null;
}

/** 从 Nexus 换票响应中取出 access token。 */
export function pickAccessToken(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const direct = tokenFromRecord(record);
  if (direct) return direct;
  const nested =
    typeof record.data === "object" && record.data !== null
      ? (record.data as Record<string, unknown>)
      : null;
  return tokenFromRecord(nested);
}

/** 从换票响应中取出用户昵称。 */
export function pickUsername(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const user = userRecord(record);

  for (const key of ["nickname", "username", "name"]) {
    const value = user?.[key] ?? record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** 从换票响应中取出头像 URL。 */
export function pickAvatarUrl(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const user = userRecord(record);

  for (const key of ["avatar", "avatar_url", "avatarUrl", "headimgurl", "head_img"]) {
    const value = user?.[key] ?? record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
