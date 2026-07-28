import type { Prop } from "@/types";
import type { AssetCardVariant } from "./asset-card-variant";
import { PropGalleryCard } from "./PropGalleryCard";
import { PropInlineCard } from "./PropInlineCard";

export interface PropCardProps {
  name: string;
  prop: Prop;
  projectName: string;
  onUpdate: (name: string, updates: Partial<Prop>) => void;
  onGenerate: (name: string, context?: { description?: string }) => void | Promise<void>;
  onRestoreVersion?: () => void | Promise<void>;
  onReload?: () => void | Promise<unknown>;
  generating?: boolean;
  variant?: AssetCardVariant;
}

export function PropCard({ variant = "gallery", ...props }: PropCardProps) {
  if (variant === "inline") {
    return (
      <PropInlineCard
        {...props}
        onGenerate={(name) => {
          void props.onGenerate(name);
        }}
      />
    );
  }
  return <PropGalleryCard {...props} />;
}
