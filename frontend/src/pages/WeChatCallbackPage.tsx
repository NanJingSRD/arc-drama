import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { verifyArcReelAccessToken } from "@/api/arcreel-auth";
import { exchangeWechatOAuthCode } from "@/api/nexus-auth";
import { BRAND } from "@/branding";
import { useAuthStore } from "@/stores/auth-store";
import { publicAssetUrl } from "@/utils/app-base";
import { pickAccessToken, pickAvatarUrl, pickUsername } from "@/utils/wechat-auth-token";
import { readWeChatAvatarFromParams } from "@/utils/wechat-auth-params";
import {
  consumeWeChatOAuthReturnTo,
  clearWeChatOAuthFullPageFlow,
  isWeChatOAuthStateValid,
  notifyWeChatAuthOpenerOrBroadcast,
  WECHAT_OAUTH_STATE_KEY,
  type WeChatAuthResult,
} from "@/utils/wechat-oauth";

/**
 * 微信 OAuth 回调：?code=...&state=...
 * redirect_uri 须指向前端 `/login/wechat-callback`；换票为 `GET /auth/wechat/callback?code=`。
 */
export function WeChatCallbackPage() {
  const [error, setError] = useState("");
  const [hint, setHint] = useState("正在完成微信登录…");
  const ran = useRef(false);
  const login = useAuthStore((s) => s.login);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const fail = (message: string) => {
      setHint("登录失败");
      setError(message);
      notifyWeChatAuthOpenerOrBroadcast({ ok: false, message });
    };

    const completeSameWindowLogin = async (result: WeChatAuthResult) => {
      clearWeChatOAuthFullPageFlow();
      const returnTo = consumeWeChatOAuthReturnTo() ?? "/app/home";

      if (!(await verifyArcReelAccessToken(result.token))) {
        fail("微信登录成功，但当前账号无法访问工作台，请联系管理员");
        return;
      }

      login(result.token, result.username ?? "微信用户", result.avatarUrl ?? null);
      navigate(returnTo, { replace: true });
    };

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const oauthError = params.get("error");
      const oauthErrorDesc = params.get("error_description");
      if (oauthError) {
        fail(oauthErrorDesc || "用户取消或未同意授权");
        return;
      }

      const code = params.get("code");
      const state = params.get("state");
      const savedState = localStorage.getItem(WECHAT_OAUTH_STATE_KEY);
      localStorage.removeItem(WECHAT_OAUTH_STATE_KEY);

      if (!code || !isWeChatOAuthStateValid(state, savedState)) {
        const token =
          params.get("token") ||
          params.get("access_token") ||
          hashParams.get("token") ||
          hashParams.get("access_token");

        if (token) {
          const username =
            params.get("username") ||
            params.get("nickname") ||
            hashParams.get("username") ||
            hashParams.get("nickname") ||
            "微信用户";
          const avatarUrl = readWeChatAvatarFromParams(params, hashParams);
          const result = {
            token,
            username,
            ...(avatarUrl ? { avatarUrl } : {}),
          };

          if (notifyWeChatAuthOpenerOrBroadcast({ ok: true, result })) return;
          await completeSameWindowLogin(result);
          return;
        }

        fail("授权无效或已过期，请重新登录");
        return;
      }

      try {
        setHint("正在与服务器同步登录状态");
        const payload = await exchangeWechatOAuthCode(code);
        const token = pickAccessToken(payload);
        if (!token) {
          fail("登录响应中未找到 token");
          return;
        }

        const result = {
          token,
          username: pickUsername(payload) ?? "微信用户",
          avatarUrl: pickAvatarUrl(payload) ?? undefined,
        };

        if (notifyWeChatAuthOpenerOrBroadcast({ ok: true, result })) return;

        await completeSameWindowLogin(result);
      } catch (err) {
        fail(err instanceof Error ? err.message : "微信登录失败");
      }
    };

    void run();
  }, [login, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#06080f] px-6 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c1018]/95 p-8 text-center">
        <img
          src={publicAssetUrl("srd-logo.png")}
          alt={BRAND.name}
          className="mx-auto h-12 w-12 rounded-xl"
        />
        <h1 className="mt-4 text-lg font-semibold">微信授权登录</h1>
        {error ? (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        ) : (
          <>
            <p className="mt-3 text-sm text-white/50">{hint}</p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/40">
              <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-cyan-400" />
              正在与服务器同步登录状态
            </div>
          </>
        )}
      </div>
    </div>
  );
}
