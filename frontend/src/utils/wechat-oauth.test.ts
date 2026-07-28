import { describe, expect, it } from "vitest";
import { pickAccessToken, pickAvatarUrl, pickUsername } from "@/utils/wechat-auth-token";
import {
  getWeChatOAuthCallbackUrl,
  isWeChatOAuthStateValid,
  parseWeChatAuthBridgeMessage,
  rewriteWeChatLoginRedirectUri,
  WECHAT_AUTH_MESSAGE_TYPE,
} from "@/utils/wechat-oauth";

describe("wechat-oauth url helpers", () => {
  it("builds callback url with app base", () => {
    expect(getWeChatOAuthCallbackUrl("https://example.com")).toMatch(
      /\/login\/wechat-callback$/,
    );
  });

  it("rewrites redirect_uri to frontend callback", () => {
    const loginUrl =
      "https://open.weixin.qq.com/connect/qrconnect?appid=wx123&redirect_uri=https%3A%2F%2Fyour-domain.com%2Fnexus%2Fapi%2Fauth%2Fwechat%2Fcallback&response_type=code&scope=snsapi_login&state=STATE";
    const rewritten = rewriteWeChatLoginRedirectUri(loginUrl);
    const redirectUri = decodeURIComponent(new URL(rewritten).searchParams.get("redirect_uri")!);
    expect(redirectUri).toContain("/login/wechat-callback");
    expect(redirectUri).not.toContain("/nexus/api/auth/wechat/callback");
  });
});

describe("wechat-oauth state validation", () => {
  it("accepts matching state", () => {
    expect(isWeChatOAuthStateValid("abc", "abc")).toBe(true);
  });

  it("accepts STATE in dev", () => {
    expect(isWeChatOAuthStateValid("STATE", null)).toBe(import.meta.env.DEV);
  });
});

describe("wechat-oauth bridge messages", () => {
  it("parses success message", () => {
    const parsed = parseWeChatAuthBridgeMessage({
      type: WECHAT_AUTH_MESSAGE_TYPE,
      ok: true,
      result: { token: "t1", username: "u1" },
    });
    expect(parsed?.ok).toBe(true);
    if (parsed?.ok) expect(parsed.result.token).toBe("t1");
  });

  it("parses error message", () => {
    const parsed = parseWeChatAuthBridgeMessage({
      type: WECHAT_AUTH_MESSAGE_TYPE,
      ok: false,
      message: "fail",
    });
    expect(parsed?.ok).toBe(false);
  });
});

describe("wechat-auth-token", () => {
  it("picks token from nested data", () => {
    expect(pickAccessToken({ data: { access_token: "abc" } })).toBe("abc");
  });

  it("picks username and avatar from user object", () => {
    const payload = {
      access_token: "abc",
      user: { nickname: "旅途图", headimgurl: "https://img.example/a.png" },
    };
    expect(pickUsername(payload)).toBe("旅途图");
    expect(pickAvatarUrl(payload)).toBe("https://img.example/a.png");
  });
});
