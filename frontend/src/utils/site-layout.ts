/** 站点 Header 与教程/Footer 等内容区 */
export const SITE_CONTENT_SHELL = "mx-auto w-full max-w-[1320px] px-6";

/** 顶栏 — 全宽，仅保留贴边最小内边距 */
export const SITE_HEADER_SHELL = "w-full px-4 sm:px-5";

/**
 * 精选作品 / 提示词工厂 / 工作空间 — 三模块统一边距（独立于首页）
 */
export const APP_MODULE_SHELL =
  "mx-auto w-full px-8 sm:px-10 lg:px-14 xl:px-16 2xl:px-20";

/** 三模块页面区块上下间距 */
export const APP_MODULE_SECTION = "py-6 sm:py-8";

/** 精选作品 — 约 380px 列宽，宽屏自动增加列数 */
export const APP_MODULE_FEATURED_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-6 sm:gap-7";

/** 提示词工厂 — 视频模板 16:9，约 280px 列宽 */
export const APP_MODULE_PROMPT_VIDEO_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5 sm:gap-6";

/** 提示词工厂 — 图片模板 9:16，约 220px 列宽（同比例更紧凑） */
export const APP_MODULE_PROMPT_IMAGE_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4 sm:gap-5";

/** @deprecated 使用 APP_MODULE_PROMPT_VIDEO_GRID / APP_MODULE_PROMPT_IMAGE_GRID */
export const APP_MODULE_PROMPT_GRID = APP_MODULE_PROMPT_VIDEO_GRID;

/** 工作空间项目库 — 约 400px 列宽（原 1320px 三列布局），宽屏自动增加列数 */
export const APP_MODULE_PROJECT_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] gap-5";
