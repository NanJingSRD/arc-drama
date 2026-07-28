import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Landmark, Package, User } from "lucide-react";
import { GlassModal } from "@/components/ui/GlassModal";
import { GenerateButton } from "@/components/ui/GenerateButton";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { PreviewableImageFrame } from "@/components/ui/PreviewableImageFrame";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import type { AssetPromptTemplate } from "@/types/project";
import {
  buildPromptTemplateLabels,
  formatAssetPromptTemplate,
} from "@/utils/asset-prompt-template";
import type { ProjectAssetKind } from "./ProjectAssetGalleryCard";
import {
  ASSET_IMAGE_FRAME_CLASS,
  ASSET_IMAGE_FRAME_IMG_CLASS,
  ASSET_IMAGE_FRAME_STYLE,
  ASSET_PROMPT_TEXT_CLASS,
} from "./projectAssetModalStyles";

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

interface ProjectAssetDetailModalProps {
  open: boolean;
  kind: ProjectAssetKind;
  name: string;
  sheetUrl: string | null;
  hasSheet: boolean;
  description: string;
  promptTemplate?: AssetPromptTemplate | null;
  referenceImageUrl?: string | null;
  generating?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onGenerate?: () => void;
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-text-4)" }}
      >
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function ProjectAssetDetailModal({
  open,
  kind,
  name,
  sheetUrl,
  hasSheet,
  description,
  promptTemplate,
  referenceImageUrl,
  generating = false,
  onClose,
  onEdit,
  onGenerate,
}: ProjectAssetDetailModalProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const titleId = useId();
  const TypeIcon = KIND_ICON[kind];
  const designLabel = t(DESIGN_LABEL_KEY[kind]);
  const generateLabel = hasSheet ? t("ws2_regenerate_asset_image") : t("ws2_generate_asset_image");
  const canGenerate = description.trim().length > 0;
  const promptTemplateLabels = buildPromptTemplateLabels(t);
  const promptTemplateText = formatAssetPromptTemplate(
    promptTemplate,
    promptTemplateLabels,
  );

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      widthClassName="w-full max-w-2xl"
      panelClassName="flex max-h-[88vh] flex-col"
    >
      <div className="flex min-h-0 flex-1 flex-col" data-testid="asset-detail-modal">
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

            <DetailField label={t("ws2_asset_prompt_template")}>
              <p
                className={ASSET_PROMPT_TEXT_CLASS}
                style={{
                  background: "oklch(0.18 0.010 265 / 0.45)",
                  border: "1px solid var(--color-hairline-soft)",
                  color: promptTemplateText ? "var(--color-text-2)" : "var(--color-text-4)",
                }}
              >
                {promptTemplateText || t("no_prompt_template")}
              </p>
            </DetailField>

            <DetailField label={t("asset_prompt")}>
              <p
                className={ASSET_PROMPT_TEXT_CLASS}
                style={{
                  background: "oklch(0.18 0.010 265 / 0.45)",
                  border: "1px solid var(--color-hairline-soft)",
                  color: description ? "var(--color-text-2)" : "var(--color-text-4)",
                }}
              >
                {description.trim() || t("no_prompt")}
              </p>
            </DetailField>

            {kind === "character" ? (
              <DetailField label={t("reference_image")}>
                <PreviewableImageFrame
                  src={referenceImageUrl ?? null}
                  alt={`${name} ${t("reference_image")}`}
                  label={t("view_full_image")}
                >
                  <div className={ASSET_IMAGE_FRAME_CLASS} style={ASSET_IMAGE_FRAME_STYLE}>
                    {referenceImageUrl ? (
                      <img
                        src={referenceImageUrl}
                        alt={`${name} ${t("reference_image")}`}
                        className={ASSET_IMAGE_FRAME_IMG_CLASS}
                      />
                    ) : (
                      <span className="text-[13px]" style={{ color: "var(--color-text-4)" }}>
                        {t("no_reference_image")}
                      </span>
                    )}
                  </div>
                </PreviewableImageFrame>
              </DetailField>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-hairline/80 px-6 py-4">
          {onEdit ? (
            <SecondaryButton onClick={onEdit} data-testid="asset-detail-edit">
              {t("common:edit")}
            </SecondaryButton>
          ) : null}
          {onGenerate ? (
            <GenerateButton
              onClick={onGenerate}
              loading={generating}
              disabled={!canGenerate}
              label={generateLabel}
              layoutId={undefined}
              className="!px-4 !py-2 !text-[13px]"
              data-testid="asset-detail-generate"
            />
          ) : null}
        </div>
      </div>
    </GlassModal>
  );
}
