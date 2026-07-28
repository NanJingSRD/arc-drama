import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/stores/auth-store";
import { safeReturnPath } from "@/utils/safe-url";

/** 401 后回首页并自动打开微信登录弹窗（?wechat=1&from=...）。 */
export function WeChatReauthHandler() {
  const openWeChatLogin = useAuthStore((s) => s.openWeChatLogin);
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("wechat") !== "1") return;

    const returnTo = safeReturnPath(params.get("from")) ?? undefined;
    openWeChatLogin(returnTo);

    params.delete("wechat");
    params.delete("from");
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    navigate(next, { replace: true });
  }, [navigate, openWeChatLogin]);

  return null;
}
