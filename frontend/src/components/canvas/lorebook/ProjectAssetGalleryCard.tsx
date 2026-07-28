import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Landmark, Package, User } from "lucide-react";
import { W3 } from "@/components/workspace";
import { ImageFlipReveal } from "@/components/ui/ImageFlipReveal";
import type { AssetSheetStatus } from "@/types/project";
import { AssetGalleryCardGeneratingOverlay } from "./AssetGalleryCardGeneratingOverlay";
import { ASSET_SHEET_ASPECT_CLASS } from "./projectAssetModalStyles";
import { cn } from "@/lib/utils";

export type ProjectAssetKind = "character" | "scene" | "prop";

/** 人物 / 场景 / 道具资产墙网格（默认最多 4 列，xl 最多 5 列；卡片 16:9） */
export const PROJECT_ASSET_GALLERY_GRID_CLS =
  "grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(max(260px,calc((100%-3*1rem)/4)),1fr))] xl:[grid-template-columns:repeat(auto-fill,minmax(max(280px,calc((100%-4*1rem)/5)),1fr))]";

const KIND_ICON = {
  character: User,
  scene: Landmark,
  prop: Package,
} as const;

const CARD_HOVER_SHADOW =
  "0 0 0 1px oklch(0.78 0.14 195 / 0.45), 0 0 28px oklch(0.62 0.16 195 / 0.35), 0 20px 56px oklch(0 0 0 / 0.5)";

const FAILED_BORDER = "oklch(0.72 0.18 25 / 0.55)";
const FAILED_HOVER_BORDER = "oklch(0.72 0.18 25 / 0.8)";
const FAILED_SHADOW =
  "0 0 0 1px oklch(0.72 0.18 25 / 0.28), 0 16px 40px oklch(0.45 0.14 25 / 0.28)";

function resolveAssetSheetStatus(
  status: AssetSheetStatus | undefined,
  hasSheet: boolean,
): AssetSheetStatus {
  if (status === "draft" || status === "generated" || status === "failed") {
    return status;
  }
  return hasSheet ? "generated" : "draft";
}

interface ProjectAssetGalleryCardProps {
  id: string;
  name: string;
  kind: ProjectAssetKind;
  sheetUrl: string | null;
  description: string;
  /** 后端资产状态：draft / generated / failed */
  status?: AssetSheetStatus;
  generating?: boolean;
  imageAlt: string;
  onOpenDetail: () => void;
}

