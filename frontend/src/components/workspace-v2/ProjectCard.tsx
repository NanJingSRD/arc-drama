import { Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { posterGridStyle } from "@/components/ui/darkroom-tokens";
import { ProgressSteps } from "./ProgressSteps";
import {
  WS2_HOME_BADGE_CLASS,
  WS2_HOME_CARD_CLASS,
  WS2_HOME_CARD_FOOTER_CLASS,
  WS2_HOME_POSTER_PLACEHOLDER_CLASS,
} from "./workspace-v2-home-theme";
import type { WorkspaceV2Project } from "@/types/workspace-v2";
import { workspaceV2ProjectEntryHref } from "@/utils/workspace-v2-project-paths";
import { cn } from "@/lib/utils";

const POSTER_GRID = posterGridStyle({ size: 28, opacity: 0.1 });

interface ProjectCardProps {
  project: WorkspaceV2Project;
  onDelete?: () => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  return (
    <article className="group relative h-full">
      <Link
        href={workspaceV2ProjectEntryHref(project.id, project.progress)}
        className="block h-full cursor-pointer no-underline"
      >
        <Card className={cn(WS2_HOME_CARD_CLASS, "h-full")}>
          <div className="flex h-full flex-col">
            <div className="relative aspect-16/9 overflow-hidden bg-[#12151c]">
              {project.coverUrl ? (
                <img
                  src={project.coverUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
                />
              ) : (
                <div className={WS2_HOME_POSTER_PLACEHOLDER_CLASS} />
              )}
              <div className="pointer-events-none absolute inset-0" style={POSTER_GRID} />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-black/10" />

              <Badge className={cn(WS2_HOME_BADGE_CLASS, "absolute right-3 top-3 border-0")}>
                {project.contentModeLabel}
              </Badge>

              <h3 className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] truncate text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-[15px]">
                {project.name}
              </h3>
            </div>

            <CardContent className="px-4 pb-3 pt-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-xs leading-relaxed text-white/55">
                  {project.style}
                </p>
                <span className="shrink-0 text-xs text-white/45">{project.episodeCount} 集</span>
              </div>
            </CardContent>

            <CardFooter className={cn(WS2_HOME_CARD_FOOTER_CLASS, "px-4 py-3")}>
              <ProgressSteps progress={project.progress} />
            </CardFooter>
          </div>
        </Card>
      </Link>

      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          className="absolute left-3 top-3 z-20 h-8 w-8 border border-white/15 bg-black/55 text-white/80 opacity-0 backdrop-blur-sm transition-[opacity,background-color,border-color,color] duration-200 hover:border-rose-400/45 hover:bg-black/70 hover:text-rose-300 group-hover:opacity-100"
          aria-label={`删除项目 ${project.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </article>
  );
}
