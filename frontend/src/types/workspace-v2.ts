import type { ProjectData } from "@/types/project";

/** 工作空间 2.0 — 短剧项目类型 */
export type WorkspaceV2DramaType = "novel" | "series" | "ad";

/** 工作空间 2.0 — 制作进度阶段（与后端 current_phase 约定一致） */
export type WorkspaceV2Progress =
  | "script_import"
  | "script_episoding"
  | "asset_generation"
  | "production"
  | "completed";

export const WORKSPACE_V2_PROGRESS_ORDER: WorkspaceV2Progress[] = [
  "script_import",
  "script_episoding",
  "asset_generation",
  "production",
  "completed",
];

export const WORKSPACE_V2_CONTENT_MODE_LABELS: Record<string, string> = {
  narration: "旁白模式",
  drama: "剧集模式",
  ad: "广告/短片模式",
};

export const WORKSPACE_V2_DRAMA_TYPE_LABELS: Record<WorkspaceV2DramaType, string> = {
  novel: "小说",
  series: "剧集",
  ad: "广告",
};

export const WORKSPACE_V2_PROGRESS_LABELS: Record<WorkspaceV2Progress, string> = {
  script_import: "剧情导入",
  script_episoding: "生成剧本",
  asset_generation: "生成资产",
  production: "制作分镜",
  completed: "已完成",
};

export interface WorkspaceV2Project {
  id: string;
  name: string;
  coverUrl: string | null;
  dramaType: WorkspaceV2DramaType;
  /** 后端 content_mode_label，用于卡片角标展示 */
  contentModeLabel: string;
  episodeCount: number;
  style: string;
  progress: WorkspaceV2Progress;
  updatedAt: string;
}

export interface WorkspaceV2ListParams {
  keyword?: string;
  dramaType?: WorkspaceV2DramaType | "";
  style?: string;
  progress?: WorkspaceV2Progress | "";
}

export interface WorkspaceV2ListResult {
  items: WorkspaceV2Project[];
  total: number;
}

/** 项目详情 — 主导航 */
export type WorkspaceV2DetailNavId =
  | "overview"
  | "asset-library"
  | "episode-management"
  | "production"
  | "completed";

/** 项目详情 — 资产库子导航 */
export type WorkspaceV2AssetSubNavId = "characters" | "scenes" | "props";

/** 剧集工作流步骤 */
export type WorkspaceV2EpisodeWorkflowStep =
  | "upload_script"
  | "worldview"
  | "generate_assets"
  | "storyboard_edit"
  | "render_export";

export const WORKSPACE_V2_EPISODE_WORKFLOW_ORDER: WorkspaceV2EpisodeWorkflowStep[] = [
  "upload_script",
  "worldview",
  "generate_assets",
  "storyboard_edit",
  "render_export",
];

export const WORKSPACE_V2_EPISODE_WORKFLOW_LABELS: Record<WorkspaceV2EpisodeWorkflowStep, string> = {
  upload_script: "上传剧集剧本",
  worldview: "设定世界观",
  generate_assets: "生成资产",
  storyboard_edit: "分镜编辑",
  render_export: "渲染导出视频",
};

export const WORKSPACE_V2_ASSET_SUB_NAV_LABELS: Record<WorkspaceV2AssetSubNavId, string> = {
  characters: "人物",
  scenes: "场景",
  props: "道具",
};

export interface WorkspaceV2AssetProgress {
  current: number;
  total: number;
}

export interface WorkspaceV2CostRow {
  estimated: string;
  actual: string | null;
}

export interface WorkspaceV2ProjectOverview {
  description: string;
  genre: string;
  theme: string;
  worldviewSetting: string;
  assetProgress: {
    characters: WorkspaceV2AssetProgress;
    scenes: WorkspaceV2AssetProgress;
    props: WorkspaceV2AssetProgress;
  };
  costs: {
    storyboard: WorkspaceV2CostRow;
    video: WorkspaceV2CostRow;
    total: WorkspaceV2CostRow;
  };
}

export interface WorkspaceV2Episode {
  id: string;
  title: string;
  episodeNumber: number;
  description: string;
  coverUrl: string | null;
  workflow: WorkspaceV2EpisodeWorkflowStep;
}

export interface WorkspaceV2ProjectDetail {
  id: string;
  name: string;
  /** 原始项目数据，用于编辑弹框预填 */
  sourceProject: ProjectData;
  contentModeLabel: string;
  dramaType: WorkspaceV2DramaType;
  /** 是否已生成项目概述（无概述时展示上传引导页） */
  hasOverview: boolean;
  overview: WorkspaceV2ProjectOverview | null;
  assetProgress: {
    characters: WorkspaceV2AssetProgress;
    scenes: WorkspaceV2AssetProgress;
    props: WorkspaceV2AssetProgress;
  };
  episodes: WorkspaceV2Episode[];
  assetFingerprints: Record<string, number>;
  /** 当前制作进度阶段 */
  progress: WorkspaceV2Progress;
}
