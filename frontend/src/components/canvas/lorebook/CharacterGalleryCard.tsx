import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectAssetFiles } from "@/components/canvas/lorebook/ProjectAssetFilesContext";
import { ProjectAssetDetailModal } from "@/components/canvas/lorebook/ProjectAssetDetailModal";
import { ProjectAssetGalleryCard } from "@/components/canvas/lorebook/ProjectAssetGalleryCard";
import { ProjectAssetGenerateModal } from "@/components/canvas/lorebook/ProjectAssetGenerateModal";
import { useProjectsStore } from "@/stores/projects-store";
import type { AssetPromptTemplate, Character } from "@/types";

interface CharacterSavePayload {
  description: string;
  voiceStyle: string;
  promptTemplate?: AssetPromptTemplate;
  referenceFile?: File | null;
}

interface CharacterGalleryCardProps {
  name: string;
  character: Character;
  projectName: string;
  onSave: (name: string, payload: CharacterSavePayload) => Promise<void>;
  onGenerate: (name: string, context?: { description?: string }) => void | Promise<void>;
  onRestoreVersion?: () => Promise<void> | void;
  onReload?: () => Promise<unknown> | void;
  generating?: boolean;
}

export function CharacterGalleryCard({
  name,
  character,
  projectName,
  onSave,
  onGenerate,
  generating = false,
}: CharacterGalleryCardProps) {
  const { t } = useTranslation("dashboard");
  const { getFileUrl } = useProjectAssetFiles();
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [submittingGenerate, setSubmittingGenerate] = useState(false);
  const showGenerating = generating || submittingGenerate;

  useEffect(() => {
    if (generating) setSubmittingGenerate(false);
  }, [generating]);

  const sheetFp = useProjectsStore(
    (s) => character.character_sheet ? s.getAssetFingerprint(character.character_sheet) : null,
  );
  const referenceFp = useProjectsStore(
    (s) => character.reference_image ? s.getAssetFingerprint(character.reference_image) : null,
  );

  const sheetUrl = character.character_sheet
    ? getFileUrl(projectName, character.character_sheet, sheetFp)
    : null;

  const referenceImageUrl = character.reference_image
    ? getFileUrl(projectName, character.reference_image, referenceFp)
    : null;

  const handleGenerateDirect = async () => {
    if (!character.description.trim() || showGenerating) return;
    setDetailOpen(false);
    setEditOpen(false);
    setSubmittingGenerate(true);
    try {
      await Promise.resolve(onGenerate(name, { description: character.description }));
    } catch {
      setSubmittingGenerate(false);
    }
  };

  const handleEditConfirm = async (payload: {
    description: string;
    promptTemplate?: AssetPromptTemplate;
    voiceStyle?: string;
    referenceFile?: File | null;
  }) => {
    await onSave(name, {
      description: payload.description,
      voiceStyle: character.voice_style ?? "",
      promptTemplate: payload.promptTemplate,
      referenceFile: payload.referenceFile,
    });
  };

  return (
    <>
      <ProjectAssetGalleryCard
        id={`character-${name}`}
        name={name}
        kind="character"
        sheetUrl={sheetUrl}
        description={character.description}
        status={character.status}
        generating={showGenerating}
        imageAlt={`${name} ${t("ws2_character_asset_image")}`}
        onOpenDetail={() => {
          if (showGenerating) return;
          setDetailOpen(true);
        }}
      />

      <ProjectAssetDetailModal
        open={detailOpen}
        kind="character"
        name={name}
        sheetUrl={sheetUrl}
        hasSheet={Boolean(character.character_sheet)}
        description={character.description}
        promptTemplate={character.prompt_template}
        referenceImageUrl={referenceImageUrl}
        generating={showGenerating}
        onClose={() => setDetailOpen(false)}
        onEdit={() => {
          setDetailOpen(false);
          setEditOpen(true);
        }}
        onGenerate={() => void handleGenerateDirect()}
      />

      <ProjectAssetGenerateModal
        open={editOpen}
        mode="edit"
        kind="character"
        name={name}
        description={character.description}
        promptTemplate={character.prompt_template}
        sheetUrl={sheetUrl}
        referenceImageUrl={referenceImageUrl}
        hasSheet={Boolean(character.character_sheet)}
        generating={showGenerating}
        onClose={() => {
          setEditOpen(false);
          setDetailOpen(true);
        }}
        onConfirm={handleEditConfirm}
      />
    </>
  );
}
