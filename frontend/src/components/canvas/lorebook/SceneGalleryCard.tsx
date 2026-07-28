import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectAssetFiles } from "@/components/canvas/lorebook/ProjectAssetFilesContext";
import { ProjectAssetDetailModal } from "@/components/canvas/lorebook/ProjectAssetDetailModal";
import { ProjectAssetGalleryCard } from "@/components/canvas/lorebook/ProjectAssetGalleryCard";
import { ProjectAssetGenerateModal } from "@/components/canvas/lorebook/ProjectAssetGenerateModal";
import { useProjectsStore } from "@/stores/projects-store";
import type { Scene } from "@/types";

interface SceneGalleryCardProps {
  name: string;
  scene: Scene;
  projectName: string;
  onUpdate: (name: string, updates: Partial<Scene>) => void;
  onGenerate: (name: string, context?: { description?: string }) => void | Promise<void>;
  onRestoreVersion?: () => void | Promise<void>;
  onReload?: () => void | Promise<unknown>;
  generating?: boolean;
}

export function SceneGalleryCard({
  name,
  scene,
  projectName,
  onUpdate,
  onGenerate,
  generating = false,
}: SceneGalleryCardProps) {
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
    (s) => scene.scene_sheet ? s.getAssetFingerprint(scene.scene_sheet) : null,
  );

  const sheetUrl = scene.scene_sheet
    ? getFileUrl(projectName, scene.scene_sheet, sheetFp)
    : null;

  const handleGenerateDirect = async () => {
    if (!scene.description.trim() || showGenerating) return;
    setDetailOpen(false);
    setEditOpen(false);
    setSubmittingGenerate(true);
    try {
      await Promise.resolve(onGenerate(name, { description: scene.description }));
    } catch {
      setSubmittingGenerate(false);
    }
  };

  const handleEditConfirm = async (payload: {
    description: string;
    promptTemplate?: Record<string, string>;
  }) => {
    await Promise.resolve(
      onUpdate(name, {
        description: payload.description,
        prompt_template: payload.promptTemplate,
      }),
    );
  };

  return (
    <>
      <ProjectAssetGalleryCard
        id={`scene-${name}`}
        name={name}
        kind="scene"
        sheetUrl={sheetUrl}
        description={scene.description}
        status={scene.status}
        generating={showGenerating}
        imageAlt={`${name} ${t("ws2_scene_asset_image")}`}
        onOpenDetail={() => {
          if (showGenerating) return;
          setDetailOpen(true);
        }}
      />

      <ProjectAssetDetailModal
        open={detailOpen}
        kind="scene"
        name={name}
        sheetUrl={sheetUrl}
        hasSheet={Boolean(scene.scene_sheet)}
        description={scene.description}
        promptTemplate={scene.prompt_template}
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
        kind="scene"
        name={name}
        description={scene.description}
        promptTemplate={scene.prompt_template}
        sheetUrl={sheetUrl}
        hasSheet={Boolean(scene.scene_sheet)}
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
