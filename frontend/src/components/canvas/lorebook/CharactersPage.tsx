import { useState } from "react";
import { useTranslation } from "react-i18next";
import { User } from "lucide-react";
import { GalleryToolbar } from "./GalleryToolbar";
import { useAssetLibraryHeaderActionsSetter } from "@/components/workspace-v2/project-detail/AssetLibraryHeaderActionsContext";
import { CharacterCard } from "./CharacterCard";
import { AssetFormModal } from "@/components/assets/AssetFormModal";
import { AssetPickerModal } from "@/components/assets/AssetPickerModal";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import { useScrollTarget } from "@/hooks/useScrollTarget";
import { errMsg } from "@/utils/async";
import type { Character } from "@/types";
import type { AssetPromptTemplate } from "@/types/project";
import { WORKSPACE_V2_ASSET_SUB_NAV_LABELS } from "@/types/workspace-v2";
import { GalleryEmptyState } from "./GalleryEmptyState";
import { Ws2NoDataPlaceholder } from "@/components/workspace-v2/project-detail/Ws2NoDataPlaceholder";
import { Ws2AssetExtractingPlaceholder } from "@/components/workspace-v2/project-detail/Ws2AssetExtractingPlaceholder";
import { PROJECT_ASSET_GALLERY_GRID_CLS } from "./ProjectAssetGalleryCard";
import { cn } from "@/lib/utils";
import { WS2_CARD_SCROLL_INNER_CLASS } from "@/components/workspace-v2/workspace-v2-theme";
import type { AssetCardVariant } from "./asset-card-variant";

/** 内联表单资产卡片网格（固定 320px 列宽，老版 Studio 使用） */
const ASSET_FORM_GRID_CLS =
  "grid justify-evenly gap-4 [grid-template-columns:repeat(auto-fill,320px)]";

interface Props {
  projectName: string;
  characters: Record<string, Character>;
  onSaveCharacter: (
    name: string,
    payload: {
      description: string;
      voiceStyle: string;
      promptTemplate?: AssetPromptTemplate;
      referenceFile?: File | null;
    },
  ) => Promise<void>;
  onGenerateCharacter: (name: string, context?: { description?: string }) => void;
  onAddCharacter: (name: string, description: string, voiceStyle: string, referenceFile?: File | null) => Promise<void>;
  onRestoreCharacterVersion?: () => Promise<void> | void;
  onRefreshProject?: () => Promise<unknown> | void;
  generatingCharacterNames?: Set<string>;
  onExtractAssets?: () => void;
  extractingAssets?: boolean;
  generatingAllAssets?: boolean;
  onGenerateAllOverride?: () => void | Promise<void>;
}

export function CharactersPage({ projectName, characters, onSaveCharacter, onGenerateCharacter, onAddCharacter, onRestoreCharacterVersion, onRefreshProject, generatingCharacterNames, onExtractAssets, extractingAssets, generatingAllAssets, onGenerateAllOverride }: Props) {
  const { t } = useTranslation(["dashboard", "assets"]);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);

  const setHeaderActions = useAssetLibraryHeaderActionsSetter();
  const isWorkspaceV2 = Boolean(setHeaderActions);
  const cardVariant: AssetCardVariant = isWorkspaceV2 ? "gallery" : "inline";
  const gridClass = isWorkspaceV2 ? PROJECT_ASSET_GALLERY_GRID_CLS : ASSET_FORM_GRID_CLS;
  const characterLabel = isWorkspaceV2
    ? WORKSPACE_V2_ASSET_SUB_NAV_LABELS.characters
    : t("dashboard:characters");
  const characterEmptyHint = isWorkspaceV2 ? "暂无人物" : t("dashboard:no_characters_hint_clickable");

  useScrollTarget("character");

  const entries = Object.entries(characters);

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
    for (const [name, char] of entries) {
      if (generatingCharacterNames?.has(name)) continue;
      if (char.character_sheet) continue;
      try {
        await API.generateCharacter(projectName, name, char.description);
      } catch (err) {
        useAppStore.getState().pushToast(errMsg(err), "error");
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    useAppStore.getState().pushToast(t("dashboard:generate_all_started", { type: characterLabel }), "success");
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <GalleryToolbar
        title={characterLabel}
        count={entries.length}
        assetKind="character"
        hideAddButton={isWorkspaceV2}
        onAdd={isWorkspaceV2 ? undefined : () => setAdding(true)}
        onPickFromLibrary={setHeaderActions ? undefined : () => setPicking(true)}
        onGenerateAll={() => void handleGenerateAll()}
        generatingCount={generatingCharacterNames?.size}
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
                icon={<User className="h-6 w-6" />}
                label={characterLabel}
                hint={characterEmptyHint}
              />
            )
          ) : (
            <div className={gridClass}>
              {entries.map(([name, char]) => (
                <CharacterCard
                  key={name}
                  variant={cardVariant}
                  name={name}
                  character={char}
                  projectName={projectName}
                  onSave={onSaveCharacter}
                  onGenerate={onGenerateCharacter}
                  onRestoreVersion={onRestoreCharacterVersion}
                  onReload={onRefreshProject}
                  generating={generatingCharacterNames?.has(name)}
                />
              ))}
            </div>
          )}
        </div>
        {extractingAssets && isWorkspaceV2 ? (
          <Ws2AssetExtractingPlaceholder
            assetKind="character"
            typeLabel={characterLabel}
            className="absolute inset-0 z-10"
          />
        ) : null}
        {generatingAllAssets && isWorkspaceV2 ? (
          <Ws2AssetExtractingPlaceholder
            assetKind="character"
            typeLabel={characterLabel}
            messageKey="ws2_generating_asset_type"
            className="absolute inset-0 z-10"
          />
        ) : null}
      </div>

      {adding && !isWorkspaceV2 && (
        <AssetFormModal
          type="character"
          mode="create"
          onClose={() => setAdding(false)}
          onSubmit={async ({ name, description, voice_style, image }) => {
            await onAddCharacter(name, description, voice_style, image ?? null);
            setAdding(false);
          }}
        />
      )}

      {picking && !setHeaderActions && (
        <AssetPickerModal
          type="character"
          existingNames={new Set(Object.keys(characters))}
          onClose={() => setPicking(false)}
          onImport={(ids) => { void handleImport(ids); }}
        />
      )}
    </div>
  );
}
