import type { WorkspaceV2Episode } from "@/types/workspace-v2";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WS2_CARD_CLASS } from "../workspace-v2-theme";
import { cn } from "@/lib/utils";

interface EpisodeCardProps {
  episode: WorkspaceV2Episode;
  selected: boolean;
  onSelect: () => void;
}

export function EpisodeCard({ episode, selected, onSelect }: EpisodeCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group w-[160px] shrink-0 text-left"
    >
      <Card
        className={cn(
          WS2_CARD_CLASS,
          "overflow-hidden",
          selected && "border-cyan-400/40 ring-1 ring-cyan-400/20",
        )}
      >
        <div className="relative aspect-video overflow-hidden bg-muted/30">
          {episode.coverUrl ? (
            <img src={episode.coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-[10px] text-muted-foreground">暂无封面</span>
            </div>
          )}
          <Badge
            className={cn(
              "absolute left-2 top-2 h-6 w-6 justify-center rounded-md p-0 text-[11px]",
              selected
                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-200"
                : "border-border bg-background/80 text-muted-foreground",
            )}
          >
            {episode.episodeNumber}
          </Badge>
        </div>

        <CardContent className="px-3 py-2.5">
          <h4
            className={cn(
              "truncate text-xs font-semibold",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {episode.title}
          </h4>
          <p className="mt-0.5 line-clamp-2 text-[10px] leading-[1.4] text-muted-foreground">
            {episode.description}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}
