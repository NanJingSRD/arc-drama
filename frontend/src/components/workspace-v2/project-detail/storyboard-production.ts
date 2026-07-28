import type { CameraMotion, ShotType, VideoPrompt } from "@/types";
import { CAMERA_MOTIONS, SHOT_TYPES } from "@/types";
import {
  isStructuredImagePrompt,
  isStructuredVideoPrompt,
} from "@/utils/prompt-shape";

export interface StoryboardDialogueEntry {
  speaker: string;
  line: string;
}

export interface StoryboardShot {
  id: string;
  shotNumber: number;
  title: string;
  /** 接口 scene_id，卡片分镜名称优先用此字段 */
  sceneId?: string;
  thumbnailUrl?: string;
  /** 分镜图（generated_assets.storyboard_image 等） */
  storyboardImageUrl?: string;
  /** 分镜视频（generated_assets.video_clip / video_uri 等） */
  storyboardVideoUrl?: string;
  /** 分镜已授权上传外部平台 */
  authorized?: boolean;
  durationSec: number;
  visual: string;
  /** 分镜图生成用 image_prompt（可与 visual 展示文案不同） */
  imagePrompt?: string | Record<string, unknown>;
  /** 分镜视频生成用 video_prompt */
  videoPrompt?: string | Record<string, unknown>;
  action?: string;
  /** 纯文本对白（兼容旧字段） */
  dialogue?: string;
  /** 结构化对白（config.scenes[].dialogue） */
  dialogueEntries?: StoryboardDialogueEntry[];
  narration?: string;
  /** 绑定角色（API: characters_in_scene） */
  characters?: string[];
  /** 绑定场景（API: scenes） */
  scenes?: string[];
  /** 绑定道具（API: props） */
  props?: string[];
  /** episodes[].scenes[].system_prompt_templates（镜头级） */
  systemPromptTemplates?: StoryboardSystemPromptTemplates | null;
}

/** 分镜图提示词草稿：仅来自 image_prompt，缺省置空 */
export interface StoryboardImagePromptDraft {
  scene: string;
  composition: {
    shot_type: ShotType | "";
    lighting: string;
    ambiance: string;
  };
}

/** 分镜视频提示词草稿：仅来自 video_prompt，缺省置空 */
export interface StoryboardVideoPromptDraft {
  action: string;
  camera_motion: CameraMotion | "";
  ambiance_audio: string;
  dialogue: VideoPrompt["dialogue"];
}

const EMPTY_IMAGE_PROMPT_DRAFT: StoryboardImagePromptDraft = {
  scene: "",
  composition: {
    shot_type: "",
    lighting: "",
    ambiance: "",
  },
};

const EMPTY_VIDEO_PROMPT_DRAFT: StoryboardVideoPromptDraft = {
  action: "",
  camera_motion: "",
  ambiance_audio: "",
  dialogue: [],
};

function asPromptText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function coerceShotType(value: string): ShotType | "" {
  return (SHOT_TYPES as readonly string[]).includes(value) ? (value as ShotType) : "";
}

function coerceCameraMotion(value: string): CameraMotion | "" {
  return (CAMERA_MOTIONS as readonly string[]).includes(value)
    ? (value as CameraMotion)
    : "";
}

/** 规范化 image_prompt；无该字段或无效时置空（不回退 visual） */
export function normalizeStoryboardImagePromptDraft(
  prompt: StoryboardShot["imagePrompt"],
): StoryboardImagePromptDraft {
  if (isStructuredImagePrompt(prompt)) {
    return {
      scene: prompt.scene.trim(),
      composition: {
        shot_type: coerceShotType(prompt.composition.shot_type),
        lighting: prompt.composition.lighting ?? "",
        ambiance: prompt.composition.ambiance ?? "",
      },
    };
  }
  if (prompt && typeof prompt === "object") {
    const o = prompt as Record<string, unknown>;
    const composition =
      o.composition && typeof o.composition === "object"
        ? (o.composition as Record<string, unknown>)
        : {};
    return {
      scene: asPromptText(o.scene),
      composition: {
        shot_type: coerceShotType(asPromptText(composition.shot_type)),
        lighting: asPromptText(composition.lighting),
        ambiance: asPromptText(composition.ambiance),
      },
    };
  }
  if (typeof prompt === "string" && prompt.trim()) {
    return {
      scene: prompt.trim(),
      composition: { ...EMPTY_IMAGE_PROMPT_DRAFT.composition },
    };
  }
  return {
    scene: "",
    composition: { ...EMPTY_IMAGE_PROMPT_DRAFT.composition },
  };
}

