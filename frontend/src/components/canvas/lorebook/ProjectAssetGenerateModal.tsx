import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Landmark, Package, Upload, User } from "lucide-react";
import { GlassModal } from "@/components/ui/GlassModal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { PreviewableImageFrame } from "@/components/ui/PreviewableImageFrame";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import type { ProjectAssetKind } from "./ProjectAssetGalleryCard";
import {
  ASSET_IMAGE_FRAME_CLASS,
  ASSET_IMAGE_FRAME_IMG_CLASS,
  ASSET_IMAGE_FRAME_STYLE,
  ASSET_PROMPT_TEXTAREA_CLASS,
} from "./projectAssetModalStyles";
import type { AssetPromptTemplate } from "@/types/project";
import {
  buildPromptTemplateLabels,
  formatAssetPromptTemplate,
  parseAssetPromptTemplate,
} from "@/utils/asset-prompt-template";

const KIND_ICON = {
  character: User,
  scene: Landmark,
  prop: Package,
} as const;

const DESIGN_LABEL_KEY = {
  character: "ws2_character_asset_image",
  scene: "ws2_scene_asset_image",
  prop: "ws2_prop_asset_image",
} as const;

const FIELD_STYLE: React.CSSProperties = {
  background: "oklch(0.18 0.010 265 / 0.45)",
  border: "1px solid var(--color-hairline-soft)",
  color: "var(--color-text-2)",
};

export interface ProjectAssetGeneratePayload {
  description: string;
  promptTemplate?: AssetPromptTemplate;
  voiceStyle?: string;
  referenceFile?: File | null;
}

interface ProjectAssetGenerateModalProps {
  open: boolean;
  kind: ProjectAssetKind;
  name: string;
  description: string;
  promptTemplate?: AssetPromptTemplate | null;
  sheetUrl?: string | null;
  voiceStyle?: string;
  referenceImageUrl?: string | null;
  hasSheet: boolean;
  generating?: boolean;
  /** generate — 保存并生成设计图；edit — 仅保存资产信息 */
  mode?: "generate" | "edit";
  onClose: () => void;
  onConfirm: (payload: ProjectAssetGeneratePayload) => Promise<void>;
}

