import type { CSSProperties } from "react";
import { SITE_CONTENT_SHELL } from "@/utils/site-layout";

/** 首页主内容区 — 适度左右边距（仅 WelcomePage 使用） */
export const WELCOME_SECTION = "relative mx-auto w-full max-w-[1320px] px-4 sm:px-6";

/** 与工作空间（ProjectsPage）一致的内容区边距 */
export const APP_CONTENT_SECTION = SITE_CONTENT_SHELL;

/** 教程、底部 CTA、Footer 等内容区 */
export const WELCOME_SECTION_WIDE = SITE_CONTENT_SHELL;

/** 首屏区（顶栏 h-14 以下）— 轮播 + CTA 不滚动 */
export const WELCOME_FIRST_SCREEN_CLASS =
  "relative flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden";

/** 首屏轮播 — 基础 CSS 变量；大屏增量见 Tailwind `welcome-hero` 类 */
export const WELCOME_HERO_SECTION_CLASS =
  "welcome-hero relative flex min-h-0 flex-1 flex-col [--hero-max-w:960px] [--hero-peek:min(130px,16%)] [--hero-side:min(260px,32%)] lg:[--hero-max-w:min(1080px,calc(100vw-11rem))] lg:[--hero-peek:min(150px,14%)] xl:[--hero-max-w:min(1180px,calc(100vw-9rem))] xl:[--hero-peek:min(165px,13%)]";

export const WELCOME_HERO_STYLE = {} as CSSProperties;

export const WELCOME_CARD =
  "overflow-hidden rounded-xl border border-white/6 bg-[#12151c]/80 backdrop-blur-sm transition hover:border-cyan-400/25 hover:shadow-[0_0_24px_oklch(0.78_0.12_195/0.1)]";
