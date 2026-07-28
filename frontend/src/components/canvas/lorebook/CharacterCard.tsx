import type { Character } from "@/types";
import type { AssetCardVariant } from "./asset-card-variant";
import { CharacterGalleryCard } from "./CharacterGalleryCard";
import { CharacterInlineCard } from "./CharacterInlineCard";

interface CharacterSavePayload {
  description: string;
  voiceStyle: string;
  referenceFile?: File | null;
}

export interface CharacterCardProps {
  name: string;
  character: Character;
  projectName: string;
  onSave: (name: string, payload: CharacterSavePayload) => Promise<void>;
  onGenerate: (name: string, context?: { description?: string }) => void | Promise<void>;
  onRestoreVersion?: () => Promise<void> | void;
  onReload?: () => Promise<unknown> | void;
  generating?: boolean;
  variant?: AssetCardVariant;
}

export function CharacterCard({ variant = "gallery", ...props }: CharacterCardProps) {
  if (variant === "inline") {
    return (
      <CharacterInlineCard
        {...props}
        onGenerate={(name) => {
          void props.onGenerate(name);
        }}
      />
    );
  }
  return <CharacterGalleryCard {...props} />;
}
