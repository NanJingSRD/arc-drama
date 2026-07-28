import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, X } from "lucide-react";
import { GlassModal } from "@/components/ui/GlassModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { ProviderModelSelect } from "@/components/ui/ProviderModelSelect";
import { INPUT_CLS, radioCardClass } from "@/components/ui/darkroom-tokens";
import { useAppStore } from "@/stores/app-store";
import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import { buildWorkspaceV2CreatePayload, buildWorkspaceV2UpdatePayload, createWorkspaceV2Project, updateWorkspaceV2Project } from "@/api/workspace-v2";
import type { WorkspaceV2StyleTemplatesResult } from "@/api/workspace-v2";
import { DEFAULT_TEMPLATE_ID } from "@/data/style-templates";
import { errMsg } from "@/utils/async";
import {
  WORKSPACE_V2_MODAL_PANEL_CLASS,
  WORKSPACE_V2_MODAL_WIDTH_CLASS,
} from "./workspace-v2-modal-layout";
import { WS2_GHOST_BTN_CLS, WS2_MODAL_PANEL_CLASS } from "./workspace-v2-theme";
import { cn } from "@/lib/utils";
import {
  canSubmitWorkspaceV2CreateProject,
  canSubmitWorkspaceV2EditProject,
  mergeWorkspaceV2ModelConfigWithForm,
  snapshotFromSystemConfig,
  type WorkspaceV2ModelConfigSnapshot,
} from "./workspace-v2-model-config";
import {
  WORKSPACE_V2_IMAGE_RESOLUTIONS,
  WORKSPACE_V2_SHOT_DURATION,
  WORKSPACE_V2_VIDEO_RESOLUTIONS,
  type WorkspaceV2AspectRatio,
  type WorkspaceV2CreationMode,
  type WorkspaceV2ImageResolution,
  type WorkspaceV2ScriptAdaptation,
  type WorkspaceV2SelectOption,
  type WorkspaceV2VideoResolution,
} from "@/data/workspace-v2-create-options";

export interface WorkspaceV2CreateForm {
  projectName: string;
  creationMode: WorkspaceV2CreationMode;
  scriptAdaptation: WorkspaceV2ScriptAdaptation;
  aspectRatio: WorkspaceV2AspectRatio;
  visualStyleId: string;
  textModel: string;
  /** 文生图（T2I） */
  imageModel: string;
  /** 图生图（I2I） */
  imageModelI2I: string;
  videoModel: string;
  imageResolution: WorkspaceV2ImageResolution;
  videoResolution: WorkspaceV2VideoResolution;
  shotDurationSec: number;
}

const DEFAULT_FORM: WorkspaceV2CreateForm = {
  projectName: "",
  creationMode: "series",
  scriptAdaptation: "ai_rewrite",
  aspectRatio: "16:9",
  visualStyleId: DEFAULT_TEMPLATE_ID,
  textModel: "",
  imageModel: "",
  imageModelI2I: "",
  videoModel: "",
  imageResolution: "1k",
  videoResolution: "1080p",
  shotDurationSec: WORKSPACE_V2_SHOT_DURATION.default,
};

function createFormFromModelConfig(snapshot: WorkspaceV2ModelConfigSnapshot): WorkspaceV2CreateForm {
  return {
    ...DEFAULT_FORM,
    textModel: snapshot.defaults.text,
    imageModel: snapshot.defaults.image,
    // 图生图可选：不预填全局默认，仅用户主动选择后才提交
    imageModelI2I: "",
    videoModel: snapshot.defaults.video,
  };
}

interface WorkspaceV2CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  onUpdated?: () => void;
  mode?: "create" | "edit";
  editProjectId?: string;
  initialForm?: WorkspaceV2CreateForm | null;
  styleTemplates: WorkspaceV2StyleTemplatesResult | null;
  styleTemplatesLoading?: boolean;
  styleTemplatesError?: string | null;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-3">
      {children}
    </h3>
  );
}

