import type { CSSProperties } from "react";

/** 资产设定图统一 16:9（与后端生成比例一致） */
export const ASSET_SHEET_ASPECT_CLASS = "aspect-video";

export const ASSET_IMAGE_FRAME_STYLE: CSSProperties = {
  border: "1px solid var(--color-hairline-soft)",
  background: "oklch(0.16 0.010 265 / 0.5)",
};

/** 固定高度容器；有图时用 absolute 铺满，无图时用 flex 居中占位 */
export const ASSET_IMAGE_FRAME_CLASS =
  `relative flex ${ASSET_SHEET_ASPECT_CLASS} w-full items-center justify-center overflow-hidden rounded-lg`;

export const ASSET_IMAGE_FRAME_IMG_CLASS =
  "absolute inset-0 h-full w-full object-cover";

/** 提示词模版 / 提示词 共用固定高度，溢出滚动 */
export const ASSET_PROMPT_TEXT_CLASS =
  "h-28 overflow-y-auto whitespace-pre-wrap rounded-lg px-3 py-2.5 text-[13px] leading-[1.6]";

export const ASSET_PROMPT_TEXTAREA_CLASS =
  "focus-ring h-28 w-full resize-none overflow-y-auto rounded-lg px-3 py-2.5 text-[13px] leading-[1.6] outline-none";
