import type { WorkspaceV2CreateForm } from "@/components/workspace-v2/WorkspaceV2CreateProjectModal";
import { parseStoryboardSystemPromptTemplates } from "@/components/workspace-v2/project-detail/storyboard-production";
import { DEFAULT_TEMPLATE_ID } from "@/data/style-templates";
import {
  WORKSPACE_V2_SHOT_DURATION,
  type WorkspaceV2AspectRatio,
  type WorkspaceV2CreationMode,
  type WorkspaceV2ImageResolution,
  type WorkspaceV2ScriptAdaptation,
  type WorkspaceV2VideoResolution,
} from "@/data/workspace-v2-create-options";
import { normalizeAssetPromptTemplate } from "@/utils/asset-prompt-template";
import type { SegmentCost } from "@/types/cost";
import type {
  AspectRatio,
  AssetSheetStatus,
  Character,
  EpisodeMeta,
  ProjectData,
  ProjectOverview,
  ProjectStatus,
  Prop,
  Scene,
} from "@/types/project";
import type { TaskItem, TaskStats } from "@/types/task";
import {
  WORKSPACE_V2_CONTENT_MODE_LABELS,
  WORKSPACE_V2_DRAMA_TYPE_LABELS,
  type WorkspaceV2DramaType,
  type WorkspaceV2ListParams,
  type WorkspaceV2ListResult,
  type WorkspaceV2Progress,
  type WorkspaceV2Project,
  type WorkspaceV2ProjectDetail,
  type WorkspaceV2ProjectOverview,
} from "@/types/workspace-v2";
import { WORKSPACE_V2_API_BASE, resolveWorkspaceV2MediaUrl } from "@/utils/app-base";
import {
  requestWorkspaceV2,
  throwIfWorkspaceV2NotOk,
  withWorkspaceV2Auth,
} from "./workspace-v2-client";

/** 工作空间 2.0 后端项目列表项（GET /projects） */
interface WorkspaceV2ApiProjectSummary {
  project_id: string;
  /** 旧版列表字段，兼容过渡期 */
  name?: string;
  title: string;
  style: string;
  thumbnail: string | null;
  content_mode?: string;
  content_mode_label?: string;
  episodes_count?: number;
  current_phase_label?: string;
  status?: { current_phase?: string };
  metadata?: { updated_at?: string };
}

export interface WorkspaceV2CreateProjectPayload {
  title: string;
  name?: string | null;
  content_mode?: "narration" | "drama" | "ad";
  source_kind?: "novel" | "screenplay" | null;
  episode_rewrite_mode?: "ai_rewrite" | "original" | null;
  aspect_ratio?: "9:16" | "16:9";
  style_template_id?: string | null;
  default_duration?: number | null;
  text_backend_script?: string | null;
  image_provider_t2i?: string | null;
  image_provider_i2i?: string | null;
  video_backend?: string | null;
  model_settings?: Record<string, { resolution?: string | null }>;
}

export type WorkspaceV2UpdateProjectPayload = Omit<WorkspaceV2CreateProjectPayload, "title">;

export interface WorkspaceV2UpdateProjectResponse {
  success: boolean;
  project: ProjectData;
}

export interface WorkspaceV2CreateProjectResponse {
  success: boolean;
  project_id: string;
  project?: ProjectData;
  /** 旧版创建响应字段 */
  name?: string;
}

export interface WorkspaceV2DeleteProjectResponse {
  success: boolean;
  message?: string;
}

export type WorkspaceV2StyleTemplateCategory = "live" | "anim";

export interface WorkspaceV2StyleTemplate {
  id: string;
  category: WorkspaceV2StyleTemplateCategory;
  /** 接口返回的展示名，原样展示，不做 i18n */
  name: string;
  prompt: string;
}

export interface WorkspaceV2StyleTemplatesResult {
  live: WorkspaceV2StyleTemplate[];
  anim: WorkspaceV2StyleTemplate[];
}

interface WorkspaceV2ApiStyleTemplateItem {
  id: string;
  name?: string | null;
  prompt?: string | null;
}

interface WorkspaceV2ApiStyleTemplatesResponse {
  live?: WorkspaceV2ApiStyleTemplateItem[];
  anim?: WorkspaceV2ApiStyleTemplateItem[];
}

const PHASE_LABEL_TO_PROGRESS: Record<string, WorkspaceV2Progress> = {
  剧情导入: "script_import",
  剧本导入: "script_import",
  生成剧本: "script_episoding",
  剧本分集: "script_episoding",
  生成资产: "asset_generation",
  资产生成: "asset_generation",
  制作分镜: "production",
  分镜生视频: "production",
  视频导出: "completed",
  已完成: "completed",
  // 过渡期兼容旧标签
  剧情分镜: "script_episoding",
  剧情生图: "script_episoding",
  剧情生视频: "production",
};

const PHASE_TO_PROGRESS: Record<string, WorkspaceV2Progress> = {
  script_import: "script_import",
  script_episoding: "script_episoding",
  asset_generation: "asset_generation",
  production: "production",
  completed: "completed",
  // 过渡期兼容旧 current_phase
  setup: "script_import",
  plot_import: "script_import",
  scripting: "script_episoding",
  worldbuilding: "asset_generation",
  storyboard: "script_episoding",
  image_gen: "script_episoding",
  video_gen: "production",
};

function mapContentModeToDramaType(contentMode?: string): WorkspaceV2DramaType {
  if (contentMode === "ad") return "ad";
  if (contentMode === "drama") return "series";
  return "novel";
}

function mapProgress(summary: WorkspaceV2ApiProjectSummary): WorkspaceV2Progress {
  const label = summary.current_phase_label?.trim();
  if (label && PHASE_LABEL_TO_PROGRESS[label]) {
    return PHASE_LABEL_TO_PROGRESS[label];
  }
  const phase = summary.status?.current_phase;
  if (phase && PHASE_TO_PROGRESS[phase]) {
    return PHASE_TO_PROGRESS[phase];
  }
  return "script_import";
}

function mapProgressFromProject(project: ProjectData): WorkspaceV2Progress {
  const phase = project.status?.current_phase as string | undefined;
  if (phase && PHASE_TO_PROGRESS[phase]) {
    return PHASE_TO_PROGRESS[phase];
  }
  return "script_import";
}

function resolveWorkspaceV2ProjectId(
  summary: Pick<WorkspaceV2ApiProjectSummary, "project_id"> & { name?: string },
): string {
  return summary.project_id?.trim() || summary.name?.trim() || "";
}

function mapProjectSummary(summary: WorkspaceV2ApiProjectSummary): WorkspaceV2Project {
  const dramaType = mapContentModeToDramaType(summary.content_mode);
  const projectId = resolveWorkspaceV2ProjectId(summary);
  return {
    id: projectId,
    name: summary.title?.trim() || projectId,
    coverUrl: resolveWorkspaceV2MediaUrl(summary.thumbnail) ?? null,
    dramaType,
    contentModeLabel:
      summary.content_mode_label?.trim() || WORKSPACE_V2_DRAMA_TYPE_LABELS[dramaType],
    episodeCount: summary.episodes_count ?? 0,
    style: summary.style?.trim() || "未设置",
    progress: mapProgress(summary),
    updatedAt: summary.metadata?.updated_at ?? "",
  };
}

function filterProjectsLocally(
  projects: WorkspaceV2Project[],
  params: WorkspaceV2ListParams,
): WorkspaceV2Project[] {
  const dramaType = params.dramaType ?? "";
  const progress = params.progress ?? "";

  return projects.filter((project) => {
    if (dramaType && project.dramaType !== dramaType) return false;
    if (progress && project.progress !== progress) return false;
    return true;
  });
}

function resolveWorkspaceV2AspectRatio(
  aspectRatio?: string | AspectRatio,
): WorkspaceV2AspectRatio {
  if (typeof aspectRatio === "string") {
    return aspectRatio === "9:16" ? "9:16" : "16:9";
  }
  const storyboard = aspectRatio?.storyboard;
  if (typeof storyboard === "string") {
    return storyboard === "9:16" ? "9:16" : "16:9";
  }
  return "16:9";
}

function mapProjectContentModeToCreationMode(contentMode?: string): WorkspaceV2CreationMode {
  if (contentMode === "drama") return "series";
  return "narration";
}

function mapProjectSourceKindToScriptAdaptation(
  sourceKind?: string | null,
  episodeRewriteMode?: string | null,
): WorkspaceV2ScriptAdaptation {
  if (episodeRewriteMode === "original" || episodeRewriteMode === "ai_rewrite") {
    return episodeRewriteMode;
  }
  return sourceKind === "screenplay" ? "original" : "ai_rewrite";
}

function readModelResolution<T extends string>(
  modelSettings: ProjectData["model_settings"] | undefined,
  modelId: string,
  fallback: T,
): T {
  const resolution = modelSettings?.[modelId]?.resolution?.trim();
  return (resolution as T | undefined) ?? fallback;
}

/** 将 GET 项目详情中的 ProjectData 映射为新建/编辑表单初始值。 */
export function workspaceV2FormFromProject(project: ProjectData): WorkspaceV2CreateForm {
  const imageModel = project.image_provider_t2i?.trim() ?? "";
  const imageModelI2I = project.image_provider_i2i?.trim() ?? "";
  const videoModel = project.video_backend?.trim() ?? "";

  return {
    projectName: project.title?.trim() || "",
    creationMode: mapProjectContentModeToCreationMode(project.content_mode),
    scriptAdaptation: mapProjectSourceKindToScriptAdaptation(
      project.source_kind,
      project.episode_rewrite_mode,
    ),
    aspectRatio: resolveWorkspaceV2AspectRatio(project.aspect_ratio),
    visualStyleId: project.style_template_id?.trim() || DEFAULT_TEMPLATE_ID,
    textModel: project.text_backend_script?.trim() ?? "",
    imageModel,
    imageModelI2I,
    videoModel,
    imageResolution: readModelResolution(
      project.model_settings,
      imageModel,
      "1k" as WorkspaceV2ImageResolution,
    ),
    videoResolution: readModelResolution(
      project.model_settings,
      videoModel,
      "1080p" as WorkspaceV2VideoResolution,
    ),
    shotDurationSec: project.default_duration ?? WORKSPACE_V2_SHOT_DURATION.default,
  };
}

export function buildWorkspaceV2CreatePayload(
  form: WorkspaceV2CreateForm,
): WorkspaceV2CreateProjectPayload {
  const isSeries = form.creationMode === "series";
  const modelSettings: Record<string, { resolution?: string | null }> = {};

  if (form.imageModel && form.imageResolution) {
    modelSettings[form.imageModel] = { resolution: form.imageResolution };
  }
  if (form.imageModelI2I && form.imageResolution) {
    modelSettings[form.imageModelI2I] = { resolution: form.imageResolution };
  }
  if (form.videoModel && form.videoResolution) {
    modelSettings[form.videoModel] = { resolution: form.videoResolution };
  }

  const imageProviderI2I = form.imageModelI2I.trim();

  return {
    title: form.projectName.trim(),
    content_mode: isSeries ? "drama" : "narration",
    ...(isSeries
      ? {
          source_kind: form.scriptAdaptation === "original" ? "screenplay" : "novel",
          episode_rewrite_mode: form.scriptAdaptation,
        }
      : {}),
    aspect_ratio: form.aspectRatio,
    style_template_id: form.visualStyleId,
    default_duration: form.shotDurationSec,
    text_backend_script: form.textModel,
    image_provider_t2i: form.imageModel,
    ...(imageProviderI2I ? { image_provider_i2i: imageProviderI2I } : {}),
    video_backend: form.videoModel,
    ...(Object.keys(modelSettings).length > 0 ? { model_settings: modelSettings } : {}),
  };
}

export function buildWorkspaceV2UpdatePayload(
  form: WorkspaceV2CreateForm,
): WorkspaceV2UpdateProjectPayload {
  const {
    title: _title,
    content_mode: _contentMode,
    source_kind: _sourceKind,
    episode_rewrite_mode: _episodeRewriteMode,
    ...payload
  } = buildWorkspaceV2CreatePayload(form);
  return payload;
}