function OptionCards<T extends string>({
  name,
  value,
  options,
  onChange,
  columns = 2,
  readOnly = false,
}: {
  name: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  readOnly?: boolean;
}) {
  const gridCls = columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={`grid gap-2 ${gridCls} ${readOnly ? "pointer-events-none opacity-80" : ""}`}>
      {options.map((opt) => (
        <label key={opt.value} className={radioCardClass(value === opt.value)}>
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === opt.value}
            disabled={readOnly}
            onChange={() => onChange(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function ResolutionList<T extends string>({
  name,
  value,
  options,
  onChange,
  readOnly = false,
}: {
  name: string;
  value: T;
  options: WorkspaceV2SelectOption<T>[];
  onChange: (value: T) => void;
  readOnly?: boolean;
}) {
  return (
    <div className={`space-y-2 ${readOnly ? "pointer-events-none opacity-80" : ""}`}>
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 rounded-[8px] border px-3 py-2.5 ${
            readOnly ? "cursor-default" : "cursor-pointer"
          } ${
            value === opt.value
              ? "border-cyan-400/55 bg-cyan-400/10"
              : "border-hairline bg-bg-grad-a/40 hover:border-hairline-strong"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="mt-0.5"
            checked={value === opt.value}
            disabled={readOnly}
            onChange={() => onChange(opt.value)}
          />
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-text">{opt.label}</span>
            {opt.hint ? (
              <span className="mt-0.5 block text-[11px] text-text-3">{opt.hint}</span>
            ) : null}
          </span>
        </label>
      ))}
    </div>
  );
}

export function WorkspaceV2CreateProjectModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  mode = "create",
  editProjectId,
  initialForm = null,
  styleTemplates,
  styleTemplatesLoading = false,
  styleTemplatesError = null,
}: WorkspaceV2CreateProjectModalProps) {
  const isEdit = mode === "edit";
  /** 编辑弹框：全部字段只读（含 AI 模型），暂不支持修改。 */
  const viewOnly = isEdit;
  const { t } = useTranslation("templates");
  const reactId = useId();
  const titleId = `${reactId}-create-title`;
  const descId = `${reactId}-create-desc`;
  const [form, setForm] = useState<WorkspaceV2CreateForm>(DEFAULT_FORM);
  const [styleCategory, setStyleCategory] = useState<"live" | "anim">("live");
  const [nameError, setNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modelConfigLoading, setModelConfigLoading] = useState(false);
  const [modelConfigError, setModelConfigError] = useState<string | null>(null);
  const [modelConfig, setModelConfig] = useState<WorkspaceV2ModelConfigSnapshot | null>(null);
  const pushToast = useAppStore((s) => s.pushToast);

  const visibleStyles = styleTemplates?.[styleCategory] ?? [];
  const allStyleIds = useMemo(
    () => [...(styleTemplates?.live ?? []), ...(styleTemplates?.anim ?? [])].map((item) => item.id),
    [styleTemplates],
  );

  const modelConfigForForm = useMemo(() => {
    if (!modelConfig) return null;
    if (!isEdit) return modelConfig;
    return mergeWorkspaceV2ModelConfigWithForm(modelConfig, form);
  }, [modelConfig, isEdit, form.textModel, form.imageModel, form.imageModelI2I, form.videoModel]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setModelConfigLoading(true);
    setModelConfigError(null);
    setModelConfig(null);
    setNameError("");

    if (isEdit && initialForm) {
      setForm(initialForm);
      if (styleTemplates) {
        const inLive = styleTemplates.live.some((item) => item.id === initialForm.visualStyleId);
        setStyleCategory(inLive ? "live" : "anim");
      }
    } else {
      setForm(DEFAULT_FORM);
      setStyleCategory("live");
    }

    void WorkspaceV2SettingsAPI.getSystemConfig()
      .then((res) => {
        if (cancelled) return;
        const snapshot = snapshotFromSystemConfig(res);
        setModelConfig(
          isEdit && initialForm
            ? mergeWorkspaceV2ModelConfigWithForm(snapshot, initialForm)
            : snapshot,
        );
        if (!isEdit) {
          setForm(createFormFromModelConfig(snapshot));
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setModelConfigError(errMsg(err));
      })
      .finally(() => {
        if (!cancelled) setModelConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, initialForm, styleTemplates]);

  useEffect(() => {
    if (!styleTemplates) return;

    const allStyleIds = [...styleTemplates.live, ...styleTemplates.anim].map((item) => item.id);
    if (allStyleIds.length === 0) return;

    setForm((prev) => {
      if (allStyleIds.includes(prev.visualStyleId)) return prev;

      const preferred = allStyleIds.includes(DEFAULT_TEMPLATE_ID)
        ? DEFAULT_TEMPLATE_ID
        : allStyleIds[0];
      return preferred ? { ...prev, visualStyleId: preferred } : prev;
    });
  }, [styleTemplates]);

  const patch = (next: Partial<WorkspaceV2CreateForm>) => {
    setForm((prev) => ({ ...prev, ...next }));
  };

  const canSubmit =
    !submitting &&
    !modelConfigLoading &&
    !modelConfigError &&
    (isEdit
      ? canSubmitWorkspaceV2EditProject(
          form,
          modelConfigForForm,
          allStyleIds,
          initialForm?.visualStyleId,
        )
      : canSubmitWorkspaceV2CreateProject(form, modelConfig, allStyleIds));

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setStyleCategory("live");
    setNameError("");
    onClose();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    if (!form.projectName.trim()) {
      setNameError("请输入项目名称");
      return;
    }

    setSubmitting(true);

    if (isEdit) {
      if (!editProjectId) {
        setSubmitting(false);
        return;
      }

      void updateWorkspaceV2Project(editProjectId, buildWorkspaceV2UpdatePayload(form))
        .then(() => {
          pushToast(`项目「${form.projectName.trim()}」已保存`, "success");
          onUpdated?.();
          handleClose();
        })
        .catch((err: unknown) => {
          pushToast(`保存失败：${errMsg(err)}`, "error");
        })
        .finally(() => {
          setSubmitting(false);
        });
      return;
    }

    void createWorkspaceV2Project(buildWorkspaceV2CreatePayload(form))
      .then((resp) => {
        pushToast(`项目「${form.projectName.trim()}」已创建`, "success");
        onCreated?.();
        handleClose();
        return resp;
      })
      .catch((err: unknown) => {
        pushToast(`创建失败：${errMsg(err)}`, "error");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <GlassModal
      open={open}
      onClose={handleClose}
      labelledBy={titleId}
      describedBy={descId}
      widthClassName={WORKSPACE_V2_MODAL_WIDTH_CLASS}
      backdropStyle={{ background: "oklch(0 0 0 / 0.65)" }}
      panelClassName={cn(WS2_MODAL_PANEL_CLASS, WORKSPACE_V2_MODAL_PANEL_CLASS)}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            {isEdit ? "编辑项目" : "新建项目"}
          </h2>
          <p id={descId} className="mt-1 text-sm text-muted-foreground">
            {isEdit
              ? "项目信息暂不支持修改"
              : "一站式 AI 短剧/影片生成配置，自定义全流程视频参数"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} aria-label="关闭">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-6">
        <section>
          <SectionTitle>基础项目信息</SectionTitle>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor={`${reactId}-name`} required={!isEdit}>
                项目名称
              </FieldLabel>
              <Input
                id={`${reactId}-name`}
                type="text"
                value={form.projectName}
                readOnly={viewOnly}
                disabled={viewOnly}
                onChange={(e) => {
                  setNameError("");
                  patch({ projectName: e.target.value });
                }}
                placeholder="请输入你的项目名称，例如：都市逆袭短剧第一集"
                className={viewOnly ? "cursor-not-allowed opacity-70" : undefined}
              />
              {nameError ? (
                <p className="mt-1.5 text-[11px] text-warm-bright">{nameError}</p>
              ) : null}
            </div>

            <div>
              <FieldLabel>创作模式</FieldLabel>
              <OptionCards
                name="creation-mode"
                value={form.creationMode}
                onChange={(creationMode) => patch({ creationMode })}
                readOnly={viewOnly}
                options={[
                  { value: "series", label: "剧集模式" },
                  { value: "narration", label: "旁白模式" },
                ]}
              />
            </div>

            {form.creationMode === "series" ? (
              <div>
                <FieldLabel trailing={<span className="text-[10px] text-text-4">剧集模式专属</span>}>
                  剧本改写
                </FieldLabel>
                <OptionCards
                  name="script-adaptation"
                  value={form.scriptAdaptation}
                  onChange={(scriptAdaptation) => patch({ scriptAdaptation })}
                  readOnly={viewOnly}
                  options={[
                    { value: "ai_rewrite", label: "AI 改写为剧本（推荐）" },
                    { value: "original", label: "原始剧本" },
                  ]}
                />
              </div>
            ) : null}

            <div>
              <FieldLabel>视频比例</FieldLabel>
              <OptionCards
                name="aspect-ratio"
                value={form.aspectRatio}
                onChange={(aspectRatio) => patch({ aspectRatio })}
                readOnly={viewOnly}
                options={[
                  { value: "16:9", label: "横屏 16:9" },
                  { value: "9:16", label: "竖屏 9:16" },
                ]}
              />
            </div>
          </div>
        </section>

        <section>
          <SectionTitle>视觉风格库</SectionTitle>
          <div className="mb-3 flex w-fit gap-1 rounded-[8px] border border-hairline bg-bg-grad-a/55 p-1">
            {(["live", "anim"] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setStyleCategory(category)}
                className={`rounded-[6px] px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  styleCategory === category
                    ? "bg-cyan-400/15 text-cyan-300"
                    : "text-text-3 hover:text-text"
                }`}
              >
                {t(`category.${category}`)}
              </button>
            ))}
          </div>
          {styleTemplatesLoading ? (
            <p className="text-[13px] text-text-3">加载风格模板中...</p>
          ) : styleTemplatesError ? (
            <p className="text-[13px] text-warm-bright">风格模板加载失败：{styleTemplatesError}</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {visibleStyles.map((style) => {
                const selected = form.visualStyleId === style.id;
                const cardClass = `rounded-[10px] border px-3 py-3 text-left ${
                  selected
                    ? "border-cyan-400/55 bg-cyan-400/10 shadow-[0_0_20px_-8px_rgba(34,211,238,0.45)]"
                    : "border-hairline bg-bg-grad-a/40"
                }`;
                const cardBody = (
                  <>
                    <p className="text-[13px] font-semibold text-text">{style.name}</p>
                    {style.prompt ? (
                      <p
                        className="mt-1 line-clamp-2 text-[11px] leading-snug text-text-3"
                        title={style.prompt}
                      >
                        {style.prompt}
                      </p>
                    ) : null}
                  </>
                );

                if (viewOnly) {
                  return (
                    <div key={style.id} className={cardClass}>
                      {cardBody}
                    </div>
                  );
                }

                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => patch({ visualStyleId: style.id })}
                    className={`${cardClass} hover:border-hairline-strong hover:bg-bg-grad-a/70`}
                  >
                    {cardBody}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <SectionTitle>AI 模型配置</SectionTitle>
          {modelConfigLoading ? (
            <div className="flex items-center gap-2 py-2 text-text-3">
              <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-text-3" />
              <span className="text-[13px]">加载模型配置中...</span>
            </div>
          ) : modelConfigError ? (
            <p className="text-[13px] text-warm-bright">模型配置加载失败：{modelConfigError}</p>
          ) : (
          <>
          <div className="space-y-4">
            <div>
              <FieldLabel htmlFor={`${reactId}-text-model`}>文本大模型</FieldLabel>
              <ProviderModelSelect
                value={form.textModel}
                options={modelConfigForForm?.textBackends ?? []}
                providerNames={modelConfigForForm?.providerNames ?? {}}
                onChange={(textModel) => patch({ textModel })}
                aria-label="文本大模型"
                compact
                searchable
                disabled={viewOnly}
              />
            </div>
            <div>
              <FieldLabel htmlFor={`${reactId}-image-model`}>文生图模型</FieldLabel>
              <ProviderModelSelect
                value={form.imageModel}
                options={modelConfigForForm?.imageBackends ?? []}
                providerNames={modelConfigForForm?.providerNames ?? {}}
                onChange={(imageModel) => patch({ imageModel })}
                aria-label="文生图模型"
                compact
                searchable
                disabled={viewOnly}
              />
            </div>
            <div>
              <FieldLabel htmlFor={`${reactId}-image-model-i2i`}>图生图模型</FieldLabel>
              <ProviderModelSelect
                value={form.imageModelI2I}
                options={modelConfigForForm?.imageBackendsI2I ?? []}
                providerNames={modelConfigForForm?.providerNames ?? {}}
                onChange={(imageModelI2I) => patch({ imageModelI2I })}
                aria-label="图生图模型"
                allowDefault
                defaultLabel="不选择"
                compact
                searchable
                disabled={viewOnly}
              />
            </div>
            <div>
              <FieldLabel htmlFor={`${reactId}-video-model`}>视频生成模型</FieldLabel>
              <ProviderModelSelect
                value={form.videoModel}
                options={modelConfigForForm?.videoBackends ?? []}
                providerNames={modelConfigForForm?.providerNames ?? {}}
                onChange={(videoModel) => patch({ videoModel })}
                aria-label="视频生成模型"
                compact
                searchable
                disabled={viewOnly}
              />
            </div>
            <div>
              <FieldLabel>图片分辨率</FieldLabel>
              <ResolutionList
                name="image-resolution"
                value={form.imageResolution}
                options={WORKSPACE_V2_IMAGE_RESOLUTIONS}
                onChange={(imageResolution) => patch({ imageResolution })}
                readOnly={viewOnly}
              />
            </div>
            <div>
              <FieldLabel>视频分辨率</FieldLabel>
              <ResolutionList
                name="video-resolution"
                value={form.videoResolution}
                options={WORKSPACE_V2_VIDEO_RESOLUTIONS}
                onChange={(videoResolution) => patch({ videoResolution })}
                readOnly={viewOnly}
              />
            </div>
          </div>

          <div className={`mt-5 ${viewOnly ? "pointer-events-none opacity-80" : ""}`}>
            <div className="mb-2 flex items-center justify-between">
              <FieldLabel className="mb-0">单分镜时长</FieldLabel>
              <span className="text-[13px] font-semibold text-text">
                {form.shotDurationSec}s
              </span>
            </div>
            <input
              type="range"
              min={WORKSPACE_V2_SHOT_DURATION.min}
              max={WORKSPACE_V2_SHOT_DURATION.max}
              value={form.shotDurationSec}
              disabled={viewOnly}
              onChange={(e) => patch({ shotDurationSec: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
            <div className="mt-1 flex justify-between text-[11px] text-text-4">
              <span>{WORKSPACE_V2_SHOT_DURATION.min} 秒</span>
              <span>{WORKSPACE_V2_SHOT_DURATION.max} 秒</span>
            </div>
          </div>
          </>
          )}
        </section>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border px-6 py-4">
        {isEdit ? (
          <Button variant="outline" onClick={handleClose} className={WS2_GHOST_BTN_CLS}>
            取消
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={handleClose} className={WS2_GHOST_BTN_CLS}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? "创建中..." : "创建项目"}
            </Button>
          </>
        )}
      </div>
    </GlassModal>
  );
}
