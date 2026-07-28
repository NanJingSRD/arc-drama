export type WorkspaceV2CreationMode = "series" | "narration";

export type WorkspaceV2ScriptAdaptation = "ai_rewrite" | "original";

export type WorkspaceV2AspectRatio = "16:9" | "9:16";

export type WorkspaceV2VideoGenMethod =
  | "storyboard_to_video"
  | "native_video"
  | "reference_video";

export type WorkspaceV2ImageResolution = "1k" | "2k" | "4k";

export type WorkspaceV2VideoResolution = "1080p" | "720p" | "480p";

export interface WorkspaceV2SelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export const WORKSPACE_V2_VIDEO_GEN_METHODS: WorkspaceV2SelectOption<WorkspaceV2VideoGenMethod>[] =
  [
    { value: "storyboard_to_video", label: "分镜图生视频", hint: "推荐" },
    { value: "native_video", label: "文生视频" },
    { value: "reference_video", label: "首尾帧生视频" },
  ];

export function workspaceV2VideoGenMethodLabel(
  option: WorkspaceV2SelectOption<WorkspaceV2VideoGenMethod>,
): string {
  return option.hint ? `${option.label}（${option.hint}）` : option.label;
}

export const WORKSPACE_V2_IMAGE_RESOLUTIONS: WorkspaceV2SelectOption<WorkspaceV2ImageResolution>[] =
  [
    { value: "1k", label: "1K 草稿预览", hint: "速度快、费用低、默认推荐" },
    { value: "2k", label: "2K 均衡画质", hint: "画质速度平衡，日常首选" },
    { value: "4k", label: "4K 超清画质", hint: "最高画质，耗时与费用更高" },
  ];

export const WORKSPACE_V2_VIDEO_RESOLUTIONS: WorkspaceV2SelectOption<WorkspaceV2VideoResolution>[] =
  [
    { value: "1080p", label: "1080P", hint: "默认" },
    { value: "720p", label: "720P" },
    { value: "480p", label: "480P" },
  ];

export const WORKSPACE_V2_SHOT_DURATION = { min: 4, max: 15, default: 9 } as const;
