import type { ReactNode } from "react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { WeChatLoginModal } from "@/components/auth/WeChatLoginModal";
import { useAuthStore } from "@/stores/auth-store";

export function PublicSiteRoute({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <WeChatLoginModal />
    </>
  );
}

export function WorkspaceAuthRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const openWorkspaceLogin = useAuthStore((s) => s.openWorkspaceLogin);
  const { t } = useTranslation("common");
  const [pathname] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      openWorkspaceLogin(pathname || "/app/projects");
    }
  }, [isAuthenticated, isLoading, openWorkspaceLogin, pathname]);

  if (isLoading) {
    return (
      <>
        <div
          role="status"
          aria-live="polite"
          className="flex min-h-[40vh] items-center justify-center gap-2 text-[13px] text-white/45"
        >
          <Loader2 aria-hidden className="h-4 w-4 motion-safe:animate-spin" />
          <span>{t("loading")}</span>
        </div>
        <WeChatLoginModal />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex min-h-[40vh] items-center justify-center px-6 text-sm text-white/40">
          登录后即可访问工作空间
        </div>
        <WeChatLoginModal />
      </>
    );
  }

  return (
    <>
      {children}
      <WeChatLoginModal />
    </>
  );
}
