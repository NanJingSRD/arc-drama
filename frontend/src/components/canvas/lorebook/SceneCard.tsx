import type { Scene } from "@/types";
import type { AssetCardVariant } from "./asset-card-variant";
import { SceneGalleryCard } from "./SceneGalleryCard";
import { SceneInlineCard } from "./SceneInlineCard";

export interface SceneCardProps {
  name: string;
  scene: Scene;
  projectName: string;
  onUpdate: (name: string, updates: Partial<Scene>) => void;
  onGenerate: (name: string, context?: { description?: string }) => void | Promise<void>;
  onRestoreVersion?: () => void | Promise<void>;
  onReload?: () => void | Promise<unknown>;
  generating?: boolean;
  variant?: AssetCardVariant;
}

export function SceneCard({ variant = "gallery", ...props }: SceneCardProps) {
  if (variant === "inline") {
    return (
      <SceneInlineCard
        {...props}
        onGenerate={(name) => {
          void props.onGenerate(name);
        }}
      />
    );
  }
  return <SceneGalleryCard {...props} />;
}
