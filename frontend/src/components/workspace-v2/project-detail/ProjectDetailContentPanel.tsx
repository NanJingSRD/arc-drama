import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { WS2_DETAIL_SHELL_CLASS } from "../workspace-v2-theme";
import { cn } from "@/lib/utils";

interface ProjectDetailContentPanelProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ProjectDetailContentPanel({
  children,
  className,
  contentClassName,
}: ProjectDetailContentPanelProps) {
  return (
    <Card className={cn(WS2_DETAIL_SHELL_CLASS, "flex min-h-0 flex-1 flex-col", className)}>
      <CardContent
        className={cn(
          "relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}
