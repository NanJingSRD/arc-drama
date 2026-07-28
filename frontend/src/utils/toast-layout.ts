import { shouldShowSiteHeader } from "@/utils/site-nav";

/** 有站点顶栏时，toast 贴在顶栏下方（h-14）。 */
export const TOAST_TOP_WITH_SITE_HEADER = "top-14";

/** 沉浸式页面（工作空间 2.0 项目详情、旧版工作台等）toast 贴近顶部。 */
export const TOAST_TOP_IMMERSIVE = "top-3";

/**
 * 顶部 toast 的 Tailwind `top-*` 类名。
 * 工作空间 2.0 所有 pushToast / pushNotification 均经全局 ToastOverlay 渲染，位置由此统一决定。
 */
export function getToastTopClass(pathname: string): string {
  return shouldShowSiteHeader(pathname) ? TOAST_TOP_WITH_SITE_HEADER : TOAST_TOP_IMMERSIVE;
}
