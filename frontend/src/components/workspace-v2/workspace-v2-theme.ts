import { cn } from "@/lib/utils";

/**
 * 工作空间 2.0 详情页主题 — 对齐首页 / 提示词工厂
 * 背景 Web3 · 面板 #0a0e14 · border-white/8 · cyan 强调色
 */

/** 详情主容器 / 流程条 / 内容区外壳 */
export const WS2_DETAIL_SHELL_CLASS = cn(
  "relative overflow-hidden rounded-2xl border border-white/8 bg-[#0a0e14]/60 backdrop-blur-sm",
  "shadow-[0_12px_40px_oklch(0_0_0/0.35)]",
);

/** 列表/详情外层面板 */
export const WS2_PANEL_CLASS = WS2_DETAIL_SHELL_CLASS;

/** 内嵌卡片/分集 — 不使用 hover 位移，避免在 overflow 容器内被裁切 */
export const WS2_CARD_CLASS = cn(
  "rounded-2xl border border-white/8 bg-[#0a0e14]",
  "shadow-[0_8px_28px_oklch(0_0_0/0.35)]",
  "transition-[border-color,box-shadow] duration-200",
  "motion-safe:hover:border-cyan-300/45",
);

/** 含卡片的滚动区内层留白，避免 hover 描边/阴影贴边被裁切 */
export const WS2_CARD_SCROLL_INNER_CLASS = "px-0.5 py-1";

/** 节点内容区 — 顶栏（tabs / 操作按钮） */
export const WS2_NODE_TOOLBAR_CLASS = cn("shrink-0 border-b border-white/6 pb-3");