function mapStyleTemplateCategory(
  category: WorkspaceV2StyleTemplateCategory,
  items: WorkspaceV2ApiStyleTemplateItem[] | undefined,
): WorkspaceV2StyleTemplate[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    category,
    name: item.name?.trim() || item.id,
    prompt: item.prompt?.trim() ?? "",
  }));
}

/** GET /api/v1/style-templates — 获取风格模板（按类别分组） */
export async function fetchWorkspaceV2StyleTemplates(): Promise<WorkspaceV2StyleTemplatesResult> {
  const body = await requestWorkspaceV2<WorkspaceV2ApiStyleTemplatesResponse>("/style-templates");

  return {
    live: mapStyleTemplateCategory("live", body.live),
    anim: mapStyleTemplateCategory("anim", body.anim),
  };
}

export function flattenWorkspaceV2StyleTemplates(
  result: WorkspaceV2StyleTemplatesResult,
): WorkspaceV2StyleTemplate[] {
  return [...result.live, ...result.anim];
}

/** GET /api/v1/projects — 获取项目列表 */
export async function fetchWorkspaceV2Projects(
  params: WorkspaceV2ListParams = {},
): Promise<WorkspaceV2ListResult> {
  const search = new URLSearchParams();
  const keyword = params.keyword?.trim();
  if (keyword) search.set("query", keyword);
  if (params.style) search.set("style", params.style);
  // status 传进度 key（如 asset_generation），不再传中文标签
  if (params.progress) search.set("status", params.progress);

  const query = search.toString();
  const body = await requestWorkspaceV2<{ projects: WorkspaceV2ApiProjectSummary[] }>(
    `/projects${query ? `?${query}` : ""}`,
  );

  const mapped = (body.projects ?? []).map(mapProjectSummary);
  const items = filterProjectsLocally(mapped, params);

  return {
    items,
    total: items.length,
  };
}

/** POST /api/v1/projects — 新建项目 */
export async function createWorkspaceV2Project(
  payload: WorkspaceV2CreateProjectPayload,
): Promise<WorkspaceV2CreateProjectResponse> {
  return requestWorkspaceV2<WorkspaceV2CreateProjectResponse>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/v1/projects/{project_id} — 更新项目配置 */
export async function updateWorkspaceV2Project(
  projectId: string,
  payload: WorkspaceV2UpdateProjectPayload,
): Promise<WorkspaceV2UpdateProjectResponse> {
  return requestWorkspaceV2<WorkspaceV2UpdateProjectResponse>(
    `/projects/${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

/** DELETE /api/v1/projects/{project_id} — 删除项目 */
export async function deleteWorkspaceV2Project(
  projectId: string,
): Promise<WorkspaceV2DeleteProjectResponse> {
  return requestWorkspaceV2<WorkspaceV2DeleteProjectResponse>(
    `/projects/${encodeURIComponent(projectId)}`,
    { method: "DELETE" },
  );
}


interface WorkspaceV2GetProjectResponse {
  project: ProjectData;
  scripts: Record<string, unknown>;
  asset_fingerprints?: Record<string, number>;
}

function mapAssetProgress(status?: ProjectStatus) {
  return {
    characters: {
      current: status?.characters.completed ?? 0,
      total: status?.characters.total ?? 0,
    },
    scenes: {
      current: status?.scenes.completed ?? 0,
      total: status?.scenes.total ?? 0,
    },
    props: {
      current: status?.props.completed ?? 0,
      total: status?.props.total ?? 0,
    },
  };
}

function mapOverview(overview: ProjectOverview, status?: ProjectStatus): WorkspaceV2ProjectOverview {
  return {
    description: overview.synopsis?.trim() ?? "",
    genre: overview.genre?.trim() ?? "",
    theme: overview.theme?.trim() ?? "",
    worldviewSetting: overview.world_setting?.trim() ?? "",
    assetProgress: mapAssetProgress(status),
    costs: {
      storyboard: { estimated: "—", actual: null },
      video: { estimated: "—", actual: null },
      total: { estimated: "—", actual: null },
    },
  };
}

function mapEpisode(episode: EpisodeMeta) {
  return {
    id: `ep-${episode.episode}`,
    title: episode.title,
    episodeNumber: episode.episode,
    description: episode.title,
    coverUrl: null,
    workflow: "upload_script" as const,
  };
}

/** 将 GET /projects/{project_id} 响应映射为工作空间 2.0 项目详情。 */
export function mapWorkspaceV2ProjectDetail(
  projectId: string,
  response: WorkspaceV2GetProjectResponse,
): WorkspaceV2ProjectDetail {
  const project = response.project;
  const resolvedId = project.project_id?.trim() || projectId;
  const assetProgress = mapAssetProgress(project.status);

  return {
    id: resolvedId,
    name: project.title?.trim() || resolvedId,
    sourceProject: project,
    contentModeLabel:
      WORKSPACE_V2_CONTENT_MODE_LABELS[project.content_mode] ?? project.content_mode,
    dramaType: mapContentModeToDramaType(project.content_mode),
    hasOverview: Boolean(project.overview),
    overview: project.overview ? mapOverview(project.overview, project.status) : null,
    assetProgress,
    episodes: (project.episodes ?? []).map(mapEpisode),
    assetFingerprints: response.asset_fingerprints ?? {},
    progress: mapProgressFromProject(project),
  };
}

/** 项目是否应展示上传引导页（与老工作空间 OverviewCanvas 一致）。 */
export function workspaceV2NeedsWelcomeUpload(detail: WorkspaceV2ProjectDetail): boolean {
  return !detail.hasOverview && detail.episodes.length === 0;
}

/** GET /api/v1/projects/{project_id} — 获取项目详情（含实时计算字段） */
export async function fetchWorkspaceV2ProjectDetail(
  projectId: string,
): Promise<WorkspaceV2ProjectDetail> {
  const body = await requestWorkspaceV2<WorkspaceV2GetProjectResponse>(
    `/projects/${encodeURIComponent(projectId)}`,
  );
  return mapWorkspaceV2ProjectDetail(projectId, body);
}

// ==================== 资产库（人物 / 场景 / 道具） ====================

export function getWorkspaceV2FileUrl(
  projectId: string,
  path: string,
  cacheBust?: number | string | null,
): string {
  const base = `${WORKSPACE_V2_API_BASE}/files/${encodeURIComponent(projectId)}/${path}`;
  if (cacheBust == null || cacheBust === "") {
    return base;
  }
  return `${base}?v=${encodeURIComponent(String(cacheBust))}`;
}

/**
 * 分镜图/视频路径解析。
 * 后端常见两种形态：
 * 1. 绝对接口路径 `/api/v1/files/...`（需 rewrite 到 ws2）
 * 2. 项目内相对路径 `storyboards/E1S01.png`（与老版一致，需拼 `/api/ws2/v1/files/{projectId}/...`）
 */
export function resolveWorkspaceV2ShotMediaUrl(
  projectId: string | null | undefined,
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  if (
    /^(blob:|data:|https?:)/i.test(trimmed) ||
    trimmed.startsWith("/api/") ||
    trimmed.startsWith("/media/")
  ) {
    return resolveWorkspaceV2MediaUrl(trimmed);
  }

  const project = projectId?.trim();
  if (!project) {
    return resolveWorkspaceV2MediaUrl(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
  }

  const relative = trimmed.replace(/^\/+/, "");
  if (!relative) return undefined;
  return getWorkspaceV2FileUrl(project, relative);
}

export async function uploadWorkspaceV2File(
  projectId: string,
  uploadType: string,
  file: File,
  name: string | null = null,
): Promise<{ success: boolean; path: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const qs = name ? `?name=${encodeURIComponent(name)}` : "";
  const url = `${WORKSPACE_V2_API_BASE}/projects/${encodeURIComponent(projectId)}/upload/${uploadType}${qs}`;
  const authOptions = withWorkspaceV2Auth({ method: "POST", body: formData });
  const headers = new Headers(authOptions.headers);
  headers.delete("Content-Type");
  const response = await fetch(url, { ...authOptions, headers });
  await throwIfWorkspaceV2NotOk(response, "上传失败");
  return (await response.json()) as { success: boolean; path: string; url: string };
}

export async function addWorkspaceV2Character(
  projectId: string,
  name: string,
  description: string,
  voiceStyle = "",
): Promise<{ success: boolean }> {
  return requestWorkspaceV2(`/projects/${encodeURIComponent(projectId)}/characters`, {
    method: "POST",
    body: JSON.stringify({ name, description, voice_style: voiceStyle }),
  });
}

export async function updateWorkspaceV2Character(
  projectId: string,
  charName: string,
  updates: Record<string, unknown>,
): Promise<{ success: boolean }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/characters/${encodeURIComponent(charName)}`,
    { method: "PATCH", body: JSON.stringify(updates) },
  );
}

export async function generateWorkspaceV2Character(
  projectId: string,
  charName: string,
  prompt: string,
): Promise<{ success: boolean; task_id: string; message: string }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/character/${encodeURIComponent(charName)}`,
    { method: "POST", body: JSON.stringify({ prompt }) },
  );
}

export async function addWorkspaceV2Scene(
  projectId: string,
  name: string,
  description: string,
): Promise<{ success: boolean }> {
  return requestWorkspaceV2(`/projects/${encodeURIComponent(projectId)}/scenes`, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function updateWorkspaceV2Scene(
  projectId: string,
  sceneName: string,
  updates: Record<string, unknown>,
): Promise<{ success: boolean }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneName)}`,
    { method: "PATCH", body: JSON.stringify(updates) },
  );
}

export async function generateWorkspaceV2Scene(
  projectId: string,
  sceneName: string,
  prompt: string,
): Promise<{ success: boolean; task_id: string; message: string }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/scene/${encodeURIComponent(sceneName)}`,
    { method: "POST", body: JSON.stringify({ prompt }) },
  );
}

export async function addWorkspaceV2Prop(
  projectId: string,
  name: string,
  description: string,
): Promise<{ success: boolean }> {
  return requestWorkspaceV2(`/projects/${encodeURIComponent(projectId)}/props`, {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function updateWorkspaceV2Prop(
  projectId: string,
  propName: string,
  updates: Record<string, unknown>,
): Promise<{ success: boolean }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/props/${encodeURIComponent(propName)}`,
    { method: "PATCH", body: JSON.stringify(updates) },
  );
}

export async function generateWorkspaceV2Prop(
  projectId: string,
  propName: string,
  prompt: string,
): Promise<{ success: boolean; task_id: string; message: string }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/prop/${encodeURIComponent(propName)}`,
    { method: "POST", body: JSON.stringify({ prompt }) },
  );
}

/** 与老版一致：`episode_N.json` */
export function workspaceV2EpisodeScriptFile(episodeNumber: number): string {
  return `episode_${Math.max(1, Math.floor(episodeNumber))}.json`;
}

/**
 * 生成单镜分镜图 — 路径/入参与老版一致，走 1242（`/api/ws2/v1`）。
 * POST /projects/{id}/generate/storyboard/{segmentId}
 */
export async function generateWorkspaceV2Storyboard(
  projectId: string,
  segmentId: string,
  prompt: string | Record<string, unknown>,
  scriptFile: string,
): Promise<{ success: boolean; task_id: string; message: string }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/storyboard/${encodeURIComponent(segmentId)}`,
    {
      method: "POST",
      body: JSON.stringify({ prompt, script_file: scriptFile }),
    },
  );
}

/**
 * 生成单镜分镜视频 — 路径/入参与老版一致，走 1242（`/api/ws2/v1`）。
 * POST /projects/{id}/generate/video/{segmentId}
 */
export async function generateWorkspaceV2Video(
  projectId: string,
  segmentId: string,
  prompt: string | Record<string, unknown>,
  scriptFile: string,
  durationSeconds: number = 4,
): Promise<{ success: boolean; task_id: string; message: string }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/video/${encodeURIComponent(segmentId)}`,
    {
      method: "POST",
      body: JSON.stringify({
        prompt,
        script_file: scriptFile,
        duration_seconds: durationSeconds,
      }),
    },
  );
}

export interface WorkspaceV2StoryboardBatchRequest {
  script_file?: string | null;
  episode?: number | null;
  segment_ids?: string[] | null;
}

export interface WorkspaceV2VideoBatchRequest {
  script_file?: string | null;
  episode?: number | null;
  segment_ids?: string[] | null;
  duration_seconds?: number | null;
  seed?: number | null;
}

/**
 * 批量生成分镜图 — POST /projects/{id}/generate/storyboard-batch
 * @see http://your-server:1242/docs#/视频生成-生成任务/generate_storyboard_batch_api_v1_projects__project_id__generate_storyboard_batch_post
 */
export async function generateWorkspaceV2StoryboardBatch(
  projectId: string,
  payload: WorkspaceV2StoryboardBatchRequest,
): Promise<WorkspaceV2BatchGenerateResult> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/storyboard-batch`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

