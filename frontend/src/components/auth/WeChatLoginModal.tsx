import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { useLocation } from "wouter";
import { fetchWeChatLoginUrl } from "@/api/nexus-auth";
import { verifyArcReelAccessToken } from "@/api/arcreel-auth";
import { BRAND } from "@/branding";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAuthStore } from "@/stores/auth-store";
import { publicAssetUrl } from "@/utils/app-base";
import { waitForWeChatAuthPopupResult } from "@/utils/wechat-auth-popup";
import {
  getWeChatRedirectUriOrigin,
  saveWeChatOAuthFullPageFlow,
  syncWeChatOAuthStateFromLoginUrl,
  WECHAT_OAUTH_POPUP_FLOW_KEY,
} from "@/utils/wechat-oauth";
import { lockBodyScroll } from "@/utils/body-scroll-lock";

function WeChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M8.5 4C4.91 4 2 6.46 2 9.5c0 1.62.86 3.06 2.2 4.03-.1.92-.36 2.23-1.05 3.23 0 0 1.38-.12 2.72-.86 1.02.28 2.1.44 3.23.44.28 0 .55-.02.82-.05-.17-.52-.26-1.07-.26-1.64 0-3.59 3.36-6.5 7.5-6.5.39 0 .77.03 1.14.08C16.57 5.64 12.78 4 8.5 4Zm-2.4 4.8a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm4.8 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8ZM22 14.5c0-2.57-2.46-4.65-5.5-4.65-3.04 0-5.5 2.08-5.5 4.65S13.46 19.15 16.5 19.15c1.02 0 1.98-.22 2.83-.61.95.5 1.92.61 1.92.61-.5-.9-.68-1.88-.74-2.56 1.12-.87 1.89-2.12 1.89-3.5ZM14.6 13a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Zm3.8 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  );
}

const PANEL_TRANSITION = { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const };

function WeChatLoginDialog({
  onClose,
  onLoginSuccess,
}: {
  onClose: () => void;
  onLoginSuccess: (token: string, username: string, avatarUrl?: string | null) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnTargetRef = useRef<HTMLElement | null>(null);
  const returnTo = useAuthStore((s) => s.wechatReturnTo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    returnTargetRef.current = (document.activeElement as HTMLElement | null) ?? null;
  }, []);

  useEscapeClose(onClose, true);
  useFocusTrap(dialogRef, true, returnTargetRef);

  useLayoutEffect(() => {
    return lockBodyScroll();
  }, []);

  const handleWeChatLogin = async () => {
    setError("");
    setLoading(true);

    const popupName = `srd_wechat_oauth_${crypto.randomUUID()}`;
    const popup = window.open(
      "about:blank",
      popupName,
      "width=520,height=720,left=120,top=72,menubar=no,toolbar=no,location=no,status=no",
    );

    try {
      const clientState = crypto.randomUUID();
      const authUrl = await fetchWeChatLoginUrl(undefined, clientState);

      const redirectOrigin = getWeChatRedirectUriOrigin(authUrl);
      if (import.meta.env.DEV && redirectOrigin && redirectOrigin !== window.location.origin) {
        console.warn(
          "[wechat-oauth] redirect_uri origin ≠ 当前页：弹窗回调页可能无法把登录态交回本页",
          { current: window.location.origin, redirectUriOrigin: redirectOrigin },
        );
      }

      syncWeChatOAuthStateFromLoginUrl(authUrl, clientState);

      if (!popup || popup.closed) {
        saveWeChatOAuthFullPageFlow(returnTo ?? "/app/home");
        window.location.assign(authUrl);
        return;
      }

      try {
        localStorage.setItem(WECHAT_OAUTH_POPUP_FLOW_KEY, "1");
      } catch {
        /* ignore */
      }

      popup.location.href = authUrl;
      popup.focus();

      const result = await waitForWeChatAuthPopupResult(popup);
      if (!(await verifyArcReelAccessToken(result.token))) {
        throw new Error("微信登录成功，但当前账号无法访问工作台，请联系管理员");
      }
      onLoginSuccess(result.token, result.username || "微信用户", result.avatarUrl ?? null);
    } catch (err) {
      try {
        localStorage.removeItem(WECHAT_OAUTH_POPUP_FLOW_KEY);
      } catch {
        /* ignore */
      }
      try {
        popup?.close();
      } catch {
        /* ignore */
      }
      setError(err instanceof Error ? err.message : "微信登录失败");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 cursor-pointer border-0 bg-black/65 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wechat-login-title"
        tabIndex={-1}
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={PANEL_TRANSITION}
        className="arc-glass-panel relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-[#0c1018]/98 outline-none"
      >
        <span aria-hidden="true" className="arc-glass-hairline" data-tone="accent" />

        <div className="relative flex flex-col px-8 pb-10 pt-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-md p-1.5 text-white/40 transition hover:bg-white/6 hover:text-white"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-1 flex-col items-center justify-center pt-4 text-center">
            <img
              src={publicAssetUrl("srd-logo.png")}
              alt={BRAND.name}
              className="h-16 w-16 rounded-xl"
            />
            <h2 id="wechat-login-title" className="mt-5 text-xl font-semibold text-white">
              {BRAND.name}
            </h2>
            <p className="mt-2 text-sm text-white/45">使用微信账号登录后继续</p>
          </div>

          <div className="mt-8">
            <button
              type="button"
              data-testid="wechat-auth-btn"
              disabled={loading}
              onClick={() => void handleWeChatLogin()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#07c160] px-4 py-4 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                  正在完成微信登录…
                </>
              ) : (
                <>
                  <WeChatIcon className="h-5 w-5" />
                  微信授权登录
                </>
              )}
            </button>

            {loading ? (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/40">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
                正在与服务器同步登录状态
              </p>
            ) : null}

            {error ? <p className="mt-3 text-center text-xs text-red-300">{error}</p> : null}
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

export function WeChatLoginModal() {
  const open = useAuthStore((s) => s.wechatLoginOpen);
  const returnTo = useAuthStore((s) => s.wechatReturnTo);
  const closeWeChatLogin = useAuthStore((s) => s.closeWeChatLogin);
  const login = useAuthStore((s) => s.login);
  const [, navigate] = useLocation();

  const handleLoginSuccess = (token: string, username: string, avatarUrl?: string | null) => {
    login(token, username, avatarUrl ?? null);
    closeWeChatLogin();
    if (returnTo) navigate(returnTo);
  };

  return (
    <AnimatePresence>
      {open ? (
        <WeChatLoginDialog
          key="wechat-login-modal"
          onClose={closeWeChatLogin}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : null}
    </AnimatePresence>
  );
}
