import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProjectAssetFiles } from "@/components/canvas/lorebook/ProjectAssetFilesContext";
import { ProjectAssetDetailModal } from "@/components/canvas/lorebook/ProjectAssetDetailModal";
import { ProjectAssetGalleryCard } from "@/components/canvas/lorebook/ProjectAssetGalleryCard";
import { ProjectAssetGenerateModal } from "@/components/canvas/lorebook/ProjectAssetGenerateModal";
import { useProjectsStore } from "@/stores/projects-store";
import type { Prop } from "@/types";

interface PropGalleryCardProps {
  name: string;
  prop: Prop;
  projectName: string;
  onUpdate: (name: string, updates: Partial<Prop>) => void;
  onGenerate: (name: string, context?: { description?: string }) => void | Promise<void>;
  onRestoreVersion?: () => void | Promise<void>;
  onReload?: () => void | Promise<unknown>;
  generating?: boolean;
}

export function PropGalleryCard({
  name,
  prop,
  projectName,
  onUpdate,
  onGenerate,
  generating = false,
}: PropGalleryCardProps) {
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
    (s) => prop.prop_sheet ? s.getAssetFingerprint(prop.prop_sheet) : null,
  );

  const sheetUrl = prop.prop_sheet
    ? getFileUrl(projectName, prop.prop_sheet, sheetFp)
    : null;

  const handleGenerateDirect = async () => {
    if (!prop.description.trim() || showGenerating) return;
    setDetailOpen(false);
    setEditOpen(false);
    setSubmittingGenerate(true);
    try {
      await Promise.resolve(onGenerate(name, { description: prop.description }));
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
        id={`prop-${name}`}
        name={name}
        kind="prop"
        sheetUrl={sheetUrl}
        description={prop.description}
        status={prop.status}
        generating={showGenerating}
        imageAlt={`${name} ${t("ws2_prop_asset_image")}`}
        onOpenDetail={() => {
          if (showGenerating) return;
          setDetailOpen(true);
        }}
      />

      <ProjectAssetDetailModal
        open={detailOpen}
        kind="prop"
        name={name}
        sheetUrl={sheetUrl}
        hasSheet={Boolean(prop.prop_sheet)}
        description={prop.description}
        promptTemplate={prop.prompt_template}
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
        kind="prop"
        name={name}
        description={prop.description}
        promptTemplate={prop.prompt_template}
        sheetUrl={sheetUrl}
        hasSheet={Boolean(prop.prop_sheet)}
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
