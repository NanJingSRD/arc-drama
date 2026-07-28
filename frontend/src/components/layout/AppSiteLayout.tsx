import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { useLocation } from "wouter";
import { DevTokenLoginTrigger } from "@/components/auth/DevTokenLoginTrigger";
import { AppSiteHeader } from "./AppSiteHeader";
import { toRouterPath } from "@/utils/app-base";
import { shouldShowSiteHeader } from "@/utils/site-nav";

interface AppSiteLayoutProps {
  children: ReactNode;
}

export function AppSiteLayout({ children }: AppSiteLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppSiteHeader />
      <main className="flex-1">{children}</main>
      <DevTokenLoginTrigger />
    </div>
  );
}

function subscribePathname(cb: () => void) {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
}

/** 登录后大部分页面使用；项目内工作台除外 */
export function SiteShell({ children }: { children: ReactNode }) {
  // wouter nest 下 useLocation 仅为相对段，须用完整 pathname 判断顶栏显隐。
  useLocation();
  const pathname = useSyncExternalStore(
    subscribePathname,
    () => toRouterPath(window.location.pathname),
    () => toRouterPath(window.location.pathname),
  );
  if (!shouldShowSiteHeader(pathname)) {
    return <>{children}</>;
  }
  return <AppSiteLayout>{children}</AppSiteLayout>;
}