/** 规范化对白条目；忽略非对象项，保留空 speaker/line 以便编辑态可改 */
function normalizeDialogueEntries(raw: unknown): VideoPrompt["dialogue"] {
  if (!Array.isArray(raw)) return [];
  const out: VideoPrompt["dialogue"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const speaker = typeof o.speaker === "string" ? o.speaker : "";
    const line = typeof o.line === "string" ? o.line : "";
    out.push({ speaker, line });
  }
  return out;
}

/** 规范化 video_prompt；无该字段或无效时置空（不回退 action / image_prompt） */
export function normalizeStoryboardVideoPromptDraft(
  prompt: StoryboardShot["videoPrompt"],
): StoryboardVideoPromptDraft {
  if (isStructuredVideoPrompt(prompt)) {
    return {
      action: prompt.action.trim(),
      camera_motion: coerceCameraMotion(prompt.camera_motion),
      ambiance_audio: prompt.ambiance_audio ?? "",
      dialogue: normalizeDialogueEntries(prompt.dialogue ?? []),
    };
  }
  if (prompt && typeof prompt === "object") {
    const o = prompt as Record<string, unknown>;
    return {
      action: asPromptText(o.action),
      camera_motion: coerceCameraMotion(asPromptText(o.camera_motion)),
      ambiance_audio: asPromptText(o.ambiance_audio),
      dialogue: normalizeDialogueEntries(o.dialogue),
    };
  }
  if (typeof prompt === "string" && prompt.trim()) {
    return {
      ...EMPTY_VIDEO_PROMPT_DRAFT,
      action: prompt.trim(),
    };
  }
  return { ...EMPTY_VIDEO_PROMPT_DRAFT, dialogue: [] };
}

/**
 * 视频卡片草稿：对白以 video_prompt.dialogue 为准；
 * 为空时回退 scene.dialogue（dialogueEntries，兼容旧数据）。时长仍由 shot.durationSec 单独传入。
 */
export function resolveStoryboardVideoPromptDraft(
  shot: Pick<StoryboardShot, "videoPrompt" | "dialogueEntries">,
): StoryboardVideoPromptDraft {
  const draft = normalizeStoryboardVideoPromptDraft(shot.videoPrompt);
  if (draft.dialogue.length > 0) return draft;
  const fallback = shot.dialogueEntries;
  if (fallback?.length) {
    return {
      ...draft,
      dialogue: fallback.map((entry) => ({
        speaker: entry.speaker,
        line: entry.line,
      })),
    };
  }
  return draft;
}

/** 分镜生成用的 segment id：优先 scene_id */
export function resolveStoryboardSegmentId(
  shot: Pick<StoryboardShot, "sceneId" | "id">,
): string {
  return shot.sceneId?.trim() || shot.id;
}

/** 仅使用 image_prompt；缺失则空字符串 */
export function resolveStoryboardImagePrompt(
  shot: Pick<StoryboardShot, "imagePrompt">,
): string | Record<string, unknown> {
  if (typeof shot.imagePrompt === "string" && shot.imagePrompt.trim()) {
    return shot.imagePrompt.trim();
  }
  if (shot.imagePrompt && typeof shot.imagePrompt === "object") {
    return shot.imagePrompt;
  }
  return "";
}

/** 仅使用 video_prompt；缺失则空字符串（不回退 image_prompt） */
export function resolveStoryboardVideoPrompt(
  shot: Pick<StoryboardShot, "videoPrompt">,
): string | Record<string, unknown> {
  if (typeof shot.videoPrompt === "string" && shot.videoPrompt.trim()) {
    return shot.videoPrompt.trim();
  }
  if (shot.videoPrompt && typeof shot.videoPrompt === "object") {
    return shot.videoPrompt;
  }
  return "";
}

/** episodes[].scenes[].system_prompt_templates — 分镜图 / 视频系统提示词模板（镜头级） */
export interface StoryboardSystemPromptTemplates {
  storyboard: Record<string, string>;
  video: Record<string, string>;
}

export interface StoryboardEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  description: string;
  status?: string;
  scriptStatus?: string;
  coverUrl?: string;
  shots: StoryboardShot[];
}