/** 节点内容区 — 顶栏下方主体容器 */
export const WS2_NODE_BODY_CLASS = cn(
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/8 bg-[#0a0e14]/40",
);

/** 节点内容区 — 主体内层滚动 */
export const WS2_NODE_BODY_INNER_CLASS = cn("min-h-0 flex-1 overflow-y-auto p-3");

/** 流程节点内容区顶部标题 */
export const WS2_NODE_TITLE_CLASS = cn(
  "bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text",
  "text-base font-bold tracking-tight text-transparent sm:text-lg",
);

/** 流程节点标题左侧强调条 */
export const WS2_NODE_TITLE_ACCENT_CLASS = cn(
  "h-[1.125rem] w-1 shrink-0 rounded-full",
  "bg-gradient-to-b from-cyan-400 to-indigo-500",
  "shadow-[0_0_12px_oklch(0.62_0.16_195/0.5)]",
);

/** 资产库子 Tab — 选中态与站点导航一致 */
export const WS2_ASSET_TAB_ACTIVE_BG_CLASS = cn(
  "group gap-1.5",
  "data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#2563eb] data-[state=active]:via-[#0891b2] data-[state=active]:to-[#059669]",
  "data-[state=active]:text-white data-[state=active]:shadow-[0_0_22px_oklch(0.62_0.14_210/0.45),inset_0_1px_0_oklch(1_0_0/0.28)]",
);

/** 资产库子 Tab 数量角标 */
export const WS2_ASSET_TAB_COUNT_CLASS = cn(
  "inline-flex min-w-[1.125rem] items-center justify-center rounded-md px-1.5 py-px",
  "text-[10px] font-semibold tabular-nums leading-none",
  "bg-white/8 text-white/55",
  "group-data-[state=active]:bg-white/22 group-data-[state=active]:text-white",
);

export const WS2_CARD_FOOTER_CLASS = cn("border-t border-white/6");

/** 页头栏 */
export const WS2_HEADER_BAR_CLASS = cn(
  "border-b border-white/8 bg-[#0a0e14]/75 backdrop-blur-md",
);

/** 侧边栏 */
export const WS2_SIDEBAR_CLASS = cn(
  "border-r border-white/8 bg-[#0a0e14]/40 backdrop-blur-sm",
);

/** 详情页次要文案 */
export const WS2_DETAIL_TEXT_MUTED = "text-white/55";

/** 详情页幽灵按钮 */
export const WS2_GHOST_BTN_CLS = cn(
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5",
  "text-white/55 transition-colors duration-200",
  "hover:border-white/18 hover:bg-white/8 hover:text-white/85",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

/** 主 CTA 按钮 */
export const WS2_ACCENT_BTN_CLS = cn(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold",
  "bg-gradient-to-br from-[#06B6D4] to-[#6366F1] text-white shadow-sm",
  "transition-colors duration-200 motion-safe:hover:-translate-y-px motion-safe:hover:opacity-95",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0e14]",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
);

export const WS2_ACCENT_BTN_MD_CLS = cn(WS2_ACCENT_BTN_CLS, "px-4 py-2 text-sm");

export const WS2_ACCENT_BTN_SM_CLS = cn(WS2_ACCENT_BTN_CLS, "px-3 py-1.5 text-xs");

/** 资产库顶栏 / 筛选条 */
export const WS2_TOOLBAR_CLASS = cn(
  "rounded-xl border border-white/8 bg-[#0a0e14]/50 backdrop-blur-sm",
);

/** 设置 / 创建项目弹窗面板 */
export const WS2_MODAL_PANEL_CLASS = cn(
  "rounded-2xl border border-white/10 bg-[#0a0e14]/95 shadow-lg backdrop-blur-xl",
);

/** 区块标题栏 */
export const WS2_SECTION_HEADER_CLASS = cn("border-b border-white/6 bg-white/[0.02]");

/** 粘性表格头 */
export const WS2_TABLE_HEAD_CLASS = cn("border-b border-white/8 bg-[#0a0e14]");

export const WS2_TABLE_HEAD_CELL_CLS =
  "bg-[#0a0e14] px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-white/45";

export const WS2_SECTION_HEADER_TITLE_CLS = "text-sm font-semibold text-white/90";

/** 剧情导入上传区 */
export const WS2_WELCOME_DROPZONE_CLASS = cn(
  "rounded-2xl border border-dashed border-white/10 bg-[#0a0e14] transition-all duration-200",
  "hover:border-cyan-400/40 hover:shadow-[0_0_0_2px_oklch(0.78_0.14_195/0.14)]",
);

export const WS2_WELCOME_DROPZONE_ACTIVE_CLASS = cn(
  "border-cyan-400/55 bg-cyan-400/10 shadow-[0_0_0_4px_oklch(0.62_0.16_195/0.12)]",
);

/** 流程节点遮罩底色 — 与详情面板一致 */
export const WS2_DETAIL_NODE_BACKDROP_CLASS = "bg-[#0a0e14]";

export function ws2NavActiveClass(): string {
  return cn(
    "border border-cyan-400/35 bg-cyan-400/10 text-white",
    "shadow-[0_0_18px_oklch(0.62_0.16_195/0.18)]",
  );
}

export function ws2NavInactiveClass(): string {
  return cn("border border-transparent text-white/50 hover:bg-white/5 hover:text-white/80");
}

export function ws2SubNavActiveClass(): string {
  return cn("border-l-2 border-cyan-400/70 bg-cyan-400/8 text-cyan-200");
}

export function ws2SubNavInactiveClass(): string {
  return cn("border-l-2 border-transparent text-white/45 hover:text-white/75");
}

// Legacy inline-style exports — kept for gradual migration in settings panels
import type { CSSProperties } from "react";

export const WS2 = {
  bg: "#030305",
  bgTop: "#0a0e14",
  panel: "rgba(10, 14, 20, 0.6)",
  panelHover: "rgba(10, 14, 20, 0.75)",
  textMuted: "rgba(255, 255, 255, 0.55)",
  accent: "#22d3ee",
  accentSoft: "#6366f1",
  border: "rgba(255, 255, 255, 0.08)",
  borderStrong: "rgba(255, 255, 255, 0.14)",
} as const;

export const WS2_PANEL_STYLE: CSSProperties = {};
export const WS2_CARD_STYLE: CSSProperties = { background: "#0a0e14" };
export const WS2_CARD_FOOTER_STYLE: CSSProperties = {};
export const WS2_HEADER_BAR_STYLE: CSSProperties = { background: "rgba(10, 14, 20, 0.75)" };
export const WS2_SIDEBAR_STYLE: CSSProperties = { background: "rgba(10, 14, 20, 0.4)" };
export const WS2_ACCENT_BUTTON_STYLE: CSSProperties = {};
export const WS2_AVATAR_STYLE: CSSProperties = {};
export const WS2_ACCENT_BTN_CLS_LEGACY = WS2_ACCENT_BTN_CLS;
export const WS2_TOOLBAR_STYLE: CSSProperties = {};
export const WS2_MODAL_PANEL_STYLE: CSSProperties = {};
export const WS2_SECTION_HEADER_STYLE: CSSProperties = { borderBottom: "1px solid rgba(255,255,255,0.06)" };
export const WS2_TABLE_HEAD_STYLE: CSSProperties = {};
export const WS2_TABLE_HEAD_CELL_STYLE: CSSProperties = {};

export function ws2NavActiveStyle(): CSSProperties {
  return {};
}

export function ws2NavInactiveStyle(): CSSProperties {
  return {};
}
