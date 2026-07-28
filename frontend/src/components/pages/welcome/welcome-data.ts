export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  video: string;
}

export interface FeaturedWork {
  id: string;
  title: string;
  author: string;
  duration?: string;
  video: string;
  featured?: boolean;
}

export interface TutorialItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  video: string;
}

export interface FeatureItem {
  id: string;
  /** 底部 Tab 标签文案 */
  title: string;
  /** 顶部主标题（随 Tab 切换） */
  headline: string;
  description: string;
  icon: "canvas" | "scissors" | "film" | "users";
  color: string;
}

/** 轮播文案（视频 URL 由 /api/resource/carousel 动态提供） */
export const HERO_SLIDE_COPY: Pick<HeroSlide, "title" | "subtitle" | "tagline">[] = [
  {
    title: "3D世界 × 3D导演台",
    subtitle: "AI 视频高度可控",
    tagline: "节点化编排 · 机位预览 · 一键成片",
  },
  {
    title: "智能分镜协作",
    subtitle: "从剧本到镜头",
    tagline: "层级管理 · 画布编辑 · 团队协同",
  },
  {
    title: "资产工厂",
    subtitle: "角色 · 场景 · 道具",
    tagline: "统一资产库 · 跨项目复用 · 版本追踪",
  },
  {
    title: "专业级剪辑预览",
    subtitle: "时间轴 · 参考视频",
    tagline: "所见即所得 · 多格式导出 · 审阅协作",
  },
  {
    title: "AI 短剧梦工厂",
    subtitle: "降低创作门槛",
    tagline: "脚本生成 · 分镜拆解 · 智能流水线",
  },
  {
    title: "一键成片预览",
    subtitle: "从分镜到交付",
    tagline: "多版本对比 · 审阅批注 · 快速导出",
  },
  {
    title: "昭月照山河",
    subtitle: "史诗叙事 · 电影质感",
    tagline: "大场景调度 · 氛围光影 · 情绪叙事",
  },
  {
    title: "AI 协同创作",
    subtitle: "团队共创 · 实时迭代",
    tagline: "多人协作 · 版本管理 · 资产共享",
  },
];

export const WELCOME_CTA_BUTTON = "即刻开启创作";

export const FEATURES: FeatureItem[] = [
  {
    id: "f1",
    title: "工作流一站式生成",
    headline: "AI影视工业化 · 一站式短剧创作引擎",
    description:
      "打通剧本、分镜、3D场景、视频渲染全链路，可视化画布驱动全流程创作，单人/团队均可高效产出院线级AI短剧内容",
    icon: "canvas",
    color: "oklch(0.72 0.14 240)",
  },
  {
    id: "f2",
    title: "电影级实时画面预演引擎",
    headline: "实时电影级预演 · 所见即所得",
    description:
      "内置3D实时渲染导演台，镜头运镜、光影、场景同步预览，无需等待渲染即可提前把控成片画面质感，大幅降低反复修改成本",
    icon: "scissors",
    color: "oklch(0.78 0.12 195)",
  },
  {
    id: "f3",
    title: "多规格成片批量导出交付",
    headline: "多渠道批量成片导出交付",
    description:
      "支持竖屏短剧、横屏院线、短视频比例一键切换渲染，批量导出高清成片、分镜工程源文件，适配平台投放、客户交付全场景需求",
    icon: "film",
    color: "oklch(0.80 0.12 75)",
  },
  {
    id: "f4",
    title: "多人云端协同版本管理",
    headline: "云端多人协同创作与版本管控",
    description:
      "团队在线同步编辑剧本与分镜，自动保存历史版本、支持批注评审、权限分级管理，异地团队无缝协作，避免文件来回传输混乱",
    icon: "users",
    color: "oklch(0.76 0.09 295)",
  },
];

export const TUTORIALS: TutorialItem[] = [
  {
    id: "t1",
    title: "输出高度可控的参考图，告别视频抽卡",
    description: "图生模型，混合权重和机位，作为站位参考图",
    duration: "03:18",
    video: "",
  },
  {
    id: "t2",
    title: "3D世界 + 3D导演台 全流程讲解",
    description: "从场景搭建到镜头调度，完整工作流演示",
    duration: "08:42",
    video: "",
  },
  {
    id: "t3",
    title: "AI 短剧快速入门",
    description: "零基础 15 分钟创建第一个 AI 短剧项目",
    duration: "15:06",
    video: "",
  },
  {
    id: "t4",
    title: "团队数据分析与资产协作",
    description: "项目进度追踪、资产复用与团队权限管理",
    duration: "00:27",
    video: "",
  },
];

/** 视频流展示用：双倍列表以实现无缝循环滚动 */
export function doubledWorks(works: FeaturedWork[]): FeaturedWork[] {
  return works.map((w, i) => ({ ...w, id: `${w.id}-a-${i}` })).concat(
    works.map((w, i) => ({ ...w, id: `${w.id}-b-${i}` })),
  );
}

