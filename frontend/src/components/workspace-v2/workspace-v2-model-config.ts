import { PROVIDER_NAMES } from "@/components/ui/ProviderIcon";
import type { WorkspaceV2CreateForm } from "@/components/workspace-v2/WorkspaceV2CreateProjectModal";
import type { GetSystemConfigResponse } from "@/types/system";

export interface WorkspaceV2ModelConfigSnapshot {
  textBackends: string[];
  imageBackends: string[];
  imageBackendsI2I: string[];
  videoBackends: string[];
  providerNames: Record<string, string>;
  defaults: {
    text: string;
    image: string;
    imageI2I: string;
    video: string;
  };
}

export function snapshotFromSystemConfig(res: GetSystemConfigResponse): WorkspaceV2ModelConfigSnapshot {
  const { settings, options } = res;
  return {
    textBackends: options.text_backends ?? [],
    imageBackends: options.image_backends_t2i ?? options.image_backends ?? [],
    imageBackendsI2I: options.image_backends_i2i ?? options.image_backends ?? [],
    videoBackends: options.video_backends ?? [],
    providerNames: { ...PROVIDER_NAMES, ...(options.provider_names ?? {}) },
    defaults: {
      text: settings.text_backend_script?.trim() ?? "",
      image: (settings.default_image_backend_t2i ?? settings.default_image_backend ?? "").trim(),
      imageI2I: (settings.default_image_backend_i2i ?? settings.default_image_backend ?? "").trim(),
      video: settings.default_video_backend?.trim() ?? "",
    },
  };
}

/** 全局「模型配置」是否已保存有效的默认文本/文生图/视频模型，且选项列表非空。图生图可选。 */
export function isWorkspaceV2GlobalModelConfigReady(
  snapshot: WorkspaceV2ModelConfigSnapshot | null,
): boolean {
  if (!snapshot) return false;
  const { defaults, textBackends, imageBackends, videoBackends } = snapshot;
  if (!defaults.text || !defaults.image || !defaults.video) return false;
  if (textBackends.length === 0 || imageBackends.length === 0 || videoBackends.length === 0) {
    return false;
  }
  return (
    textBackends.includes(defaults.text) &&
    imageBackends.includes(defaults.image) &&
    videoBackends.includes(defaults.video)
  );
}

export function isWorkspaceV2CreateFormModelsComplete(
  form: Pick<WorkspaceV2CreateForm, "textModel" | "imageModel" | "imageModelI2I" | "videoModel">,
  snapshot: WorkspaceV2ModelConfigSnapshot | null,
): boolean {
  if (!snapshot) return false;
  const { textModel, imageModel, imageModelI2I, videoModel } = form;
  if (!textModel.trim() || !imageModel.trim() || !videoModel.trim()) {
    return false;
  }
  const i2i = imageModelI2I.trim();
  if (i2i && !snapshot.imageBackendsI2I.includes(i2i)) {
    return false;
  }
  return (
    snapshot.textBackends.includes(textModel) &&
    snapshot.imageBackends.includes(imageModel) &&
    snapshot.videoBackends.includes(videoModel)
  );
}

/** 编辑时把项目已保存的模型并入选项列表，避免与全局配置校验不一致导致无法保存。 */
export function mergeWorkspaceV2ModelConfigWithForm(
  snapshot: WorkspaceV2ModelConfigSnapshot,
  form: Pick<WorkspaceV2CreateForm, "textModel" | "imageModel" | "imageModelI2I" | "videoModel">,
): WorkspaceV2ModelConfigSnapshot {
  const append = (list: string[], value: string) => {
    const trimmed = value.trim();
    if (!trimmed || list.includes(trimmed)) return list;
    return [...list, trimmed];
  };

  return {
    ...snapshot,
    textBackends: append(snapshot.textBackends, form.textModel),
    imageBackends: append(snapshot.imageBackends, form.imageModel),
    imageBackendsI2I: append(snapshot.imageBackendsI2I, form.imageModelI2I),
    videoBackends: append(snapshot.videoBackends, form.videoModel),
  };
}

export function canSubmitWorkspaceV2CreateProject(
  form: WorkspaceV2CreateForm,
  snapshot: WorkspaceV2ModelConfigSnapshot | null,
  styleTemplateIds: string[],
): boolean {
  if (!form.projectName.trim()) return false;
  if (!form.visualStyleId || !styleTemplateIds.includes(form.visualStyleId)) return false;
  if (!isWorkspaceV2GlobalModelConfigReady(snapshot)) return false;
  if (!isWorkspaceV2CreateFormModelsComplete(form, snapshot)) return false;
  return true;
}

/** 编辑项目：不要求全局默认模型已配置，允许保留项目内已有模型。 */
export function canSubmitWorkspaceV2EditProject(
  form: WorkspaceV2CreateForm,
  snapshot: WorkspaceV2ModelConfigSnapshot | null,
  styleTemplateIds: string[],
  initialVisualStyleId?: string,
): boolean {
  if (!form.projectName.trim()) return false;
  if (!form.visualStyleId) return false;
  const styleOk =
    styleTemplateIds.includes(form.visualStyleId) ||
    (initialVisualStyleId != null && form.visualStyleId === initialVisualStyleId);
  if (!styleOk) return false;
  return isWorkspaceV2CreateFormModelsComplete(form, snapshot);
}