/** 镜头图/视频提示词是否均为空（用于判断本集是否尚未生成分镜配置） */
export function isStoryboardShotPromptEmpty(
  shot: Pick<StoryboardShot, "imagePrompt" | "videoPrompt" | "dialogueEntries">,
): boolean {
  const image = normalizeStoryboardImagePromptDraft(shot.imagePrompt);
  const video = resolveStoryboardVideoPromptDraft(shot);
  const imageEmpty =
    !image.scene.trim() &&
    !image.composition.shot_type &&
    !image.composition.lighting.trim() &&
    !image.composition.ambiance.trim();
  const videoEmpty =
    !video.action.trim() &&
    !video.camera_motion &&
    !video.ambiance_audio.trim() &&
    video.dialogue.length === 0;
  return imageEmpty && videoEmpty;
}

/** 本集是否尚未生成分镜配置：无镜头，或所有镜头图/视频提示词皆空 */
export function episodeNeedsStoryboardConfig(
  episode: Pick<StoryboardEpisode, "shots"> | null | undefined,
): boolean {
  if (!episode) return false;
  if (episode.shots.length === 0) return true;
  return episode.shots.every(isStoryboardShotPromptEmpty);
}

/** 集序号，如 E01 */
export function formatStoryboardEpisodeCode(episodeNumber: number): string {
  return `E${String(episodeNumber).padStart(2, "0")}`;
}

/** 分镜序号，如 E101（第 1 集第 1 镜） */
export function formatStoryboardShotCode(episodeNumber: number, shotNumber: number): string {
  return `E${episodeNumber}${String(shotNumber).padStart(2, "0")}`;
}

/** 分镜展示名：优先 scene_id，否则回退本地编码 */
export function resolveStoryboardShotLabel(
  episodeNumber: number,
  shot: Pick<StoryboardShot, "sceneId" | "shotNumber">,
): string {
  const sceneId = shot.sceneId?.trim();
  if (sceneId) return sceneId;
  return formatStoryboardShotCode(episodeNumber, shot.shotNumber);
}

export function formatStoryboardEpisodeHeading(episode: StoryboardEpisode): string {
  const name = episode.title.trim();
  if (!name) return `第 ${episode.episodeNumber} 集`;
  if (/^第\s*\d+\s*集/.test(name) || name.includes("·")) return name;
  return `第 ${episode.episodeNumber} 集 · ${name}`;
}

const SYSTEM_PROMPT_KEY_LABELS: Record<string, string> = {
  scene_writing_guide: "场景撰写指南",
  lighting_writing_guide: "光线撰写指南",
  ambiance_writing_guide: "氛围撰写指南",
  negative_tail: "负面提示词后缀",
  composition_suffix: "构图后缀",
  action_writing_guide: "动作撰写指南",
  ambiance_audio_writing_guide: "环境音效撰写指南",
  // 部分后端短 key
  scene: "场景描写指南",
  light: "光线描写指南",
  lighting: "光线描写指南",
  ambient: "氛围描写指南",
  ambiance: "氛围描写指南",
  negative: "负面提示词",
  action: "动作撰写指南",
  composition: "构图后缀",
};

/** 分镜图系统提示词：无接口数据时的空表单字段 */
export const DEFAULT_STORYBOARD_SYSTEM_PROMPT_KEYS = [
  "scene_writing_guide",
  "lighting_writing_guide",
  "ambiance_writing_guide",
  "negative_tail",
] as const;

/** 分镜视频系统提示词：无接口数据时的空表单字段 */
export const DEFAULT_VIDEO_SYSTEM_PROMPT_KEYS = [
  "action_writing_guide",
  "ambiance_audio_writing_guide",
  "negative_tail",
] as const;

function parseSystemPromptTemplateGroup(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) out[key] = trimmed;
      continue;
    }
    if (value == null || typeof value === "object") continue;
    const text = String(value).trim();
    if (text) out[key] = text;
  }
  return out;
}

/** 解析 episodes[].scenes[].system_prompt_templates；无有效内容时返回 null */
export function parseStoryboardSystemPromptTemplates(
  raw: unknown,
): StoryboardSystemPromptTemplates | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const storyboard = parseSystemPromptTemplateGroup(o.storyboard);
  const video = parseSystemPromptTemplateGroup(o.video);
  if (Object.keys(storyboard).length === 0 && Object.keys(video).length === 0) {
    return null;
  }
  return { storyboard, video };
}

export function resolveSystemPromptKeyLabel(key: string): string {
  return SYSTEM_PROMPT_KEY_LABELS[key] ?? key;
}
