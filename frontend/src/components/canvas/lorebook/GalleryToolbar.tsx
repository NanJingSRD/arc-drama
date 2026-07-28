import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ImagePlus,
  Landmark,
  Library,
  Package,
  Plus,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  W3,
  W3_ACCENT_BTN_SM_CLS,
  W3_ACCENT_BUTTON_STYLE,
  W3_GHOST_BTN_CLS,
} from "@/components/workspace";
import { WS2_TOOLBAR_STYLE } from "@/components/workspace-v2/workspace-v2-theme";
import { useAssetLibraryHeaderActionsSetter } from "@/components/workspace-v2/project-detail/AssetLibraryHeaderActionsContext";
import type { ProjectAssetKind } from "./ProjectAssetGalleryCard";

const ASSET_KIND_ICON: Record<ProjectAssetKind, LucideIcon> = {
  character: User,
  scene: Landmark,
  prop: Package,
};

export interface GalleryToolbarProps {
  title: string;
  count: number;
  /** 资产类型，用于提取/生成按钮图标 */
  assetKind?: ProjectAssetKind;
  onAdd?: () => void;
  /** 工作空间 2.0：隐藏各 tab 独立的新增按钮，改由顶栏共用「新增{类别}」。 */
  hideAddButton?: boolean;
  /** 未提供时隐藏「从资产库选择」入口（如不入全局库的资产类型）。 */
  onPickFromLibrary?: () => void;
  /** 生成全部按钮，未提供时隐藏。 */
  onGenerateAll?: () => void;
  /** 正在生成中的数量。 */
  generatingCount?: number;
  /** 提取当前类别（工作空间 2.0，按钮文案为「提取全部{title}」） */
  onExtractAssets?: () => void;
  extractingAssets?: boolean;
  /** 批量「生成全部」进行中（整 tab loading，非单卡） */
  generatingAllAssets?: boolean;
}

export function GalleryToolbarActions({
  title,
  count,
  assetKind,
  onAdd,
  hideAddButton,
  onPickFromLibrary,
  onGenerateAll,
  generatingCount,
  onExtractAssets,
  extractingAssets,
  generatingAllAssets,
}: GalleryToolbarProps) {
  const { t } = useTranslation(["dashboard", "assets"]);

  const generateAllLabel = `生成全部${title}`;
  const generateBusy = Boolean(generatingAllAssets) || (generatingCount !== undefined && generatingCount > 0);
  const TypeIcon = assetKind ? ASSET_KIND_ICON[assetKind] : Package;

  return (
    <>
      {onExtractAssets && (
        <button
          type="button"
          onClick={onExtractAssets}
          disabled={extractingAssets || generatingAllAssets}
          className={`${W3_GHOST_BTN_CLS} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <TypeIcon className="h-3.5 w-3.5" />
          {extractingAssets ? "提取中…" : `提取全部${title}`}
        </button>
      )}
      {onGenerateAll && count > 0 && (
        <button
          type="button"
          onClick={onGenerateAll}
          disabled={generateBusy || extractingAssets}
          className={`${W3_GHOST_BTN_CLS} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {generatingAllAssets
            ? "生成中…"
            : generatingCount !== undefined && generatingCount > 0
              ? `${generateAllLabel} (${generatingCount})`
              : generateAllLabel}
        </button>
      )}
      {onPickFromLibrary && (
        <button type="button" onClick={onPickFromLibrary} className={W3_GHOST_BTN_CLS}>
          <Library className="h-3.5 w-3.5" />
          {t("assets:from_library")}
        </button>
      )}
      {!hideAddButton && onAdd ? (
        <button
          type="button"
          onClick={onAdd}
          className={W3_ACCENT_BTN_SM_CLS}
          style={W3_ACCENT_BUTTON_STYLE}
        >
          <Plus className="h-3.5 w-3.5" />
          {title}
        </button>
      ) : null}
    </>
  );
}

/**
 * GalleryToolbar — W3 玻璃栏 + display-serif 标题 + accent CTA。
 * 工作空间 2.0 下若存在 header actions 插槽，则仅将操作按钮渲染到顶部与子 tab 同行。
 */
export function GalleryToolbar(props: GalleryToolbarProps) {
  const setHeaderActions = useAssetLibraryHeaderActionsSetter();
  const propsRef = useRef(props);
  propsRef.current = props;

  const {
    title,
    count,
    assetKind,
    hideAddButton,
    generatingCount,
    extractingAssets,
    generatingAllAssets,
  } = props;

  // 回调 props 若放入 deps，父组件 inline 箭头函数会导致 setHeaderActions → 重渲染 → 新回调 → 死循环。
  // 仅随展示态（count / extracting 等）刷新顶栏按钮；点击时读 propsRef 取最新回调。
  useEffect(() => {
    if (!setHeaderActions) return;
    setHeaderActions(<GalleryToolbarActions {...propsRef.current} />);
    return () => setHeaderActions(null);
  }, [
    setHeaderActions,
    title,
    count,
    assetKind,
    hideAddButton,
    generatingCount,
    extractingAssets,
    generatingAllAssets,
  ]);

  if (setHeaderActions) {
    return null;
  }

  return (
    <div
      className="shrink-0 flex items-center gap-3 rounded-xl px-4 py-2.5"
      style={WS2_TOOLBAR_STYLE}
    >
      <span
        aria-hidden
        className="h-3 w-[3px] rounded-full"
        style={{
          background: W3.gradientBtn,
          boxShadow: W3.glowCyan,
        }}
      />
      <h2 className="display-serif text-[15px] font-semibold tracking-tight text-text">
        {title}
      </h2>
      <span
        className="num inline-flex min-w-[22px] items-center justify-center rounded-md border px-1.5 py-[2px] text-[10.5px]"
        style={{
          color: "rgba(148, 163, 184, 0.9)",
          background: "rgba(99, 102, 241, 0.12)",
          borderColor: W3.borderSoft,
        }}
      >
        {String(count).padStart(2, "0")}
      </span>
      <div className="flex-1" />
      <GalleryToolbarActions {...props} />
    </div>
  );
}
