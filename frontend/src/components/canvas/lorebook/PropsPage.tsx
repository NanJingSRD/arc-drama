import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { GalleryToolbar } from "./GalleryToolbar";
import { useAssetLibraryHeaderActionsSetter } from "@/components/workspace-v2/project-detail/AssetLibraryHeaderActionsContext";
import { PropCard } from "./PropCard";
import { AssetFormModal } from "@/components/assets/AssetFormModal";
import { AssetPickerModal } from "@/components/assets/AssetPickerModal";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import { useScrollTarget } from "@/hooks/useScrollTarget";
import { errMsg } from "@/utils/async";
import type { Prop } from "@/types";
import { GalleryEmptyState } from "./GalleryEmptyState";
import { Ws2NoDataPlaceholder } from "@/components/workspace-v2/project-detail/Ws2NoDataPlaceholder";
import { Ws2AssetExtractingPlaceholder } from "@/components/workspace-v2/project-detail/Ws2AssetExtractingPlaceholder";
import { WORKSPACE_V2_ASSET_SUB_NAV_LABELS } from "@/types/workspace-v2";
import { PROJECT_ASSET_GALLERY_GRID_CLS } from "./ProjectAssetGalleryCard";
import { WS2_CARD_SCROLL_INNER_CLASS } from "@/components/workspace-v2/workspace-v2-theme";
import { cn } from "@/lib/utils";
import type { AssetCardVariant } from "./asset-card-variant";

/** 内联表单资产卡片网格（固定 320px 列宽，老版 Studio 使用） */
const ASSET_FORM_GRID_CLS =
  "grid justify-evenly gap-4 [grid-template-columns:repeat(auto-fill,320px)]";

interface Props {
  projectName: string;
  props: Record<string, Prop>;
  onUpdateProp: (name: string, updates: Partial<Prop>) => void;
  onGenerateProp: (name: string, context?: { description?: string }) => void;
  onAddProp: (name: string, description: string) => Promise<void>;
  onRestorePropVersion?: () => Promise<void> | void;
  onRefreshProject?: () => Promise<unknown> | void;
  generatingPropNames?: Set<string>;
  onExtractAssets?: () => void;
  extractingAssets?: boolean;
  generatingAllAssets?: boolean;
  onGenerateAllOverride?: () => void | Promise<void>;
  compact?: boolean;
}

export function PropsPage({ projectName, props, onUpdateProp, onGenerateProp, onAddProp, onRestorePropVersion, onRefreshProject, generatingPropNames, onExtractAssets, extractingAssets, generatingAllAssets, onGenerateAllOverride, compact = false }: Props) {
  const { t } = useTranslation(["dashboard", "assets"]);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);

  const setHeaderActions = useAssetLibraryHeaderActionsSetter();
  const isWorkspaceV2 = Boolean(setHeaderActions);
  const cardVariant: AssetCardVariant = isWorkspaceV2 ? "gallery" : "inline";
  const gridClass = isWorkspaceV2 ? PROJECT_ASSET_GALLERY_GRID_CLS : ASSET_FORM_GRID_CLS;

  useScrollTarget("prop");

  const entries = Object.entries(props);

  const handleImport = async (ids: string[]) => {
    try {
      await API.applyAssetsToProject({
        asset_ids: ids,
        target_project: projectName,
        conflict_policy: "skip",
      });
      useAppStore.getState().pushToast(t("assets:import_count", { count: ids.length }), "success");
      await onRefreshProject?.();
    } catch (err) {
      useAppStore.getState().pushToast(errMsg(err), "error");
    } finally {
      setPicking(false);
    }
  };

  const handleGenerateAll = onGenerateAllOverride ?? (async () => {
    for (const [name, prop] of entries) {
      if (generatingPropNames?.has(name)) continue;
      if (prop.prop_sheet) continue;
      try {
        await API.generateProjectProp(projectName, name, prop.description);
      } catch (err) {
        useAppStore.getState().pushToast(errMsg(err), "error");
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    useAppStore.getState().pushToast(t("dashboard:generate_all_started", { type: t("dashboard:props") }), "success");
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <GalleryToolbar
        title={t("dashboard:props")}
        count={entries.length}
        assetKind="prop"
        hideAddButton={isWorkspaceV2}
        onAdd={isWorkspaceV2 ? undefined : () => setAdding(true)}
        onPickFromLibrary={setHeaderActions ? undefined : () => setPicking(true)}
        onGenerateAll={() => void handleGenerateAll()}
        generatingCount={generatingPropNames?.size}
        onExtractAssets={onExtractAssets}
        extractingAssets={extractingAssets}
        generatingAllAssets={generatingAllAssets}
      />
      <div className="relative min-h-0 flex-1">
        <div
          className={cn(
            "h-full min-h-0",
            setHeaderActions ? "flex flex-col overflow-y-auto pt-1" : "overflow-y-auto pb-4 pt-3",
            WS2_CARD_SCROLL_INNER_CLASS,
          )}
        >
          {entries.length === 0 ? (
            isWorkspaceV2 ? (
              extractingAssets || generatingAllAssets ? null : <Ws2NoDataPlaceholder />
            ) : (
              <GalleryEmptyState
                icon={<Package className="h-6 w-6" />}
                label={t("dashboard:props")}
                hint={t("dashboard:no_props_hint_clickable")}
              />
            )
          ) : (
            <div className={gridClass}>
              {entries.map(([name, prop]) => (
                <PropCard
                  key={name}
                  variant={cardVariant}
                  name={name}
                  prop={prop}
                  projectName={projectName}
                  onUpdate={onUpdateProp}
                  onGenerate={onGenerateProp}
                  onRestoreVersion={onRestorePropVersion}
                  onReload={onRefreshProject}
                  generating={generatingPropNames?.has(name)}
                />
              ))}
            </div>
          )}
        </div>
        {extractingAssets && isWorkspaceV2 ? (
          <Ws2AssetExtractingPlaceholder
            assetKind="prop"
            typeLabel={WORKSPACE_V2_ASSET_SUB_NAV_LABELS.props}
            className="absolute inset-0 z-10"
          />
        ) : null}
        {generatingAllAssets && isWorkspaceV2 ? (
          <Ws2AssetExtractingPlaceholder
            assetKind="prop"
            typeLabel={WORKSPACE_V2_ASSET_SUB_NAV_LABELS.props}
            messageKey="ws2_generating_asset_type"
            className="absolute inset-0 z-10"
          />
        ) : null}
      </div>

      {adding && !isWorkspaceV2 && (
        <AssetFormModal
          type="prop"
          mode="create"
          onClose={() => setAdding(false)}
          onSubmit={async ({ name, description }) => {
            await onAddProp(name, description);
            setAdding(false);
          }}
        />
      )}

      {picking && !setHeaderActions && (
        <AssetPickerModal
          type="prop"
          existingNames={new Set(Object.keys(props))}
          onClose={() => setPicking(false)}
          onImport={(ids) => { void handleImport(ids); }}
        />
      )}
    </div>
  );
}
