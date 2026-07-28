import { NEXUS_API_BASE } from "@/utils/nexus-api-base";
import { rewriteWeChatLoginRedirectUri } from "@/utils/wechat-oauth";
import { pickAccessToken } from "@/utils/wechat-auth-token";

interface NexusDataResponse<T> {
  code: number;
  message: string;
  data: T | null;
}

export interface WeChatLoginUrlData {
  url: string;
}

function unwrapNexusData<T>(payload: NexusDataResponse<T>): T {
  if (payload.code !== 200 || payload.data == null) {
    throw new Error(payload.message || "请求失败");
  }
  return payload.data;
}

export async function fetchWeChatLoginUrl(
  inviteCode?: string,
  clientState?: string,
): Promise<string> {
  const params = new URLSearchParams();
  if (inviteCode?.trim()) params.set("invite_code", inviteCode.trim());
  if (clientState?.trim()) params.set("state", clientState.trim());
  const qs = params.toString();
  const url = `${NEXUS_API_BASE}/auth/wechat/login${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`微信登录接口请求失败 (${res.status})`);
  }

  const payload = (await res.json()) as NexusDataResponse<WeChatLoginUrlData>;
  let authUrl = unwrapNexusData(payload).url;
  if (!authUrl) {
    throw new Error(payload.message || "未获取到微信授权地址");
  }

  authUrl = rewriteWeChatLoginRedirectUri(authUrl);
  if (clientState?.trim()) {
    const rewritten = new URL(authUrl);
    rewritten.searchParams.set("state", clientState.trim());
    authUrl = rewritten.toString();
  }
  return authUrl;
}

/** 用微信回调 code 向 Nexus 换票。 */
export async function exchangeWechatOAuthCode(code: string): Promise<unknown> {
  const url = `${NEXUS_API_BASE}/auth/wechat/callback?code=${encodeURIComponent(code)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`微信换票失败 (${res.status})`);
  }

  const payload = (await res.json()) as NexusDataResponse<unknown> | unknown;
  if (
    typeof payload === "object" &&
    payload !== null &&
    "code" in payload &&
    "data" in payload
  ) {
    const wrapped = payload as NexusDataResponse<unknown>;
    const data = unwrapNexusData(wrapped);
    if (pickAccessToken(data)) return data;
    if (pickAccessToken(wrapped)) return wrapped;
    throw new Error(wrapped.message || "换票响应中未找到 token");
  }

  if (pickAccessToken(payload)) return payload;
  throw new Error("换票响应中未找到 token");
}