function DetailField({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-text-4)" }}
      >
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function ProjectAssetGenerateModal({
  open,
  kind,
  name,
  description: initialDescription,
  promptTemplate: initialPromptTemplate,
  sheetUrl = null,
  voiceStyle: initialVoiceStyle = "",
  referenceImageUrl,
  hasSheet,
  generating = false,
  mode = "generate",
  onClose,
  onConfirm,
}: ProjectAssetGenerateModalProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const titleId = useId();
  const descId = useId();
  const promptTemplateId = useId();
  const voiceId = useId();
  const TypeIcon = KIND_ICON[kind];
  const designLabel = t(DESIGN_LABEL_KEY[kind]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState(initialDescription);
  const [promptTemplateText, setPromptTemplateText] = useState("");
  const [voiceStyle, setVoiceStyle] = useState(initialVoiceStyle);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const labels = buildPromptTemplateLabels(t);
    setDescription(initialDescription);
    setPromptTemplateText(formatAssetPromptTemplate(initialPromptTemplate, labels));
    setVoiceStyle(initialVoiceStyle);
    setReferenceFile(null);
    setReferencePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [open, initialDescription, initialPromptTemplate, initialVoiceStyle, t]);

  useEffect(() => {
    return () => {
      if (referencePreview) URL.revokeObjectURL(referencePreview);
    };
  }, [referencePreview]);

  const displayedReferenceUrl = referencePreview ?? referenceImageUrl ?? null;
  const descPlaceholder =
    kind === "character"
      ? t("character_desc_placeholder")
      : kind === "scene"
        ? t("scene_desc_placeholder")
        : t("prop_desc_placeholder");

  const confirmLabel =
    mode === "edit"
      ? t("common:save")
      : hasSheet
        ? t("ws2_regenerate_asset_image")
        : t("ws2_generate_asset_image");
  const confirmTestId = mode === "edit" ? "asset-edit-confirm" : "asset-generate-confirm";

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceFile(file);
    setReferencePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    e.target.value = "";
  };

  const clearPendingReference = () => {
    setReferenceFile(null);
    setReferencePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        description,
        promptTemplate: parseAssetPromptTemplate(
          promptTemplateText,
          buildPromptTemplateLabels(t),
        ),
        voiceStyle: kind === "character" ? voiceStyle : undefined,
        referenceFile: kind === "character" ? referenceFile : undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || generating;

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      widthClassName="w-full max-w-2xl"
      panelClassName="flex max-h-[88vh] flex-col"
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-testid={mode === "edit" ? "asset-edit-modal" : undefined}
      >
        <div className="relative shrink-0 px-6 pb-4 pt-5">
          <ModalCloseButton onClick={onClose} className="absolute right-4 top-4" />
          <h2
            id={titleId}
            className="display-serif pr-10 text-[18px] font-semibold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            {name}
          </h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">
          <div className="space-y-4">
            <DetailField label={designLabel}>
              <PreviewableImageFrame
                src={sheetUrl}
                alt={`${name} ${designLabel}`}
                label={t("view_full_image")}
              >
                <div className={ASSET_IMAGE_FRAME_CLASS} style={ASSET_IMAGE_FRAME_STYLE}>
                  {sheetUrl ? (
                    <img
                      src={sheetUrl}
                      alt={`${name} ${designLabel}`}
                      className={ASSET_IMAGE_FRAME_IMG_CLASS}
                    />
                  ) : (
                    <div
                      className="flex flex-col items-center gap-2"
                      style={{ color: "var(--color-text-4)" }}
                    >
                      <TypeIcon className="h-10 w-10" strokeWidth={1.5} />
                      <span className="text-[12px]">{t("click_to_generate")}</span>
                    </div>
                  )}
                </div>
              </PreviewableImageFrame>
            </DetailField>

            <DetailField label={t("ws2_asset_prompt_template")} htmlFor={promptTemplateId}>
              <textarea
                id={promptTemplateId}
                value={promptTemplateText}
                onChange={(e) => setPromptTemplateText(e.target.value)}
                rows={5}
                className={ASSET_PROMPT_TEXTAREA_CLASS}
                style={FIELD_STYLE}
                placeholder={t("ws2_asset_prompt_template_placeholder")}
              />
            </DetailField>

            <DetailField label={t("asset_prompt")} htmlFor={descId}>
              <textarea
                id={descId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className={ASSET_PROMPT_TEXTAREA_CLASS}
                style={FIELD_STYLE}
                placeholder={descPlaceholder}
              />
            </DetailField>

            {kind === "character" ? (
              <DetailField label={t("reference_image")}>
                {displayedReferenceUrl ? (
                  <PreviewableImageFrame
                    src={displayedReferenceUrl}
                    alt={`${name} ${t("reference_image")}`}
                    label={t("view_full_image")}
                  >
                    <div
                      className={`relative ${ASSET_IMAGE_FRAME_CLASS}`}
                      style={ASSET_IMAGE_FRAME_STYLE}
                    >
                      <img
                        src={displayedReferenceUrl}
                        alt={`${name} ${t("reference_image")}`}
                        className={ASSET_IMAGE_FRAME_IMG_CLASS}
                      />
                      <div
                        className="absolute inset-x-0 bottom-0 z-[1] flex items-center justify-between px-3 py-2"
                        style={{
                          background: "linear-gradient(180deg, transparent, oklch(0 0 0 / 0.65))",
                        }}
                      >
                        <span
                          className="flex items-center gap-1.5 text-[11px]"
                          style={{ color: "var(--color-text)" }}
                        >
                          <ImagePlus className="h-3.5 w-3.5" />
                          {referenceFile ? t("unsaved_reference") : t("saved_reference")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {referenceFile ? (
                            <button
                              type="button"
                              onClick={clearPendingReference}
                              className="focus-ring rounded px-2 py-0.5 text-[11px] transition-colors"
                              style={{
                                background: "oklch(0 0 0 / 0.5)",
                                color: "var(--color-text)",
                                border: "1px solid oklch(1 0 0 / 0.1)",
                              }}
                            >
                              {t("cancel_pending")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="focus-ring rounded px-2 py-0.5 text-[11px] transition-colors"
                            style={{
                              background: "oklch(0 0 0 / 0.5)",
                              color: "var(--color-text)",
                              border: "1px solid oklch(1 0 0 / 0.1)",
                            }}
                          >
                            {t("change")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </PreviewableImageFrame>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`focus-ring ${ASSET_IMAGE_FRAME_CLASS} gap-2 border border-dashed text-sm transition-colors`}
                    style={{
                      ...ASSET_IMAGE_FRAME_STYLE,
                      color: "var(--color-text-4)",
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    {t("upload_reference")}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  aria-label={t("upload_character_ref_aria")}
                  onChange={handleReferenceChange}
                  className="hidden"
                />
              </DetailField>
            ) : null}

            {kind === "character" && mode === "generate" ? (
              <DetailField label={t("voice_style")} htmlFor={voiceId}>
                <input
                  id={voiceId}
                  type="text"
                  value={voiceStyle}
                  onChange={(e) => setVoiceStyle(e.target.value)}
                  className="focus-ring w-full rounded-lg px-3 py-2.5 text-[13px] outline-none"
                  style={FIELD_STYLE}
                  placeholder={t("voice_style_example")}
                />
              </DetailField>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-hairline/80 px-6 py-4">
          <SecondaryButton onClick={onClose} disabled={busy}>
            {t("common:cancel")}
          </SecondaryButton>
          <PrimaryButton onClick={() => void handleConfirm()} disabled={busy} data-testid={confirmTestId}>
            {busy ? t("common:saving") : confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </GlassModal>
  );
}