/**
 * 批量生成分镜视频 — POST /projects/{id}/generate/video-batch
 * @see http://your-server:1242/docs#/视频生成-生成任务/generate_video_batch_api_v1_projects__project_id__generate_video_batch_post
 */
export async function generateWorkspaceV2VideoBatch(
  projectId: string,
  payload: WorkspaceV2VideoBatchRequest,
): Promise<WorkspaceV2BatchGenerateResult> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/video-batch`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

/**
 * 授权单镜分镜 — POST /projects/{id}/storyboards/{segmentId}/upload
 */
export async function uploadWorkspaceV2Storyboard(
  projectId: string,
  segmentId: string,
): Promise<{ success: boolean; task_id?: string; message?: string }> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/storyboards/${encodeURIComponent(segmentId)}/upload`,
    { method: "POST" },
  );
}

/**
 * 批量授权分镜 — POST /projects/{id}/storyboards/upload
 * 同步接口：等待完成后返回 message（如「批量上传完成，成功 N 张…」），非异步队列任务。
 */
export async function uploadWorkspaceV2StoryboardsBatch(
  projectId: string,
  segmentIds: string[],
): Promise<{
  success?: boolean;
  code?: number;
  message?: string;
  task_ids?: string[];
  data?: Array<{ success?: boolean; segment_id?: string; asset_id?: string }>;
}> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/storyboards/upload`,
    {
      method: "POST",
      body: JSON.stringify({ segment_ids: segmentIds }),
    },
  );
}

/** 批量生成设计图（不传 names / 无 body 则后端自动选择未出图资产） */
export interface WorkspaceV2BatchGenerateRequest {
  names?: string[] | null;
}

export interface WorkspaceV2BatchGenerateResult {
  success: boolean;
  message?: string;
  task_id?: string;
  taskId?: string;
  task_ids?: string[];
  taskIds?: string[];
}

export function resolveWorkspaceV2BatchGenerateTaskIds(
  result: WorkspaceV2BatchGenerateResult,
): string[] {
  const ids: string[] = [];
  const single = result.task_id ?? result.taskId;
  if (typeof single === "string" && single.trim()) ids.push(single.trim());
  const many = result.task_ids ?? result.taskIds;
  if (Array.isArray(many)) {
    for (const item of many) {
      if (typeof item === "string" && item.trim()) ids.push(item.trim());
    }
  }
  return [...new Set(ids)];
}

/** 无有效 names 时不带 body（后端对 `{}` 会当成无可提交，返回 no_tasks_submitted） */
function workspaceV2BatchGenerateInit(
  payload: WorkspaceV2BatchGenerateRequest = {},
): RequestInit {
  const names = Array.isArray(payload.names)
    ? payload.names.map((name) => name.trim()).filter(Boolean)
    : [];
  if (names.length === 0) {
    return { method: "POST" };
  }
  return { method: "POST", body: JSON.stringify({ names }) };
}

export async function generateWorkspaceV2CharacterBatch(
  projectId: string,
  payload: WorkspaceV2BatchGenerateRequest = {},
): Promise<WorkspaceV2BatchGenerateResult> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/character-batch`,
    workspaceV2BatchGenerateInit(payload),
  );
}

export async function generateWorkspaceV2SceneBatch(
  projectId: string,
  payload: WorkspaceV2BatchGenerateRequest = {},
): Promise<WorkspaceV2BatchGenerateResult> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/scene-batch`,
    workspaceV2BatchGenerateInit(payload),
  );
}

export async function generateWorkspaceV2PropBatch(
  projectId: string,
  payload: WorkspaceV2BatchGenerateRequest = {},
): Promise<WorkspaceV2BatchGenerateResult> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/generate/prop-batch`,
    workspaceV2BatchGenerateInit(payload),
  );
}

export async function listWorkspaceV2Tasks(
  projectId: string,
  pageSize = 200,
): Promise<{ items: TaskItem[]; total: number; page: number; page_size: number }> {
  const params = new URLSearchParams({
    project_name: projectId,
    page_size: String(pageSize),
  });
  return requestWorkspaceV2(`/tasks?${params.toString()}`);
}

/** @deprecated 工作空间 2.0 前端已从 tasks 列表本地聚合 stats，不再轮询此接口 */
export async function getWorkspaceV2TaskStats(
  projectId: string,
): Promise<{ stats: TaskStats }> {
  const params = new URLSearchParams({ project_name: projectId });
  return requestWorkspaceV2(`/tasks/stats?${params.toString()}`);
}

/** POST /api/v1/projects/{project_id}/source — 上传源文件或提交文本 */
export interface WorkspaceV2SetSourceResult {
  success?: boolean;
  filename?: string;
  used_encoding?: string | null;
  chapter_count?: number;
}

