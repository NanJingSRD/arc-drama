import { Card, CardContent } from "@/components/ui/card";
import type { WorkspaceV2Progress } from "@/types/workspace-v2";
import { ProjectDetailWorkflowNav } from "./ProjectDetailWorkflowNav";
import { WS2_DETAIL_NODE_BACKDROP_CLASS, WS2_DETAIL_SHELL_CLASS } from "../workspace-v2-theme";
import { cn } from "@/lib/utils";

interface ProjectDetailWorkflowPanelProps {
  projectId: string;
  projectProgress?: WorkspaceV2Progress;
}

export function ProjectDetailWorkflowPanel({
  projectId,
  projectProgress,
}: ProjectDetailWorkflowPanelProps) {
  return (
    <Card className={cn(WS2_DETAIL_SHELL_CLASS)}>
      <CardContent className="relative px-5 py-3.5 sm:px-6 sm:py-4">
        <ProjectDetailWorkflowNav
          projectId={projectId}
          projectProgress={projectProgress}
          nodeBackdropClass={WS2_DETAIL_NODE_BACKDROP_CLASS}
        />
      </CardContent>
    </Card>
  );
}
