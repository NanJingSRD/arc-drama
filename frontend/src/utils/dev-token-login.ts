import { verifyArcReelAccessToken } from "@/api/arcreel-auth";
import { normalizeAccessToken } from "@/utils/access-token";
import { pickAccessToken } from "@/utils/wechat-auth-token";

/** 解析开发者粘贴的 token（纯 token / Bearer / JSON）。 */
export function parseDevAccessTokenInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const bearerMatch = trimmed.match(/^Bearer\s+(.+)$/i);
  const candidate = bearerMatch ? bearerMatch[1].trim() : trimmed;

  if (candidate.startsWith("{")) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const fromJson = pickAccessToken(parsed);
      if (fromJson) return normalizeAccessToken(fromJson);
    } catch {
      return null;
    }
  }

  return normalizeAccessToken(candidate);
}

/** 从 JWT payload 读取展示用昵称（尽力而为）。 */
export function readJwtDisplayName(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    for (const key of ["nickname", "username", "name", "sub"]) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  } catch {
    return null;
  }

  return null;
}

/** 本地开发：校验线上 token 并返回可写入 auth store 的登录信息。 */
export async function authenticateDevAccessToken(rawInput: string): Promise<{
  token: string;
  username: string;
}> {
  const token = parseDevAccessTokenInput(rawInput);
  if (!token) {
    throw new Error("Token 格式无效，请粘贴 access_token（支持 Bearer 前缀或 JSON）");
  }

  const valid = await verifyArcReelAccessToken(token);
  if (!valid) {
    throw new Error(
      "Token 校验失败。请从线上站点 Application → Local Storage → arcreel_auth_token 复制，并确认本地代理指向同一套后端。",
    );
  }

  return {
    token,
    username: readJwtDisplayName(token) ?? "微信用户",
  };
}
