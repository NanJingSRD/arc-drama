import { useTranslation } from "react-i18next";
import { Landmark, Package, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectAssetKind } from "@/components/canvas/lorebook/ProjectAssetGalleryCard";

const ASSET_KIND_ICON: Record<ProjectAssetKind, LucideIcon> = {
  character: User,
  scene: Landmark,
  prop: Package,
};

interface Ws2AssetExtractingPlaceholderProps {
  typeLabel: string;
  /** 资产类型，用于展示对应图标 */
  assetKind: ProjectAssetKind;
  /** i18n key under dashboard；默认提取文案，批量生成用 ws2_generating_asset_type */
  messageKey?: "extracting_asset_type" | "ws2_generating_asset_type";
  className?: string;
}

export function Ws2AssetExtractingPlaceholder({
  typeLabel,
  assetKind,
  messageKey = "extracting_asset_type",
  className,
}: Ws2AssetExtractingPlaceholderProps) {
  const { t } = useTranslation("dashboard");
  const label = t(messageKey, { type: typeLabel });
  const TypeIcon = ASSET_KIND_ICON[assetKind];

  return (
    <div
      className={cn("relative flex min-h-[280px] flex-1 flex-col overflow-hidden", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[#0a0e14]/88 backdrop-blur-3xl backdrop-saturate-50"
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-400/20 bg-[#0a0e14]/88 px-6 py-5 shadow-[0_0_40px_oklch(0.62_0.16_195/0.18)] backdrop-blur-md">
          <div className="relative flex h-11 w-11 items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-cyan-400/20 motion-safe:animate-spin"
              style={{ animationDuration: "2.8s" }}
            />
            <span
              aria-hidden
              className="absolute inset-1 rounded-full border border-t-cyan-400/70 border-r-transparent border-b-indigo-400/40 border-l-transparent motion-safe:animate-spin"
              style={{ animationDuration: "1.1s" }}
            />
            <TypeIcon className="relative h-5 w-5 text-cyan-300 motion-safe:animate-pulse" strokeWidth={2} />
          </div>
          <p className="bg-linear-to-r from-cyan-300 to-indigo-300 bg-clip-text text-sm font-semibold text-transparent">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
