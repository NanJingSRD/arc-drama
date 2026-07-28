export type SiteNavId = "home" | "featured" | "prompt-factory" | "workspace" | "workspace-v2";

export interface SiteNavItem {
  id: SiteNavId;
  label: string;
  href: string;
}

export const SITE_NAV_ITEMS: SiteNavItem[] = [
  { id: "home", label: "首页", href: "/app/home" },
  { id: "featured", label: "精选作品", href: "/app/featured" },
  { id: "prompt-factory", label: "提示词工厂", href: "/app/prompt-factory" },
  { id: "workspace", label: "工作空间", href: "/app/projects" },
  { id: "workspace-v2", label: "工作空间2.0", href: "/app/workspace-v2" },
];

/** 项目内工作台（三栏布局）不展示站点顶栏 */
export function shouldShowSiteHeader(pathname: string): boolean {
  if (pathname === "/login" || pathname.endsWith("/login")) return false;
  if (/^\/app\/projects\/[^/]+(\/|$)/.test(pathname)) return false;
  if (/^\/app\/workspace-v2\/[^/]+/.test(pathname)) return false;
  return true;
}

export function getActiveSiteNav(pathname: string, _hash: string): SiteNavId {
  if (pathname === "/app/workspace-v2" || pathname.startsWith("/app/workspace-v2/")) {
    return "workspace-v2";
  }
  if (
    pathname === "/app/projects" ||
    pathname === "/app/settings" ||
    pathname === "/app/assets"
  ) {
    return "workspace";
  }
  if (pathname === "/app/featured") {
    return "featured";
  }
  if (pathname === "/app/prompt-factory") {
    return "prompt-factory";
  }
  if (pathname === "/app/home" || pathname === "/app") {
    return "home";
  }
  return "home";
}
