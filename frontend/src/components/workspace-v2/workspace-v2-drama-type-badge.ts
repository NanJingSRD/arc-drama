import type { CSSProperties } from "react";
import type { WorkspaceV2DramaType } from "@/types/workspace-v2";

/** Drama type badge variant for shadcn Badge */
export const WORKSPACE_V2_DRAMA_TYPE_BADGE_VARIANT: Record<
  WorkspaceV2DramaType,
  "novel" | "series" | "ad"
> = {
  novel: "novel",
  series: "series",
  ad: "ad",
};

/** @deprecated Use WORKSPACE_V2_DRAMA_TYPE_BADGE_VARIANT with Badge component */
export const WORKSPACE_V2_DRAMA_TYPE_BADGE_STYLE: Record<WorkspaceV2DramaType, CSSProperties> = {
  novel: {
    color: "#FFFFFF",
    background: "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)",
    border: "1px solid rgba(196, 181, 253, 0.7)",
    boxShadow: "0 0 18px rgba(99, 102, 241, 0.6), inset 0 1px 0 rgba(255,255,255,0.28)",
  },
  series: {
    color: "#FFFFFF",
    background: "linear-gradient(135deg, #0891B2 0%, #22D3EE 100%)",
    border: "1px solid rgba(103, 232, 249, 0.75)",
    boxShadow: "0 0 18px rgba(34, 211, 238, 0.55), inset 0 1px 0 rgba(255,255,255,0.28)",
  },
  ad: {
    color: "#1A1208",
    background: "linear-gradient(135deg, #FBBF24 0%, #F97316 100%)",
    border: "1px solid rgba(253, 224, 71, 0.8)",
    boxShadow: "0 0 18px rgba(251, 191, 36, 0.5), inset 0 1px 0 rgba(255,255,255,0.35)",
  },
};