export async function setWorkspaceV2ProjectSource(
  projectId: string,
  file: File,
): Promise<WorkspaceV2SetSourceResult> {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${WORKSPACE_V2_API_BASE}/projects/${encodeURIComponent(projectId)}/source`;
  const authOptions = withWorkspaceV2Auth({ method: "POST", body: formData });
  const headers = new Headers(authOptions.headers);
  headers.delete("Content-Type");

  const response = await fetch(url, { ...authOptions, headers });
  await throwIfWorkspaceV2NotOk(response, "上传失败");
  return (await response.json()) as WorkspaceV2SetSourceResult;
}

/** @deprecated 使用 setWorkspaceV2ProjectSource */
export type WorkspaceV2UploadSourceResult = WorkspaceV2SetSourceResult;

/** 上传小说源文件（不触发 AI 分析，需用户手动点击「开始 AI 分析」） */
export async function uploadWorkspaceV2SourceFile(
  projectId: string,
  file: File,
): Promise<WorkspaceV2SetSourceResult> {
  return setWorkspaceV2ProjectSource(projectId, file);
}

/** POST /api/v1/projects/{project_id}/generate-overview — AI 生成项目概述 */
export async function generateWorkspaceV2Overview(
  projectId: string,
): Promise<{ success: boolean; overview: ProjectOverview }> {
  return requestWorkspaceV2<{ success: boolean; overview: ProjectOverview }>(
    `/projects/${encodeURIComponent(projectId)}/generate-overview`,
    { method: "POST" },
  );
}

/** PATCH /api/v1/projects/{project_id}/overview — 手动更新项目概述 */
export async function updateWorkspaceV2Overview(
  projectId: string,
  updates: Partial<Pick<ProjectOverview, "synopsis" | "genre" | "theme" | "world_setting">>,
): Promise<{ success: boolean }> {
  return requestWorkspaceV2<{ success: boolean }>(
    `/projects/${encodeURIComponent(projectId)}/overview`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
  );
}

/** GET /api/v1/projects/{project_id}/overview — script_import 节点专用概要 */
export interface WorkspaceV2ScriptImportOverviewResponse {
  title?: string;
  /** 未生成时后端可能返回空对象 `{}` */
  overview?: Partial<ProjectOverview> | Record<string, never> | null;
  world_setting?: string;
  source_files?: WorkspaceV2ProjectSourceFile[];
  source_text?: string;
}

export function workspaceV2ScriptImportHasOverview(
  data: WorkspaceV2ScriptImportOverviewResponse | null | undefined,
): boolean {
  const nested = data?.overview;
  const synopsis =
    nested && typeof nested === "object" && "synopsis" in nested
      ? String(nested.synopsis ?? "").trim()
      : "";
  const genre =
    nested && typeof nested === "object" && "genre" in nested
      ? String(nested.genre ?? "").trim()
      : "";
  const theme =
    nested && typeof nested === "object" && "theme" in nested
      ? String(nested.theme ?? "").trim()
      : "";
  const worldFromNested =
    nested && typeof nested === "object" && "world_setting" in nested
      ? String(nested.world_setting ?? "").trim()
      : "";
  const world = worldFromNested || String(data?.world_setting ?? "").trim();
  return Boolean(synopsis || genre || theme || world);
}

export function mapWorkspaceV2ScriptImportOverview(
  data: WorkspaceV2ScriptImportOverviewResponse,
): {
  title: string;
  description: string;
  genre: string;
  theme: string;
  worldviewSetting: string;
  sourceFiles: WorkspaceV2ProjectSourceFile[];
  sourceText: string;
} {
  const nested = data.overview && typeof data.overview === "object" ? data.overview : {};
  const worldFromNested =
    "world_setting" in nested ? String(nested.world_setting ?? "").trim() : "";
  return {
    title: String(data.title ?? "").trim(),
    description:
      "synopsis" in nested ? String(nested.synopsis ?? "").trim() : "",
    genre: "genre" in nested ? String(nested.genre ?? "").trim() : "",
    theme: "theme" in nested ? String(nested.theme ?? "").trim() : "",
    worldviewSetting: worldFromNested || String(data.world_setting ?? "").trim(),
    sourceFiles: Array.isArray(data.source_files) ? data.source_files : [],
    sourceText: String(data.source_text ?? ""),
  };
}

/** GET /api/v1/projects/{project_id}/overview — 获取剧情导入节点概要 */
export async function fetchWorkspaceV2ProjectOverview(
  projectId: string,
): Promise<WorkspaceV2ScriptImportOverviewResponse> {
  return requestWorkspaceV2<WorkspaceV2ScriptImportOverviewResponse>(
    `/projects/${encodeURIComponent(projectId)}/overview`,
  );
}

/** GET /api/v1/projects/{project_name}/assets — 生成资产节点专用资产列表 */
export interface WorkspaceV2AssetPromptTemplate {
  layout?: string;
  guard?: string;
  negative?: string;
  [key: string]: unknown;
}

export interface WorkspaceV2AssetCharacterItem {
  name: string;
  description?: string;
  voice_style?: string;
  character_sheet?: string;
  reference_image?: string;
  status?: string;
  prompt_template?: WorkspaceV2AssetPromptTemplate;
}

export interface WorkspaceV2AssetSceneItem {
  name: string;
  description?: string;
  scene_sheet?: string;
  status?: string;
  prompt_template?: WorkspaceV2AssetPromptTemplate;
}

export interface WorkspaceV2AssetPropItem {
  name: string;
  description?: string;
  prop_sheet?: string;
  status?: string;
  prompt_template?: WorkspaceV2AssetPromptTemplate;
}

export interface WorkspaceV2ProjectAssetsResponse {
  characters?: WorkspaceV2AssetCharacterItem[];
  scenes?: WorkspaceV2AssetSceneItem[];
  props?: WorkspaceV2AssetPropItem[];
}

export interface WorkspaceV2MappedProjectAssets {
  characters: Record<string, Character>;
  scenes: Record<string, Scene>;
  props: Record<string, Prop>;
}

function mapAssetListToRecord<TItem extends { name?: string }, TValue>(
  items: TItem[] | undefined,
  mapItem: (item: TItem) => TValue | null,
): Record<string, TValue> {
  const out: Record<string, TValue> = {};
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    const name = item.name?.trim();
    if (!name) continue;
    const mapped = mapItem(item);
    if (mapped) out[name] = mapped;
  }
  return out;
}

function normalizeWorkspaceV2AssetStatus(
  status: string | undefined,
): AssetSheetStatus | undefined {
  if (status === "draft" || status === "generated" || status === "failed") {
    return status;
  }
  return undefined;
}

export function mapWorkspaceV2ProjectAssets(
  data: WorkspaceV2ProjectAssetsResponse,
): WorkspaceV2MappedProjectAssets {
  return {
    characters: mapAssetListToRecord(data.characters, (item) => ({
      description: item.description?.trim() ?? "",
      voice_style: item.voice_style?.trim() || undefined,
      character_sheet: item.character_sheet?.trim() || undefined,
      reference_image: item.reference_image?.trim() || undefined,
      status: normalizeWorkspaceV2AssetStatus(item.status),
      prompt_template: normalizeAssetPromptTemplate(item.prompt_template),
    })),
    scenes: mapAssetListToRecord(data.scenes, (item) => ({
      description: item.description?.trim() ?? "",
      scene_sheet: item.scene_sheet?.trim() || undefined,
      status: normalizeWorkspaceV2AssetStatus(item.status),
      prompt_template: normalizeAssetPromptTemplate(item.prompt_template),
    })),
    props: mapAssetListToRecord(data.props, (item) => ({
      description: item.description?.trim() ?? "",
      prop_sheet: item.prop_sheet?.trim() || undefined,
      status: normalizeWorkspaceV2AssetStatus(item.status),
      prompt_template: normalizeAssetPromptTemplate(item.prompt_template),
    })),
  };
}

export async function fetchWorkspaceV2ProjectAssets(
  projectId: string,
  options?: { search?: string },
): Promise<WorkspaceV2ProjectAssetsResponse> {
  const params = new URLSearchParams();
  const search = options?.search?.trim();
  if (search) params.set("search", search);
  const query = params.toString();
  return requestWorkspaceV2<WorkspaceV2ProjectAssetsResponse>(
    `/projects/${encodeURIComponent(projectId)}/assets${query ? `?${query}` : ""}`,
  );
}

/**
 * PATCH /projects/{id}/script-scenes/{sceneId} — 更新单镜字段（含绑定资产）
 * @see http://your-server:1242/docs — 顶层直接传 characters_in_scene / scenes / props
 */
export interface WorkspaceV2UpdateScriptScenePayload {
  characters_in_scene?: string[];
  scenes?: string[];
  props?: string[];
  dialogue?: Array<{ speaker: string; line: string }>;
  image_prompt?: Record<string, unknown> | null;
  video_prompt?: Record<string, unknown> | null;
  duration_seconds?: number | null;
  segment_break?: boolean | null;
  note?: string | null;
  system_prompt_templates?: {
    storyboard?: Record<string, string>;
    video?: Record<string, string>;
  } | null;
  [key: string]: unknown;
}

export async function updateWorkspaceV2ScriptScene(
  projectId: string,
  sceneId: string,
  payload: WorkspaceV2UpdateScriptScenePayload,
): Promise<{ success?: boolean }> {
  return requestWorkspaceV2<{ success?: boolean }>(
    `/projects/${encodeURIComponent(projectId)}/script-scenes/${encodeURIComponent(sceneId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export interface WorkspaceV2ProjectSourceFile {
  name: string;
  size: number;
  url: string;
  raw_filename?: string | null;
}

export interface WorkspaceV2ProjectFiles {
  files: {
    source?: WorkspaceV2ProjectSourceFile[];
  };
}

/** GET /api/v1/projects/{project_id}/files — 列出项目文件 */
export async function listWorkspaceV2ProjectFiles(
  projectId: string,
): Promise<WorkspaceV2ProjectFiles> {
  return requestWorkspaceV2<WorkspaceV2ProjectFiles>(
    `/projects/${encodeURIComponent(projectId)}/files`,
  );
}

/** GET /api/v1/projects/{project_id}/source/{filename} — 获取源文件文本 */
export async function fetchWorkspaceV2SourceContent(
  projectId: string,
  filename: string,
): Promise<string> {
  const url = `${WORKSPACE_V2_API_BASE}/projects/${encodeURIComponent(projectId)}/source/${encodeURIComponent(filename)}`;
  const response = await fetch(url, withWorkspaceV2Auth());
  await throwIfWorkspaceV2NotOk(response, "获取源文件失败");
  return response.text();
}

/** DELETE /api/v1/projects/{project_id}/source/{filename} — 删除源文件 */
export async function deleteWorkspaceV2SourceFile(
  projectId: string,
  filename: string,
): Promise<{ success?: boolean }> {
  return requestWorkspaceV2<{ success?: boolean }>(
    `/projects/${encodeURIComponent(projectId)}/source/${encodeURIComponent(filename)}`,
    { method: "DELETE" },
  );
}

export interface WorkspaceV2ProcessedScene {
  scene_id?: string;
  duration_seconds?: number;
  characters_in_scene?: string[];
  /** 镜头绑定的场景资产名 */
  scenes?: string[];
  /** 镜头绑定的道具资产名 */
  props?: string[];
  visual_description?: string;
  /** 后端偶发中文字段名 */
  visual_描述?: string;
  action?: string;
  dialogue?: Array<Record<string, unknown> | { speaker?: string; line?: string }>;
  narration?: string;
  camera_motion?: string;
  shot_type?: string;
  lighting?: string;
  ambiance?: string;
  [key: string]: unknown;
}

/** scripts["episode_n.json"].metadata */
export interface WorkspaceV2ScriptMetadata {
  created_at?: string;
  updated_at?: string;
  status?: string;
  total_scenes?: number;
  estimated_duration_seconds?: number;
  [key: string]: unknown;
}

export interface WorkspaceV2ScriptEpisode {
  title?: string;
  episode?: number;
  episode_number?: number;
  duration_seconds?: number;
  /** scripts["episode_n.json"].metadata */
  metadata?: WorkspaceV2ScriptMetadata;
  scenes?: WorkspaceV2ProcessedScene[];
  [key: string]: unknown;
}

/** GET /projects/{id} 或 /scripts 返回的分集剧本条目 */
export interface WorkspaceV2ListedScript {
  title?: string;
  episode_number?: number;
  episode?: number;
  scenes?: WorkspaceV2ProcessedScene[];
  metadata?: WorkspaceV2ScriptMetadata;
  [key: string]: unknown;
}

export interface WorkspaceV2ListScriptsResult {
  success?: boolean;
  scripts?: WorkspaceV2ListedScript[] | Record<string, WorkspaceV2ListedScript>;
}

export interface WorkspaceV2ScriptProcessResult {
  success?: boolean;
  message?: string;
  task_id?: string;
  /** 部分后端响应使用 camelCase */
  taskId?: string;
  title?: string;
  episodes?: WorkspaceV2ScriptEpisode[];
  /**
   * 后端落盘后的分集剧本（文件名 → 内容），与 GET /projects 的 scripts 同形。
   * 生成剧本节点表格优先使用此字段。
   */
  scripts?: WorkspaceV2ListedScript[] | Record<string, WorkspaceV2ListedScript | unknown>;
  scenes?: WorkspaceV2ProcessedScene[];
  original_content?: string;
  processed_content?: string;
  original?: string;
  processed?: string;
  content?: string;
  script?: Record<string, unknown> | string | null;
}

export function resolveWorkspaceV2ScriptProcessTaskId(
  result: WorkspaceV2ScriptProcessResult,
): string | null {
  const raw = result.task_id ?? result.taskId;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function resolveWorkspaceV2SceneVisualDescription(
  scene: WorkspaceV2ProcessedScene | undefined,
): string {
  if (!scene) return "";
  const record = scene as Record<string, unknown>;
  const candidates = [
    scene.visual_description,
    record.visual_描述,
    record.visualDescription,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

/** 解析对白：支持 { speaker, line } 或 { "角色名": "台词" } 结构。 */
export function parseWorkspaceV2DialogueEntries(
  dialogue: WorkspaceV2ProcessedScene["dialogue"],
): Array<{ speaker: string; line: string }> {
  if (!Array.isArray(dialogue) || dialogue.length === 0) return [];

  const entries: Array<{ speaker: string; line: string }> = [];
  for (const item of dialogue) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const speaker = typeof record.speaker === "string" ? record.speaker.trim() : "";
    const line = typeof record.line === "string" ? record.line.trim() : "";

    if (speaker && line) {
      entries.push({ speaker, line });
      continue;
    }

    for (const [key, value] of Object.entries(record)) {
      if (key === "speaker" || key === "line") continue;
      if (typeof value === "string" && value.trim()) {
        entries.push({ speaker: key, line: value.trim() });
      }
    }
  }
  return entries;
}

export function formatWorkspaceV2DialogueLines(
  dialogue: WorkspaceV2ProcessedScene["dialogue"],
): string[] {
  return parseWorkspaceV2DialogueEntries(dialogue).map(
    ({ speaker, line }) => `  ${speaker}：${line}`,
  );
}

/**
 * 对白以 video_prompt.dialogue 为准；为空时回退顶层 scene.dialogue（兼容旧数据）。
 * 仅接受结构化数组，忽略字符串等非结构化值。
 */
function resolveSceneStructuredDialogueRaw(
  scene: Record<string, unknown>,
): WorkspaceV2ProcessedScene["dialogue"] | undefined {
  const videoPrompt = scene.video_prompt;
  if (videoPrompt && typeof videoPrompt === "object" && !Array.isArray(videoPrompt)) {
    const fromVp = (videoPrompt as Record<string, unknown>).dialogue;
    if (
      Array.isArray(fromVp) &&
      fromVp.some((item) => item && typeof item === "object")
    ) {
      return fromVp as WorkspaceV2ProcessedScene["dialogue"];
    }
  }
  const top = scene.dialogue;
  if (Array.isArray(top) && top.some((item) => item && typeof item === "object")) {
    return top as WorkspaceV2ProcessedScene["dialogue"];
  }
  return undefined;
}

function mapStructuredDialogueFields(dialogueRaw: WorkspaceV2ProcessedScene["dialogue"]): {
  dialogue?: string;
  dialogueEntries?: Array<{ speaker: string; line: string }>;
} {
  const dialogueEntries = parseWorkspaceV2DialogueEntries(dialogueRaw);
  if (dialogueEntries.length === 0) return {};
  const dialogueFromEntries =
    formatWorkspaceV2DialogueLines(dialogueRaw)
      .map((line) => line.trim())
      .join("\n") || undefined;
  return dialogueFromEntries
    ? { dialogue: dialogueFromEntries, dialogueEntries }
    : { dialogueEntries };
}

export function resolveWorkspaceV2EpisodeName(
  episode: WorkspaceV2ScriptEpisode,
  index: number,
): string {
  // 优先用章节 title（scripts["episode_n.json"].title）
  const title = episode.title;
  if (typeof title === "string" && title.trim()) {
    return title.trim();
  }
  const episodeKey = `episode_${index + 1}`;
  const keyed = episode[episodeKey];
  if (typeof keyed === "string" && keyed.trim()) {
    return keyed.trim();
  }
  const fallback = episode.episode_1;
  if (typeof fallback === "string" && fallback.trim()) {
    return fallback.trim();
  }
  for (const [key, value] of Object.entries(episode)) {
    if (/^episode_\d+$/.test(key) && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return `第 ${index + 1} 集`;
}

/** 读取章节 characters_in_episode，供表格人物 tag 列使用。 */
export function resolveWorkspaceV2EpisodeCharacters(
  episode: WorkspaceV2ScriptEpisode | WorkspaceV2ListedScript | undefined,
): string[] {
  if (!episode) return [];
  const raw = (episode as Record<string, unknown>).characters_in_episode;
  if (!Array.isArray(raw)) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

/** 从分集 scripts[file].metadata 取出表格字段。 */
export function resolveWorkspaceV2ScriptEpisodeMetadata(
  episode: WorkspaceV2ScriptEpisode | WorkspaceV2ListedScript | undefined,
): {
  createdAt: string | null;
  updatedAt: string | null;
  status: string | null;
  totalScenes: number | null;
  estimatedDurationSeconds: number | null;
} {
  const record = episode as Record<string, unknown> | undefined;
  const raw = episode?.metadata ?? record?.metadata;
  const metadata =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as WorkspaceV2ScriptMetadata)
      : null;

  const createdAt =
    typeof metadata?.created_at === "string" && metadata.created_at.trim()
      ? metadata.created_at.trim()
      : null;
  const updatedAt =
    typeof metadata?.updated_at === "string" && metadata.updated_at.trim()
      ? metadata.updated_at.trim()
      : null;
  const status =
    typeof metadata?.status === "string" && metadata.status.trim()
      ? metadata.status.trim()
      : null;

  const coerceFiniteNumber = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  // 场景数：metadata.total_scenes → scenes.length
  let totalScenes = coerceFiniteNumber(metadata?.total_scenes);
  if (totalScenes == null && Array.isArray(episode?.scenes)) {
    totalScenes = episode.scenes.length;
  }

  // 预估时长：metadata.estimated_duration_seconds → duration_seconds
  let estimatedDurationSeconds = coerceFiniteNumber(metadata?.estimated_duration_seconds);
  if (estimatedDurationSeconds == null) {
    estimatedDurationSeconds = coerceFiniteNumber(episode?.duration_seconds);
  }

  return {
    createdAt,
    updatedAt,
    status,
    totalScenes,
    estimatedDurationSeconds,
  };
}

export function parseWorkspaceV2ScriptEpisodes(
  result: WorkspaceV2ScriptProcessResult,
): WorkspaceV2ScriptEpisode[] {
  // 优先使用 scripts（文件名 → 分集），与项目详情 / 任务 result 对齐
  if (result.scripts != null) {
    const fromScripts = parseWorkspaceV2ListedScripts(
      result as WorkspaceV2ListScriptsResult,
    );
    if (fromScripts.length > 0) {
      return fromScripts;
    }
  }
  if (result.script && typeof result.script === "object" && "scripts" in result.script) {
    const nestedScripts = parseWorkspaceV2ListedScripts(
      result.script as WorkspaceV2ListScriptsResult,
    );
    if (nestedScripts.length > 0) {
      return nestedScripts;
    }
  }
  if (Array.isArray(result.episodes) && result.episodes.length > 0) {
    return result.episodes;
  }
  if (result.script && typeof result.script === "object") {
    const nested = result.script as WorkspaceV2ScriptProcessResult;
    if (Array.isArray(nested.episodes) && nested.episodes.length > 0) {
      return nested.episodes;
    }
    if (Array.isArray(nested.scenes) && nested.scenes.length > 0) {
      return [{ episode_1: nested.title ?? "第 1 集", scenes: nested.scenes }];
    }
  }
  if (Array.isArray(result.scenes) && result.scenes.length > 0) {
    return [{ episode_1: result.title ?? "第 1 集", scenes: result.scenes }];
  }
  return [];
}

export function formatWorkspaceV2ScenesDetail(scenes: WorkspaceV2ProcessedScene[]): string {
  if (scenes.length === 0) return "";

  const lines: string[] = [];
  for (const scene of scenes) {
    if (scene.scene_id?.trim()) {
      lines.push(`【${scene.scene_id.trim()}】`);
    }
    if (scene.duration_seconds != null) {
      lines.push(`时长：${scene.duration_seconds}s`);
    }
    if (scene.characters_in_scene?.length) {
      lines.push(`角色：${scene.characters_in_scene.join("、")}`);
    }
    const visual = resolveWorkspaceV2SceneVisualDescription(scene);
    if (visual) {
      lines.push(`画面：${visual}`);
    }
    if (scene.action?.trim()) {
      lines.push(`动作：${scene.action.trim()}`);
    }
    if (scene.narration?.trim()) {
      lines.push(`旁白：${scene.narration.trim()}`);
    }
    const dialogueLines = formatWorkspaceV2DialogueLines(scene.dialogue);
    if (dialogueLines.length) {
      lines.push("对白：", ...dialogueLines);
    }
    if (scene.shot_type?.trim()) {
      lines.push(`景别：${scene.shot_type.trim()}`);
    }
    if (scene.camera_motion?.trim()) {
      lines.push(`运镜：${scene.camera_motion.trim()}`);
    }
    if (scene.lighting?.trim()) {
      lines.push(`灯光：${scene.lighting.trim()}`);
    }
    if (scene.ambiance?.trim()) {
      lines.push(`氛围：${scene.ambiance.trim()}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function formatWorkspaceV2ProcessedScript(payload: {
  title?: string;
  scenes?: WorkspaceV2ProcessedScene[];
}): string {
  const scenes = payload.scenes ?? [];
  if (scenes.length === 0) return "";

  const lines: string[] = [];
  if (payload.title?.trim()) {
    lines.push(`【${payload.title.trim()}】`, "");
  }

  for (const scene of scenes) {
    if (scene.scene_id?.trim()) {
      lines.push(`【${scene.scene_id.trim()}】`);
    }
    if (scene.characters_in_scene?.length) {
      lines.push(`角色：${scene.characters_in_scene.join("、")}`);
    }
    const visual = resolveWorkspaceV2SceneVisualDescription(scene);
    if (visual) {
      lines.push(`画面：${visual}`);
    }
    if (scene.action?.trim()) {
      lines.push(`动作：${scene.action.trim()}`);
    }
    const dialogueLines = formatWorkspaceV2DialogueLines(scene.dialogue);
    if (dialogueLines.length) {
      lines.push("对白：", ...dialogueLines);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/** 从剧本预处理响应中取出可展示的剧本文本。 */
export function resolveWorkspaceV2ProcessedScriptContent(
  result: WorkspaceV2ScriptProcessResult,
): string {
  const candidates = [
    result.processed_content,
    result.processed,
    typeof result.script === "string" ? result.script : null,
    result.content,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const structuredCandidates: Array<{ title?: string; scenes?: WorkspaceV2ProcessedScene[] }> = [
    result,
  ];
  if (result.script && typeof result.script === "object") {
    structuredCandidates.push(
      result.script as { title?: string; scenes?: WorkspaceV2ProcessedScene[] },
    );
  }

  for (const payload of structuredCandidates) {
    const formatted = formatWorkspaceV2ProcessedScript(payload);
    if (formatted) {
      return formatted;
    }
  }

  if (result.script && typeof result.script === "object") {
    return JSON.stringify(result.script, null, 2);
  }
  if (result.scenes?.length) {
    return JSON.stringify(result, null, 2);
  }
  if (parseWorkspaceV2ScriptEpisodes(result).length > 0) {
    return "";
  }
  return "";
}

/** 读取项目首个 source 文件内容，供剧本预处理使用。 */
export async function fetchWorkspaceV2PrimarySourceContent(projectId: string): Promise<string> {
  const listing = await listWorkspaceV2ProjectFiles(projectId);
  const sourceFiles = listing.files?.source ?? [];
  if (sourceFiles.length === 0) {
    throw new Error("NO_SOURCE_FILE");
  }
  const filename = sourceFiles[0]?.name?.trim();
  if (!filename) {
    throw new Error("NO_SOURCE_FILE");
  }
  const content = await fetchWorkspaceV2SourceContent(projectId, filename);
  if (!content.trim()) {
    throw new Error("EMPTY_SOURCE_FILE");
  }
  return content;
}

export type WorkspaceV2ExtractAssetType = "character" | "scene" | "prop" | "all";

/**
 * POST /auto-assets/generate 可能同步返回资产列表，也可能异步入队返回 task_id。
 * 字段均可选：勿直接对 characters/scenes/props 读 .length。
 */
export interface WorkspaceV2ExtractAssetsResult {
  success: boolean;
  message: string;
  task_id?: string;
  taskId?: string;
  characters?: { name: string; description: string; voice_style?: string }[];
  scenes?: { name: string; description: string }[];
  props?: { name: string; description: string }[];
}

export function resolveWorkspaceV2ExtractAssetsTaskId(
  result: WorkspaceV2ExtractAssetsResult,
): string | null {
  const raw = result.task_id ?? result.taskId;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

export function countWorkspaceV2ExtractedAssets(
  result: WorkspaceV2ExtractAssetsResult,
  assetType: WorkspaceV2ExtractAssetType,
): number {
  const characters = result.characters?.length ?? 0;
  const scenes = result.scenes?.length ?? 0;
  const props = result.props?.length ?? 0;
  if (assetType === "character") return characters;
  if (assetType === "scene") return scenes;
  if (assetType === "prop") return props;
  return characters + scenes + props;
}

/** POST /api/v1/projects/{project_id}/auto-assets/generate — 从剧集内容提取资产 */
export async function extractWorkspaceV2Assets(
  projectId: string,
  payload: { asset_type: WorkspaceV2ExtractAssetType },
): Promise<WorkspaceV2ExtractAssetsResult> {
  return requestWorkspaceV2<WorkspaceV2ExtractAssetsResult>(
    `/projects/${encodeURIComponent(projectId)}/auto-assets/generate`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/** POST /api/v1/projects/{project_id}/script/process — 小说转剧本（后端读 source 并自动落盘） */
export async function processWorkspaceV2Script(
  projectId: string,
): Promise<WorkspaceV2ScriptProcessResult> {
  return requestWorkspaceV2<WorkspaceV2ScriptProcessResult>(
    `/projects/${encodeURIComponent(projectId)}/script/process`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

/** GET /api/v1/projects/{project_id}/scripts — 扫描 scripts 目录，返回全部剧本文本 */
export async function listWorkspaceV2Scripts(
  projectId: string,
): Promise<WorkspaceV2ListScriptsResult> {
  return requestWorkspaceV2<WorkspaceV2ListScriptsResult>(
    `/projects/${encodeURIComponent(projectId)}/scripts`,
  );
}

/**
 * PUT /projects/{id}/scripts/{episode_number} — 更新剧本
 * @see http://your-server:1242/docs — UpdateScriptRequest 三种互斥模式
 *
 * 模式 1：`script` 整集替换
 * 模式 2：`scene_id` + `scene` 单场景替换
 * 模式 3：`scene_id` + `fields` 单场景字段增量更新
 */
export interface WorkspaceV2UpdateScriptPayload {
  script?: Record<string, unknown> | null;
  scene_id?: string | null;
  scene?: Record<string, unknown> | null;
  fields?: Record<string, unknown> | null;
}

export async function updateWorkspaceV2Script(
  projectId: string,
  episodeNumber: number,
  payload: WorkspaceV2UpdateScriptPayload,
): Promise<{ success?: boolean; message?: string }> {
  return requestWorkspaceV2<{ success?: boolean; message?: string }>(
    `/projects/${encodeURIComponent(projectId)}/scripts/${episodeNumber}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

function parseEpisodeNumberFromFilename(filename: string): number | null {
  const match = filename.match(/episode[_\-]?(\d+)/i);
  if (!match?.[1]) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

function recordLooksLikeScriptChapter(record: Record<string, unknown>): boolean {
  return (
    "title" in record ||
    "episode" in record ||
    "episode_number" in record ||
    "scenes" in record ||
    "metadata" in record ||
    "duration_seconds" in record
  );
}

/**
 * 取出 scripts 下某一集章节对象。
 * 兼容：
 * - response.scripts["episode_n.json"] → 章节
 * - response.scripts[] = { "episode_n.json": 章节 }（后端常见套一层文件名 key）
 */
function resolveWorkspaceV2ScriptChapter(
  value: unknown,
): Record<string, unknown> | null {
  let current: unknown = value;
  if (typeof current === "string") {
    const trimmed = current.trim();
    if (!trimmed) return null;
    try {
      current = JSON.parse(trimmed) as unknown;
    } catch {
      return null;
    }
  }
  if (!current || typeof current !== "object" || Array.isArray(current)) {
    return null;
  }

  const record = current as Record<string, unknown>;
  if (recordLooksLikeScriptChapter(record)) {
    return record;
  }

  // 再剥一层文件名包装：{ "episode_1.json": { title, metadata, scenes } }
  const keys = Object.keys(record);
  if (keys.length === 1) {
    const nested = record[keys[0]!];
    if (typeof nested === "string") {
      return resolveWorkspaceV2ScriptChapter(nested);
    }
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return resolveWorkspaceV2ScriptChapter(nested);
    }
  }

  // 既不像章节、也无法解包时丢弃，避免表格出现「第 N 集」空行
  return null;
}

/**
 * scripts 数组单项 → [filename, chapterValue]
 * 后端常见：[{ "episode_1.json": { title, metadata, scenes } }, ...]
 */
function unwrapListedScriptArrayEntry(
  value: unknown,
  index: number,
): [string, unknown] {
  const fallbackName = `episode_${index + 1}.json`;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [fallbackName, value];
  }

  const record = value as Record<string, unknown>;
  if (recordLooksLikeScriptChapter(record)) {
    return [fallbackName, value];
  }

  const keys = Object.keys(record);
  if (keys.length !== 1) {
    return [fallbackName, value];
  }

  const filename = keys[0]!;
  const inner = record[filename];
  if (inner == null) {
    return [fallbackName, value];
  }
  return [filename || fallbackName, inner];
}

/**
 * 将 GET /scripts 响应转为分集表格行。
 * 数据路径（需拆多层）：
 * - scripts["episode_n.json"].metadata.*
 * - scripts: [{ "episode_n.json": { metadata.* } }, ...]
 */
export function parseWorkspaceV2ListedScripts(
  result: WorkspaceV2ListScriptsResult | Record<string, unknown> | null | undefined,
): WorkspaceV2ScriptEpisode[] {
  if (!result || typeof result !== "object") return [];

  // 兼容 { scripts } / { data: { scripts } } / 裸 map
  const root = result as Record<string, unknown>;
  const nestedData =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;
  const raw =
    (root as WorkspaceV2ListScriptsResult).scripts ??
    (nestedData?.scripts as WorkspaceV2ListScriptsResult["scripts"]) ??
    null;

  let chapterEntries: Array<[string, unknown]> = [];
  if (Array.isArray(raw)) {
    chapterEntries = raw.map((value, index) => unwrapListedScriptArrayEntry(value, index));
  } else if (raw && typeof raw === "object") {
    chapterEntries = Object.entries(raw as Record<string, unknown>);
  } else if (!("scripts" in root) && !nestedData) {
    // OpenAPI 裸 map：文件名 → 章节
    chapterEntries = Object.entries(root).filter(
      ([key, value]) =>
        key !== "success" &&
        key !== "message" &&
        value != null &&
        (typeof value === "string" ||
          (typeof value === "object" && !Array.isArray(value))),
    );
  }

  const episodes: WorkspaceV2ScriptEpisode[] = [];

  for (const [filename, value] of chapterEntries) {
    const chapter = resolveWorkspaceV2ScriptChapter(value);
    if (!chapter) continue;

    // 按接口约定读取章节里的 metadata
    const metadataRaw = chapter.metadata;
    const metadata: WorkspaceV2ScriptMetadata | undefined =
      metadataRaw && typeof metadataRaw === "object" && !Array.isArray(metadataRaw)
        ? (metadataRaw as WorkspaceV2ScriptMetadata)
        : undefined;

    const episodeNumber =
      typeof chapter.episode_number === "number"
        ? chapter.episode_number
        : typeof chapter.episode === "number"
          ? chapter.episode
          : (parseEpisodeNumberFromFilename(filename) ?? episodes.length + 1);

    const title =
      typeof chapter.title === "string" && chapter.title.trim()
        ? chapter.title.trim()
        : undefined;

    episodes.push({
      ...chapter,
      ...(title ? { title } : {}),
      episode_number: episodeNumber,
      ...(metadata ? { metadata } : {}),
      scenes: Array.isArray(chapter.scenes)
        ? (chapter.scenes as WorkspaceV2ProcessedScene[])
        : [],
    });
  }

  return episodes.sort((a, b) => {
    const left = typeof a.episode_number === "number" ? a.episode_number : 0;
    const right = typeof b.episode_number === "number" ? b.episode_number : 0;
    return left - right;
  });
}

// ==================== 制作分镜（production） ====================

/** GET /projects/{id}/production — episodes_stats 单项（旧字段，兼容回退） */
export interface WorkspaceV2ProductionEpisodeStat {
  episode: number;
  title?: string | null;
  status?: string | null;
  script_status?: string | null;
  storyboards?: unknown[] | null;
  videos?: Record<string, unknown> | null;
}

/**
 * GET /api/v1/projects/{project_id}/production
 * 分镜节点专用：以 episodes 为分集+镜头主数据；scripts 已移除。
 * 系统提示词模板优先 episodes[].scenes[].system_prompt_templates（镜头级）
 */
export interface WorkspaceV2ProjectProductionResult {
  /** @deprecated 后端已移除；保留仅作旧响应兼容 */
  scripts?: WorkspaceV2ListedScript[] | Record<string, unknown> | null;
  /** 分集详情（含 scenes）；有数据时用于左侧剧集 + 右侧镜头 */
  episodes?: unknown[] | null;
  /** @deprecated 旧字段回退 */
  episodes_stats?: WorkspaceV2ProductionEpisodeStat[] | null;
  /** @deprecated 项目级旧字段；请用 episodes[].scenes[].system_prompt_templates */
  system_prompt_templates?: unknown;
}

/** production.episodes 是否已有配置数据 */
export function workspaceV2ProductionHasEpisodeConfigs(
  result: WorkspaceV2ProjectProductionResult | null | undefined,
): boolean {
  return Array.isArray(result?.episodes) && result.episodes.length > 0;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asPositiveInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function resolveWorkspaceV2VideoPromptDurationSec(
  videoPrompt: unknown,
): number {
  if (!videoPrompt || typeof videoPrompt !== "object" || Array.isArray(videoPrompt)) {
    return 0;
  }
  const o = videoPrompt as Record<string, unknown>;
  return asPositiveInt(o.duration_sec ?? o.duration_seconds, 0);
}

/** 镜头时长：优先 scene 顶层，其次 video_prompt.duration_seconds */
function resolveWorkspaceV2SceneDurationSec(scene: Record<string, unknown>): number {
  const topLevel = asPositiveInt(scene.duration_sec ?? scene.duration_seconds, 0);
  if (topLevel > 0) return topLevel;
  return resolveWorkspaceV2VideoPromptDurationSec(scene.video_prompt);
}

/** 已映射镜头时长：优先 durationSec，其次 videoPrompt.duration_seconds */
export function resolveWorkspaceV2ShotDurationSec(input: {
  durationSec?: number;
  videoPrompt?: string | Record<string, unknown> | null;
}): number {
  if (input.durationSec && input.durationSec > 0) return input.durationSec;
  return resolveWorkspaceV2VideoPromptDurationSec(input.videoPrompt);
}

/** 解析镜头绑定的资产名列表（characters_in_scene / scenes / props） */
function asAssetNameList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const names = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return names.length > 0 ? names : undefined;
}

/** 解析 production / episodes/config 中的镜头条目（展示字段按固定 key，不做跨字段回退） */
export function mapWorkspaceV2ProductionShot(
  raw: unknown,
  index: number,
  projectId?: string | null,
): {
  id: string;
  shotNumber: number;
  title: string;
  sceneId?: string;
  thumbnailUrl?: string;
  storyboardImageUrl?: string;
  storyboardVideoUrl?: string;
  authorized?: boolean;
  durationSec: number;
  visual: string;
  action?: string;
  dialogue?: string;
  narration?: string;
  characters?: string[];
  scenes?: string[];
  props?: string[];
} | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const shotNumber = asPositiveInt(
    o.shot_number ?? o.shot ?? o.scene_number ?? o.index,
    index + 1,
  );
  const sceneId = asTrimmedString(o.scene_id) || undefined;
  const id =
    asTrimmedString(o.id) ||
    asTrimmedString(o.shot_id) ||
    sceneId ||
    `shot-${shotNumber}`;
  const title =
    asTrimmedString(o.title) ||
    asTrimmedString(o.scene_name) ||
    asTrimmedString(o.name) ||
    `镜头 ${shotNumber}`;
  const assets =
    o.generated_assets && typeof o.generated_assets === "object"
      ? (o.generated_assets as Record<string, unknown>)
      : null;
  const storyboardImageRaw =
    asTrimmedString(assets?.storyboard_image) ||
    asTrimmedString(o.storyboard_image) ||
    undefined;
  const storyboardVideoRaw =
    asTrimmedString(assets?.video_clip) ||
    asTrimmedString(assets?.video_uri) ||
    asTrimmedString(o.video_clip) ||
    asTrimmedString(o.video_uri) ||
    undefined;
  const storyboardImageUrl = resolveWorkspaceV2ShotMediaUrl(projectId, storyboardImageRaw);
  const storyboardVideoUrl = resolveWorkspaceV2ShotMediaUrl(projectId, storyboardVideoRaw);
  const authorized = assets?.authorized === true;
  const thumbnailUrl =
    resolveWorkspaceV2ShotMediaUrl(
      projectId,
      asTrimmedString(o.thumbnail_url) ||
        asTrimmedString(assets?.video_thumbnail) ||
        storyboardImageRaw,
    ) || undefined;
  const durationSec = resolveWorkspaceV2SceneDurationSec(o);

  // 镜头详情展示字段：固定 API key，禁止 text / prompt / video_prompt 等回退
  const visual =
    asTrimmedString(o.visual_description) || asTrimmedString(o.visual) || "";
  const action = asTrimmedString(o.action) || undefined;
  const dialogue = asTrimmedString(o.dialogue) || undefined;
  const narration = asTrimmedString(o.narration) || undefined;
  const characters = asAssetNameList(o.characters_in_scene ?? o.characters);
  const scenes = asAssetNameList(o.scenes);
  const props = asAssetNameList(o.props);

  return {
    id,
    shotNumber,
    title,
    ...(sceneId ? { sceneId } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(storyboardImageUrl ? { storyboardImageUrl } : {}),
    ...(storyboardVideoUrl ? { storyboardVideoUrl } : {}),
    ...(authorized ? { authorized: true } : {}),
    durationSec,
    visual,
    ...(action ? { action } : {}),
    ...(dialogue ? { dialogue } : {}),
    ...(narration ? { narration } : {}),
    ...(characters ? { characters } : {}),
    ...(scenes ? { scenes } : {}),
    ...(props ? { props } : {}),
  };
}

function asGenerationPrompt(
  value: unknown,
): string | Record<string, unknown> | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

/** episodes[].scenes 按「集号::scene_id」索引提示词、时长、对白、系统提示词模板与生成媒体 */
function buildEpisodeSceneOverlayIndex(
  episodes: unknown[] | null | undefined,
  projectId?: string | null,
): Map<
  string,
  {
    imagePrompt?: string | Record<string, unknown>;
    videoPrompt?: string | Record<string, unknown>;
    systemPromptTemplates?: NonNullable<
      ReturnType<typeof parseStoryboardSystemPromptTemplates>
    >;
    storyboardImageUrl?: string;
    storyboardVideoUrl?: string;
    thumbnailUrl?: string;
    authorized?: boolean;
    durationSec?: number;
    dialogue?: string;
    dialogueEntries?: Array<{ speaker: string; line: string }>;
  }
> {
  const index = new Map<
    string,
    {
      imagePrompt?: string | Record<string, unknown>;
      videoPrompt?: string | Record<string, unknown>;
      systemPromptTemplates?: NonNullable<
        ReturnType<typeof parseStoryboardSystemPromptTemplates>
      >;
      storyboardImageUrl?: string;
      storyboardVideoUrl?: string;
      thumbnailUrl?: string;
      authorized?: boolean;
      durationSec?: number;
      dialogue?: string;
      dialogueEntries?: Array<{ speaker: string; line: string }>;
    }
  >();
  if (!Array.isArray(episodes)) return index;

  for (const rawEp of episodes) {
    if (!rawEp || typeof rawEp !== "object") continue;
    const ep = rawEp as Record<string, unknown>;
    const episodeNumber = asPositiveInt(ep.episode ?? ep.episode_number, 0);
    if (!episodeNumber) continue;
    const scenes = Array.isArray(ep.scenes)
      ? ep.scenes
      : Array.isArray(ep.storyboards)
        ? ep.storyboards
        : [];
    for (const rawScene of scenes) {
      if (!rawScene || typeof rawScene !== "object") continue;
      const scene = rawScene as Record<string, unknown>;
      const sceneId =
        asTrimmedString(scene.scene_id) ||
        asTrimmedString(scene.id) ||
        asTrimmedString(scene.shot_id);
      if (!sceneId) continue;
      const imagePrompt = asGenerationPrompt(scene.image_prompt);
      const videoPrompt = asGenerationPrompt(scene.video_prompt);
      const systemPromptTemplates = parseStoryboardSystemPromptTemplates(
        scene.system_prompt_templates,
      );
      const assets =
        scene.generated_assets && typeof scene.generated_assets === "object"
          ? (scene.generated_assets as Record<string, unknown>)
          : null;
      const storyboardImageRaw =
        asTrimmedString(assets?.storyboard_image) ||
        asTrimmedString(scene.storyboard_image) ||
        undefined;
      const storyboardVideoRaw =
        asTrimmedString(assets?.video_clip) ||
        asTrimmedString(assets?.video_uri) ||
        asTrimmedString(scene.video_clip) ||
        asTrimmedString(scene.video_uri) ||
        undefined;
      const storyboardImageUrl = resolveWorkspaceV2ShotMediaUrl(
        projectId,
        storyboardImageRaw,
      );
      const storyboardVideoUrl = resolveWorkspaceV2ShotMediaUrl(
        projectId,
        storyboardVideoRaw,
      );
      const thumbnailUrl =
        resolveWorkspaceV2ShotMediaUrl(
          projectId,
          asTrimmedString(scene.thumbnail_url) ||
            asTrimmedString(assets?.video_thumbnail) ||
            storyboardImageRaw,
        ) || undefined;
      const authorized = assets?.authorized === true;
      const durationSec = resolveWorkspaceV2SceneDurationSec(scene);
      const dialogueRaw = resolveSceneStructuredDialogueRaw(scene);
      const dialogueFields = dialogueRaw
        ? mapStructuredDialogueFields(dialogueRaw)
        : {};
      index.set(`${episodeNumber}::${sceneId}`, {
        ...(imagePrompt ? { imagePrompt } : {}),
        ...(videoPrompt ? { videoPrompt } : {}),
        ...(systemPromptTemplates ? { systemPromptTemplates } : {}),
        ...(storyboardImageUrl ? { storyboardImageUrl } : {}),
        ...(storyboardVideoUrl ? { storyboardVideoUrl } : {}),
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(authorized ? { authorized: true } : {}),
        ...(durationSec > 0 ? { durationSec } : {}),
        ...dialogueFields,
      });
    }
  }
  return index;
}

type MappedConfigShot = NonNullable<
  ReturnType<typeof mapWorkspaceV2EpisodeConfigShots>[number]
>;

/**
 * 从 scene_id（如 E6S02 / E06S02）解析集号；无法识别时返回 null。
 */
export function episodeNumberFromSceneId(sceneId: string | undefined | null): number | null {
  const raw = typeof sceneId === "string" ? sceneId.trim() : "";
  if (!raw) return null;
  const match = raw.match(/^E0*(\d+)S\d+/i);
  if (!match?.[1]) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

/**
 * 同 scene_id 去重；可选按 scene_id 内嵌集号剔除串集脏数据。
 * production.episodes[].scenes 已按集归属时勿开 dropCrossEpisode（后端新增分镜偶发 E1Sxx 落在第 N 集）。
 * 旧 scripts 回退路径可开 dropCrossEpisode 抵御串集。
 */
export function filterShotsForEpisode(
  shots: MappedConfigShot[],
  episodeNumber: number,
  options?: { dropCrossEpisode?: boolean },
): MappedConfigShot[] {
  const dropCrossEpisode = options?.dropCrossEpisode === true;
  const seen = new Set<string>();
  const filtered: MappedConfigShot[] = [];
  for (const shot of shots) {
    const sceneKey = (shot.sceneId?.trim() || shot.id).trim();
    if (dropCrossEpisode) {
      const encodedEp =
        episodeNumberFromSceneId(shot.sceneId) ?? episodeNumberFromSceneId(shot.id);
      if (encodedEp != null && encodedEp !== episodeNumber) continue;
    }
    if (sceneKey) {
      if (seen.has(sceneKey)) continue;
      seen.add(sceneKey);
    }
    filtered.push(shot);
  }
  return filtered;
}

/**
 * 有 episodes 配置时：仅对「同集同镜头」命中条目覆盖提示词/媒体；
 * 未命中的镜头保留 scripts 侧数据（避免第 2 集等被全局清空导致无法批量生成）。
 */
function applyEpisodeSceneOverlayToShots(
  shots: MappedConfigShot[],
  episodeNumber: number,
  overlayIndex: ReturnType<typeof buildEpisodeSceneOverlayIndex>,
  strictFromEpisodes: boolean,
): MappedConfigShot[] {
  if (!strictFromEpisodes) return shots;

  return shots.map((shot) => {
    const sceneKey = shot.sceneId?.trim() || shot.id;
    const matched = overlayIndex.get(`${episodeNumber}::${sceneKey}`);
    // 该镜头不在 episodes 配置中：保留 scripts 解析结果
    if (!matched) return shot;

    const {
      imagePrompt: _scriptImage,
      videoPrompt: _scriptVideo,
      systemPromptTemplates: _scriptSystemPrompts,
      storyboardImageUrl: scriptImageUrl,
      storyboardVideoUrl: scriptVideoUrl,
      thumbnailUrl: scriptThumbUrl,
      authorized: scriptAuthorized,
      durationSec: scriptDurationSec,
      dialogue: scriptDialogue,
      dialogueEntries: scriptDialogueEntries,
      ...rest
    } = shot;
    const finalVideoPrompt = matched.videoPrompt ?? _scriptVideo;
    const durationSec = resolveWorkspaceV2ShotDurationSec({
      durationSec:
        matched.durationSec && matched.durationSec > 0
          ? matched.durationSec
          : scriptDurationSec,
      videoPrompt: finalVideoPrompt,
    });
    const dialogueEntries =
      matched.dialogueEntries && matched.dialogueEntries.length > 0
        ? matched.dialogueEntries
        : scriptDialogueEntries;
    const dialogue =
      matched.dialogue ??
      (dialogueEntries === scriptDialogueEntries ? scriptDialogue : undefined);
    return {
      ...rest,
      // 命中则提示词严格用 episodes（即使为空也不回退 scripts）
      ...(matched.imagePrompt ? { imagePrompt: matched.imagePrompt } : {}),
      ...(matched.videoPrompt ? { videoPrompt: matched.videoPrompt } : {}),
      ...(matched.systemPromptTemplates
        ? { systemPromptTemplates: matched.systemPromptTemplates }
        : {}),
      ...((matched.storyboardImageUrl ?? scriptImageUrl)
        ? { storyboardImageUrl: matched.storyboardImageUrl ?? scriptImageUrl }
        : {}),
      ...((matched.storyboardVideoUrl ?? scriptVideoUrl)
        ? { storyboardVideoUrl: matched.storyboardVideoUrl ?? scriptVideoUrl }
        : {}),
      ...((matched.thumbnailUrl ?? scriptThumbUrl)
        ? { thumbnailUrl: matched.thumbnailUrl ?? scriptThumbUrl }
        : {}),
      ...((matched.authorized || scriptAuthorized) ? { authorized: true } : {}),
      ...(durationSec > 0 ? { durationSec } : { durationSec: 0 }),
      ...(dialogue
        ? { dialogue, ...(dialogueEntries ? { dialogueEntries } : {}) }
        : dialogueEntries?.length
          ? { dialogueEntries }
          : {}),
    };
  });
}

/** 将 production 接口映射为制作分镜面板用的分集列表（左侧栏 + 右侧 scenes） */
export function mapWorkspaceV2ProductionEpisodes(
  result: WorkspaceV2ProjectProductionResult | null | undefined,
  projectId?: string | null,
): Array<{
  id: string;
  episodeNumber: number;
  title: string;
  description: string;
  status?: string;
  scriptStatus?: string;
  shots: ReturnType<typeof mapWorkspaceV2EpisodeConfigShots>;
}> {
  const episodesRaw = Array.isArray(result?.episodes) ? result.episodes : [];

  // 主路径：production.episodes（scripts 字段已删除，分集+镜头都在这里）
  if (episodesRaw.length > 0) {
    return episodesRaw
      .map((rawEp, index) => {
        if (!rawEp || typeof rawEp !== "object") return null;
        const ep = rawEp as Record<string, unknown>;
        const episodeNumber = asPositiveInt(
          ep.episode ?? ep.episode_number,
          index + 1,
        );
        if (!episodeNumber) return null;
        const title = asTrimmedString(ep.title) || `第 ${episodeNumber} 集`;
        const scenes = Array.isArray(ep.scenes)
          ? ep.scenes
          : Array.isArray(ep.storyboards)
            ? ep.storyboards
            : [];
        const shots = filterShotsForEpisode(
          mapWorkspaceV2EpisodeConfigShots({ scenes }, projectId),
          episodeNumber,
        );
        const status = asTrimmedString(ep.status);
        const scriptStatus = asTrimmedString(ep.script_status);

        return {
          id: `ep-${episodeNumber}`,
          episodeNumber,
          title,
          description: "",
          ...(status ? { status } : {}),
          ...(scriptStatus ? { scriptStatus } : {}),
          shots,
        };
      })
      .filter(
        (ep): ep is NonNullable<typeof ep> => ep != null,
      )
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  // 兼容旧响应：scripts 含分集+scenes，episodes 仅作提示词/媒体覆盖
  const episodeOverlayIndex = buildEpisodeSceneOverlayIndex(
    result?.episodes,
    projectId,
  );
  const strictFromEpisodes = workspaceV2ProductionHasEpisodeConfigs(result);
  const listed = parseWorkspaceV2ListedScripts(
    result?.scripts != null
      ? { scripts: result.scripts as WorkspaceV2ListScriptsResult["scripts"] }
      : null,
  );

  if (listed.length > 0) {
    return listed
      .map((script, index) => {
        const episodeNumber = asPositiveInt(
          script.episode_number ?? script.episode,
          index + 1,
        );
        const title = asTrimmedString(script.title) || `第 ${episodeNumber} 集`;
        const shots = filterShotsForEpisode(
          applyEpisodeSceneOverlayToShots(
            mapWorkspaceV2EpisodeConfigShots(
              { scenes: Array.isArray(script.scenes) ? script.scenes : [] },
              projectId,
            ),
            episodeNumber,
            episodeOverlayIndex,
            strictFromEpisodes,
          ),
          episodeNumber,
          { dropCrossEpisode: true },
        );
        const status =
          asTrimmedString(script.status) ||
          asTrimmedString(script.metadata?.status) ||
          "";
        const scriptStatus = asTrimmedString(script.script_status);

        return {
          id: `ep-${episodeNumber}`,
          episodeNumber,
          title,
          description: "",
          ...(status ? { status } : {}),
          ...(scriptStatus ? { scriptStatus } : {}),
          shots,
        };
      })
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  }

  // 兼容更旧字段 episodes_stats
  const stats = Array.isArray(result?.episodes_stats) ? result.episodes_stats : [];
  return stats
    .map((item, index) => {
      const episodeNumber = asPositiveInt(item?.episode, index + 1);
      const title = asTrimmedString(item?.title) || `第 ${episodeNumber} 集`;
      const storyboards = Array.isArray(item?.storyboards) ? item.storyboards : [];
      const shots = filterShotsForEpisode(
        applyEpisodeSceneOverlayToShots(
          mapWorkspaceV2EpisodeConfigShots(
            { scenes: storyboards },
            projectId,
          ),
          episodeNumber,
          episodeOverlayIndex,
          strictFromEpisodes,
        ),
        episodeNumber,
        { dropCrossEpisode: true },
      );

      return {
        id: `ep-${episodeNumber}`,
        episodeNumber,
        title,
        description: "",
        ...(asTrimmedString(item?.status) ? { status: asTrimmedString(item.status) } : {}),
        ...(asTrimmedString(item?.script_status)
          ? { scriptStatus: asTrimmedString(item.script_status) }
          : {}),
        shots,
      };
    })
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

/** GET /api/v1/projects/{project_id}/production — 分镜/视频状态（production 节点） */
export async function fetchWorkspaceV2ProjectProduction(
  projectId: string,
): Promise<WorkspaceV2ProjectProductionResult> {
  return requestWorkspaceV2<WorkspaceV2ProjectProductionResult>(
    `/projects/${encodeURIComponent(projectId)}/production`,
  );
}

/** 费用估算接口可能省略 totals / project 级字段，前端自行累加 */
export type WorkspaceV2CostEstimateEpisode = {
  episode: number;
  title?: string;
  segments: SegmentCost[];
};

export type WorkspaceV2CostEstimateResult = {
  project_name?: string;
  episodes: WorkspaceV2CostEstimateEpisode[];
};

function asCostBreakdown(value: unknown): SegmentCost["estimate"]["image"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const amount = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(amount)) out[key] = amount;
  }
  return out;
}

function asSegmentCost(raw: unknown): SegmentCost | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const segmentId = typeof item.segment_id === "string" ? item.segment_id.trim() : "";
  if (!segmentId) return null;
  const estimate =
    item.estimate && typeof item.estimate === "object" && !Array.isArray(item.estimate)
      ? (item.estimate as Record<string, unknown>)
      : {};
  const actual =
    item.actual && typeof item.actual === "object" && !Array.isArray(item.actual)
      ? (item.actual as Record<string, unknown>)
      : {};
  const duration =
    typeof item.duration_seconds === "number"
      ? item.duration_seconds
      : Number(item.duration_seconds);
  return {
    segment_id: segmentId,
    duration_seconds: Number.isFinite(duration) ? duration : 0,
    estimate: {
      image: asCostBreakdown(estimate.image),
      video: asCostBreakdown(estimate.video),
      audio: asCostBreakdown(estimate.audio),
    },
    actual: {
      image: asCostBreakdown(actual.image),
      video: asCostBreakdown(actual.video),
      audio: asCostBreakdown(actual.audio),
    },
  };
}

/** 规范化 cost-estimate 响应，保证 segments 结构可用 */
export function normalizeWorkspaceV2CostEstimate(
  body: unknown,
): WorkspaceV2CostEstimateResult {
  const root =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const rawEpisodes = Array.isArray(root.episodes)
    ? root.episodes
    : Array.isArray(body)
      ? body
      : [];
  const episodes = rawEpisodes
    .map((ep): WorkspaceV2CostEstimateEpisode | null => {
      if (!ep || typeof ep !== "object" || Array.isArray(ep)) return null;
      const item = ep as Record<string, unknown>;
      const episodeNum =
        typeof item.episode === "number" ? item.episode : Number(item.episode);
      if (!Number.isFinite(episodeNum)) return null;
      const segments = Array.isArray(item.segments)
        ? item.segments.map(asSegmentCost).filter((s): s is SegmentCost => s != null)
        : [];
      return {
        episode: episodeNum,
        title: typeof item.title === "string" ? item.title : "",
        segments,
      };
    })
    .filter((ep): ep is WorkspaceV2CostEstimateEpisode => ep != null);

  return {
    ...(typeof root.project_name === "string" ? { project_name: root.project_name } : {}),
    episodes,
  };
}

/** GET /api/v1/projects/{project_id}/cost-estimate — 预估 + 实际费用 */
export async function fetchWorkspaceV2CostEstimate(
  projectId: string,
): Promise<WorkspaceV2CostEstimateResult> {
  const body = await requestWorkspaceV2<unknown>(
    `/projects/${encodeURIComponent(projectId)}/cost-estimate`,
  );
  return normalizeWorkspaceV2CostEstimate(body);
}

export interface WorkspaceV2GenerateEpisodeConfigResult {
  success: boolean;
  message: string;
  task_id: string;
}

export interface WorkspaceV2GenerateEpisodeConfigPayload {
  /** 不传则生成全部；传入则仅生成该集 */
  episode?: number | null;
}

/** POST /api/v1/projects/{project_id}/episodes/generate-config — 生成分镜配置 */
export async function generateWorkspaceV2EpisodeConfig(
  projectId: string,
  payload: WorkspaceV2GenerateEpisodeConfigPayload = {},
): Promise<WorkspaceV2GenerateEpisodeConfigResult> {
  const body: WorkspaceV2GenerateEpisodeConfigPayload = {};
  if (payload.episode != null) body.episode = payload.episode;
  return requestWorkspaceV2<WorkspaceV2GenerateEpisodeConfigResult>(
    `/projects/${encodeURIComponent(projectId)}/episodes/generate-config`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

/** GET /api/v1/projects/{project_id}/episodes/config — 获取分集配置（含分镜提示词等） */
export async function fetchWorkspaceV2EpisodeConfig(
  projectId: string,
  episode?: number | null,
): Promise<unknown> {
  const params = new URLSearchParams();
  if (episode != null) params.set("episode", String(episode));
  const query = params.toString();
  return requestWorkspaceV2<unknown>(
    `/projects/${encodeURIComponent(projectId)}/episodes/config${query ? `?${query}` : ""}`,
  );
}

export interface WorkspaceV2UpdateSceneConfigPayload {
  scene_id: string;
  image_prompt?: Record<string, unknown> | null;
  video_prompt?: Record<string, unknown> | null;
  shot_type?: string | null;
  camera_motion?: string | null;
  lighting?: string | null;
  ambiance?: string | null;
  duration_seconds?: number | null;
}

export interface WorkspaceV2UpdateEpisodeConfigPayload {
  episode?: number | null;
  script_file?: string | null;
  scenes?: WorkspaceV2UpdateSceneConfigPayload[] | null;
}

/**
 * 更新剧集配置（分镜/视频提示词等）— PUT /projects/{id}/episodes/config
 * @see http://your-server:1242/docs
 */
export async function updateWorkspaceV2EpisodeConfig(
  projectId: string,
  payload: WorkspaceV2UpdateEpisodeConfigPayload,
): Promise<unknown> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/episodes/config`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
}

export interface WorkspaceV2AddStoryboardPayload {
  /** 插入位置索引，0 表示开头，1 表示第一个分镜之后 */
  index?: number;
  /** 分镜原文内容 */
  text: string;
  /** 分镜时长（秒），默认 8 */
  duration_seconds?: number | null;
}

export interface WorkspaceV2AddStoryboardResult {
  success?: boolean;
  scene_id?: string;
  sceneId?: string;
  scene?: { id?: string; scene_id?: string; sceneId?: string };
  message?: string;
  /** @deprecated 优先用 content_task_id / config_task_id */
  task_id?: string;
  taskId?: string;
  content_task_id?: string;
  contentTaskId?: string;
  config_task_id?: string;
  configTaskId?: string;
}

/**
 * 新增分镜 — POST /projects/{id}/episodes/{episode}/storyboards
 * 后端会入队 episode_config（resource_id 形如 episode_{n}_storyboard_add）异步更新配置。
 * @see http://your-server:1242/docs
 */
export async function addWorkspaceV2Storyboard(
  projectId: string,
  episode: number,
  payload: WorkspaceV2AddStoryboardPayload,
): Promise<WorkspaceV2AddStoryboardResult> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/episodes/${encodeURIComponent(String(episode))}/storyboards`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

/**
 * 删除分镜 — DELETE /projects/{id}/episodes/{episode}/storyboards/{scene_id}
 * @see http://your-server:1242/docs
 */
export async function deleteWorkspaceV2Storyboard(
  projectId: string,
  episode: number,
  sceneId: string,
): Promise<unknown> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/episodes/${encodeURIComponent(String(episode))}/storyboards/${encodeURIComponent(sceneId)}`,
    { method: "DELETE" },
  );
}

export interface WorkspaceV2InsertEpisodePayload {
  /** 剧集标题 */
  title: string;
  /** 剧集内容（与 file_path 二选一） */
  text?: string | null;
  /** 已上传文件路径（与 text 二选一；同时传时后端优先 file_path） */
  file_path?: string | null;
  /** 插入位置（从 1 开始）；null/省略则追加到末尾 */
  index?: number | null;
}

/**
 * 插入剧集 — POST /projects/{id}/episodes
 * @see http://your-server:1242/docs
 */
export async function insertWorkspaceV2Episode(
  projectId: string,
  payload: WorkspaceV2InsertEpisodePayload,
): Promise<unknown> {
  const body: WorkspaceV2InsertEpisodePayload = {
    title: payload.title.trim(),
  };
  if (payload.file_path != null && String(payload.file_path).trim()) {
    body.file_path = String(payload.file_path).trim();
  } else if (payload.text != null) {
    body.text = payload.text;
  }
  if (payload.index != null) body.index = payload.index;
  return requestWorkspaceV2(`/projects/${encodeURIComponent(projectId)}/episodes`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * 删除剧集 — DELETE /projects/{id}/episodes/{episode}
 * 后端会清理相关文件并自动更新后续剧集序号。
 * @see http://your-server:1242/docs
 */
export async function deleteWorkspaceV2Episode(
  projectId: string,
  episode: number,
): Promise<unknown> {
  return requestWorkspaceV2(
    `/projects/${encodeURIComponent(projectId)}/episodes/${encodeURIComponent(String(episode))}`,
    { method: "DELETE" },
  );
}

function extractEpisodeConfigSceneList(result: unknown): unknown[] {
  if (!result || typeof result !== "object") return [];
  const root = result as Record<string, unknown>;

  if (Array.isArray(root.scenes)) return root.scenes;
  if (Array.isArray(root.storyboards)) return root.storyboards;

  const script = root.script;
  if (script && typeof script === "object") {
    const s = script as Record<string, unknown>;
    if (Array.isArray(s.scenes)) return s.scenes;
    if (Array.isArray(s.storyboards)) return s.storyboards;
  }

  const episodes = root.episodes;
  if (Array.isArray(episodes) && episodes[0] && typeof episodes[0] === "object") {
    const first = episodes[0] as Record<string, unknown>;
    if (Array.isArray(first.scenes)) return first.scenes;
    if (Array.isArray(first.storyboards)) return first.storyboards;
  }

  return [];
}

/** 将 GET episodes/config 响应解析为制作分镜面板镜头列表 */
export function mapWorkspaceV2EpisodeConfigShots(
  result: unknown,
  projectId?: string | null,
): Array<
  NonNullable<ReturnType<typeof mapWorkspaceV2ProductionShot>> & {
    dialogueEntries?: Array<{ speaker: string; line: string }>;
    imagePrompt?: string | Record<string, unknown>;
    videoPrompt?: string | Record<string, unknown>;
    systemPromptTemplates?: NonNullable<
      ReturnType<typeof parseStoryboardSystemPromptTemplates>
    > | null;
  }
> {
  const scenes = extractEpisodeConfigSceneList(result);
  return scenes
    .map((raw, index) => {
      const shot = mapWorkspaceV2ProductionShot(raw, index, projectId);
      if (!shot) return null;
      if (!raw || typeof raw !== "object") return shot;

      const o = raw as Record<string, unknown>;
      // 对白以 video_prompt.dialogue 为准；为空时回退 scene.dialogue
      const dialogueRaw = resolveSceneStructuredDialogueRaw(o);
      const dialogueFields = dialogueRaw
        ? mapStructuredDialogueFields(dialogueRaw)
        : {};

      const rawImagePrompt = asGenerationPrompt(o.image_prompt);
      const rawVideoPrompt = asGenerationPrompt(o.video_prompt);
      const systemPromptTemplates = parseStoryboardSystemPromptTemplates(
        o.system_prompt_templates,
      );

      return {
        ...shot,
        ...dialogueFields,
        ...(rawImagePrompt ? { imagePrompt: rawImagePrompt } : {}),
        ...(rawVideoPrompt ? { videoPrompt: rawVideoPrompt } : {}),
        ...(systemPromptTemplates ? { systemPromptTemplates } : {}),
      };
    })
    .filter((shot): shot is NonNullable<typeof shot> => shot != null);
}

// ==================== 导出合成视频 ====================

export interface WorkspaceV2ExportTokenResult {
  download_token: string;
  expires_in?: number;
}

function resolveWorkspaceV2ExportToken(payload: unknown): string {
  if (typeof payload === "string" && payload.trim()) return payload.trim();
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    const token =
      asTrimmedString(o.download_token) ||
      asTrimmedString(o.token) ||
      asTrimmedString(o.downloadToken);
    if (token) return token;
  }
  throw new Error("导出 token 无效");
}

/**
 * 签发短时效下载 token — POST /projects/{id}/export/token
 * @see http://your-server:1242/docs
 */
export async function createWorkspaceV2ExportToken(
  projectId: string,
  name: string,
  scope: "full" | "current" = "full",
): Promise<WorkspaceV2ExportTokenResult> {
  const params = new URLSearchParams({
    name,
    scope,
  });
  const payload = await requestWorkspaceV2<unknown>(
    `/projects/${encodeURIComponent(projectId)}/export/token?${params.toString()}`,
    { method: "POST" },
  );
  return { download_token: resolveWorkspaceV2ExportToken(payload) };
}

/**
 * 构造合成视频下载 URL — GET /projects/{id}/export/merged-video
 * @see http://your-server:1242/docs
 */
export function getWorkspaceV2MergedVideoDownloadUrl(
  projectId: string,
  name: string,
  episode: number,
  downloadToken: string,
): string {
  const params = new URLSearchParams({
    name,
    episode: String(episode),
    download_token: downloadToken,
  });
  return `${WORKSPACE_V2_API_BASE}/projects/${encodeURIComponent(projectId)}/export/merged-video?${params.toString()}`;
}