export function ProjectAssetGalleryCard({
  id,
  name,
  kind,
  sheetUrl,
  description,
  status,
  generating = false,
  imageAlt,
  onOpenDetail,
}: ProjectAssetGalleryCardProps) {
  const { t } = useTranslation("dashboard");
  const [isHovered, setIsHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const TypeIcon = KIND_ICON[kind];
  const sheetStatus = resolveAssetSheetStatus(status, Boolean(sheetUrl));
  const showImage =
    sheetStatus === "generated" && Boolean(sheetUrl) && !imgError;
  const isFailed = !generating && sheetStatus === "failed";
  const descriptionText = description.trim();
  const promptText = descriptionText || t("no_description");

  const cardBorderColor = generating
    ? "oklch(0.78 0.14 195 / 0.45)"
    : isFailed
      ? isHovered
        ? FAILED_HOVER_BORDER
        : FAILED_BORDER
      : isHovered
        ? "oklch(0.78 0.14 195 / 0.7)"
        : "oklch(1 0 0 / 0.08)";
  const cardBoxShadow = generating
    ? "0 10px 32px oklch(0.62 0.16 195 / 0.24)"
    : isFailed
      ? isHovered
        ? FAILED_SHADOW
        : "0 12px 40px oklch(0 0 0 / 0.4)"
      : isHovered
        ? CARD_HOVER_SHADOW
        : "0 12px 40px oklch(0 0 0 / 0.4)";

  useEffect(() => {
    setImgError(false);
  }, [sheetUrl]);

  return (
    <article
      id={id}
      className="group w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-asset-status={sheetStatus}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-[#0a0e14] transition-[border-color,box-shadow,transform] duration-300",
          ASSET_SHEET_ASPECT_CLASS,
          !generating && "motion-safe:hover:-translate-y-0.5",
          generating ? "cursor-default" : "cursor-pointer",
        )}
        style={{
          borderColor: cardBorderColor,
          boxShadow: cardBoxShadow,
        }}
        role={generating ? undefined : "button"}
        tabIndex={generating ? -1 : 0}
        aria-disabled={generating || undefined}
        data-testid="asset-card-clickable"
        aria-label={t("asset_card_open_detail_aria", { name })}
        onClick={() => {
          if (generating) return;
          onOpenDetail();
        }}
        onKeyDown={(event) => {
          if (generating) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetail();
          }
        }}
      >
        <div aria-hidden className="absolute inset-0 bg-[#12151c]" />
        {showImage ? (
          <ImageFlipReveal
            src={sheetUrl}
            alt={imageAlt}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-all duration-700",
              generating ? "scale-[1.02] opacity-35 blur-[1px]" : "group-hover:scale-[1.03]",
            )}
            onError={() => setImgError(true)}
          />
        ) : isFailed ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4"
            style={{
              background:
                "radial-gradient(ellipse 90% 70% at 50% 20%, oklch(0.55 0.16 25 / 0.18), transparent 68%), linear-gradient(180deg, rgba(28,10,10,0.75), rgba(12,8,10,0.55))",
            }}
          >
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-lg transition-all duration-200"
              style={{
                background: isHovered
                  ? "linear-gradient(135deg, oklch(0.55 0.16 25 / 0.28), oklch(0.45 0.12 25 / 0.22))"
                  : "oklch(0.28 0.06 25 / 0.55)",
                border: `1px solid ${isHovered ? FAILED_HOVER_BORDER : FAILED_BORDER}`,
                color: "oklch(0.82 0.12 25)",
                transform: isHovered ? "scale(1.06)" : "scale(1)",
              }}
            >
              <AlertTriangle className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span
              className="text-center text-[11px] leading-relaxed"
              style={{ color: "oklch(0.82 0.08 25)" }}
            >
              {t("ws2_asset_status_failed")}
            </span>
          </div>
        ) : !generating ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4"
            style={{
              background:
                "radial-gradient(ellipse 90% 70% at 50% 20%, rgba(34,211,238,0.12), transparent 68%), linear-gradient(180deg, rgba(8,14,32,0.75), rgba(6,10,24,0.55))",
            }}
          >
            <span
              aria-hidden
              className="grid h-9 w-9 place-items-center rounded-lg transition-all duration-200"
              style={{
                background: isHovered
                  ? "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(99,102,241,0.22))"
                  : "rgba(8, 14, 32, 0.55)",
                border: isHovered
                  ? `1px solid ${W3.border}`
                  : `1px solid ${W3.borderSoft}`,
                color: isHovered ? W3.cyan : "rgba(148, 163, 184, 0.9)",
                boxShadow: isHovered ? W3.glowCyan : "none",
                transform: isHovered ? "scale(1.06)" : "scale(1)",
              }}
            >
              <TypeIcon className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span
              className="text-center text-[11px] leading-relaxed"
              style={{ color: isHovered ? "var(--color-text-2)" : "var(--color-text-3)" }}
            >
              {t("ws2_asset_status_draft")}
            </span>
          </div>
        ) : null}

        {!generating ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-black/10"
          />
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-3 p-2.5 text-left">
          <h3
            className="line-clamp-1 text-[13px] font-semibold text-white sm:text-sm"
            title={name}
          >
            {name}
          </h3>
          {!generating ? (
            <p
              className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/55 wrap-anywhere"
              title={promptText}
            >
              {promptText}
            </p>
          ) : null}
        </div>

        {generating ? (
          <AssetGalleryCardGeneratingOverlay
            icon={TypeIcon}
            label={t("generating_status")}
          />
        ) : null}
      </div>
    </article>
  );
}
