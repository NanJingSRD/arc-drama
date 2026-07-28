import type { CSSProperties } from "react";

/** 海外 Web3 风格色板 — 工作空间模块统一主题 */
export const W3 = {
  bg: "#030712",
  cyan: "#22D3EE",
  cyanDim: "#0891B2",
  blue: "#6366F1",
  violet: "#A855F7",
  green: "#34D399",
  amber: "#FBBF24",
  textMuted: "rgba(148, 163, 184, 0.85)",
  surface: "rgba(8, 12, 28, 0.72)",
  surfaceSolid: "rgba(10, 16, 36, 0.92)",
  border: "rgba(34, 211, 238, 0.22)",
  borderSoft: "rgba(99, 102, 241, 0.18)",
  gradient: "linear-gradient(135deg, #22D3EE 0%, #6366F1 52%, #A855F7 100%)",
  gradientBtn: "linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)",
  gradientProgress: "linear-gradient(90deg, #22D3EE, #6366F1, #A855F7)",
  glowCyan: "0 0 28px rgba(34, 211, 238, 0.45)",
  glowCard: "0 0 40px -8px rgba(34, 211, 238, 0.25), 0 24px 64px -32px rgba(0, 0, 0, 0.85)",
  glowBtn: "0 0 32px -4px rgba(99, 102, 241, 0.65), inset 0 1px 0 rgba(255,255,255,0.25)",
  filterBarBg:
    "linear-gradient(180deg, rgba(34,211,238,0.05) 0%, rgba(3,7,18,0.42) 38%, rgba(3,7,18,0.38) 100%)",
  /** 列表页毛玻璃面板 — 单层结构，避免双层渐变把透明感盖掉 */
  glassPanelBg: "rgba(8, 14, 32, 0.22)",
  glassPanelBlur: "blur(20px) saturate(1.45)",
  glassPanelBorder: "1px solid rgba(34, 211, 238, 0.28)",
  glassPanelGlow:
    "inset 0 1px 0 rgba(255,255,255,0.07), 0 0 48px -14px rgba(34,211,238,0.22)",
  panelBg:
    "linear-gradient(180deg, rgba(8,14,32,0.88) 0%, rgba(6,10,24,0.82) 100%)",
} as const;

export const W3_ACCENT_BUTTON_STYLE: CSSProperties = {
  color: "#F8FAFC",
  background: W3.gradientBtn,
  boxShadow: W3.glowBtn,
};

export const W3_HEADER_BAR_STYLE: CSSProperties = {
  background: W3.panelBg,
  backdropFilter: "blur(20px) saturate(1.2)",
  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
  borderBottom: `1px solid ${W3.borderSoft}`,
  boxShadow: "inset 0 1px 0 rgba(34,211,238,0.08), 0 12px 40px -20px rgba(0,0,0,0.65)",
};

export const W3_SIDEBAR_STYLE: CSSProperties = {
  background: "rgba(6, 10, 24, 0.75)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRight: `1px solid ${W3.borderSoft}`,
};

export const W3_FOOTER_BAR_STYLE: CSSProperties = {
  background: W3.panelBg,
  backdropFilter: "blur(20px) saturate(1.2)",
  WebkitBackdropFilter: "blur(20px) saturate(1.2)",
  borderTop: `1px solid ${W3.borderSoft}`,
  boxShadow: "inset 0 1px 0 rgba(34,211,238,0.06), 0 -12px 40px -20px rgba(0,0,0,0.65)",
};

export const W3_CARD_STYLE: CSSProperties = {
  background: W3.panelBg,
  border: `1px solid ${W3.borderSoft}`,
  boxShadow: "inset 0 1px 0 rgba(34,211,238,0.06), 0 18px 40px -28px rgba(0,0,0,0.75)",
};

export const W3_CARD_FOOTER_STYLE: CSSProperties = {
  background: "rgba(6, 10, 24, 0.85)",
  borderTop: `1px solid ${W3.borderSoft}`,
};

export const W3_ACCENT_BTN_CLS =
  "inline-flex items-center rounded-[7px] font-semibold transition-transform motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

export const W3_ACCENT_BTN_MD_CLS = `${W3_ACCENT_BTN_CLS} gap-2 px-4 py-2 text-[12.5px]`;

export const W3_ACCENT_BTN_SM_CLS = `${W3_ACCENT_BTN_CLS} gap-1.5 px-3 py-1.5 text-[12px]`;

export const W3_GHOST_BTN_CLS =
  "inline-flex items-center gap-1.5 rounded-[7px] border border-hairline bg-bg-grad-a/50 px-2.5 py-1.5 text-[12px] font-medium text-text-2 transition-[color,background,border-color,transform] hover:border-hairline-strong hover:bg-bg-grad-a hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 motion-safe:hover:-translate-y-px";

export const W3_NAV_ACTIVE_CLS = "font-semibold text-slate-50";

export const W3_NAV_INACTIVE_CLS =
  "border border-hairline bg-bg-grad-a/50 font-medium text-text-2 hover:border-hairline-strong hover:bg-bg-grad-a hover:text-text";

export const W3_KICKER_CLS = "font-mono text-[10px] font-bold uppercase tracking-[0.14em]";

export function w3KickerStyle(): CSSProperties {
  return { color: W3.cyan, textShadow: W3.glowCyan };
}

/** 项目头像 / 首字徽标 — 渐变底 + cyan 描边光晕 */
export const W3_AVATAR_STYLE: CSSProperties = {
  color: "#F8FAFC",
  background: W3.gradientBtn,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px rgba(34,211,238,0.35), 0 0 16px -4px rgba(34,211,238,0.5)",
};

/** 分集卡片激活态缩略徽标 */
export const W3_EPISODE_BADGE_ACTIVE: CSSProperties = {
  color: "#F8FAFC",
  background: W3.gradientBtn,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.22), 0 0 0 1px rgba(34,211,238,0.4), 0 0 14px -3px rgba(99,102,241,0.55)",
};

/** 分集卡片非激活态缩略徽标 — 玻璃暗底 */
export const W3_EPISODE_BADGE_IDLE: CSSProperties = {
  color: "rgba(148, 163, 184, 0.9)",
  background: "linear-gradient(180deg, rgba(15,23,42,0.9), rgba(8,12,28,0.75))",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(99,102,241,0.12)",
};

/** 分集卡片选中行背景 */
export const W3_EPISODE_ROW_ACTIVE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(34,211,238,0.08), rgba(99,102,241,0.06))",
  border: `1px solid ${W3.border}`,
  boxShadow:
    "inset 0 1px 0 rgba(34,211,238,0.1), 0 0 20px -8px rgba(34,211,238,0.35), 0 4px 12px -6px rgba(0,0,0,0.5)",
};
