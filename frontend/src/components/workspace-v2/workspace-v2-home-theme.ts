import { cn } from "@/lib/utils";

/**
 * 工作空间 2.0 首页 — 对齐精选作品 / 提示词工厂模块视觉
 * 背景 WelcomeBackground · 卡片 #0a0e14 · cyan 强调色
 */

export const WS2_HOME_PANEL_CLASS = cn(
  "overflow-hidden rounded-2xl border border-white/8 bg-[#0a0e14]/60 backdrop-blur-sm",
);

export const WS2_HOME_FILTER_STRIP_CLASS = cn(
  "rounded-2xl border border-white/8 bg-[#0a0e14]/60 p-4 backdrop-blur-sm sm:p-5",
);

export const WS2_HOME_CARD_CLASS = cn(
  "overflow-hidden rounded-2xl border border-white/8 bg-[#0a0e14]",
  "shadow-[0_12px_40px_oklch(0_0_0/0.4)]",
  "transition-[border-color,box-shadow,transform] duration-300",
  "motion-safe:hover:-translate-y-0.5",
  "hover:border-cyan-300/70",
  "hover:shadow-[0_0_0_1px_oklch(0.78_0.14_195/0.45),0_0_28px_oklch(0.62_0.16_195/0.35),0_20px_56px_oklch(0_0_0/0.5)]",
);

export const WS2_HOME_CARD_FOOTER_CLASS = "border-t border-white/6";

export const WS2_HOME_FILTER_LABEL_CLASS = "text-xs font-medium text-white/50";

export const WS2_HOME_GHOST_BTN_CLASS = cn(
  "border border-white/10 bg-white/5 text-white/55",
  "hover:border-white/18 hover:bg-white/8 hover:text-white/85",
);

export const WS2_HOME_BADGE_CLASS = cn(
  "rounded-md bg-cyan-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg",
);

export const WS2_HOME_INPUT_CLASS = cn(
  "rounded-xl border border-white/10 bg-white/5 text-sm text-white/80 placeholder:text-white/30",
  "outline-none transition duration-200",
  "hover:border-white/16 hover:bg-white/8",
  "focus-visible:border-cyan-400/40 focus-visible:bg-white/8 focus-visible:ring-0",
);

export const WS2_HOME_SELECT_TRIGGER_CLASS = WS2_HOME_INPUT_CLASS;

export const WS2_HOME_SELECT_PANEL_CLASS = cn(
  "overflow-hidden rounded-xl border border-white/10 bg-[#0a0e14]/95 py-1 backdrop-blur-md",
  "shadow-[0_16px_48px_oklch(0_0_0/0.55)]",
);

/** 无封面占位 — 与提示词工厂卡片媒体区一致 */
export const WS2_HOME_POSTER_PLACEHOLDER_CLASS = "h-full w-full bg-[#12151c]";
