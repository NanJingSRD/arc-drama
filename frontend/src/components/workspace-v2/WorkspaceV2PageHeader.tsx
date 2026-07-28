import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspaceV2Logo } from "./WorkspaceV2Logo";
import { WS2_HOME_GHOST_BTN_CLASS, WS2_HOME_PANEL_CLASS } from "./workspace-v2-home-theme";
import { cn } from "@/lib/utils";

interface WorkspaceV2PageHeaderProps {
  onCreate?: () => void;
  onSettings?: () => void;
  /** 嵌入统一面板时去掉外层卡片与底边距 */
  embedded?: boolean;
}

export function WorkspaceV2PageHeader({
  onCreate,
  onSettings,
  embedded = false,
}: WorkspaceV2PageHeaderProps) {
  const content = (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex min-w-0 items-center gap-4">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-2 top-1/2 h-14 w-14 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-2xl"
        />
        <WorkspaceV2Logo size={48} variant="brand" />

        <div className="relative min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            AI漫剧
            <span
              className="ml-1.5 font-semibold text-cyan-300"
              style={{ textShadow: "0 0 20px rgba(34,211,238,0.45)" }}
            >
              项目列表
            </span>
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
        <Button onClick={onCreate} size="default">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          创建项目
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onSettings}
          aria-label="设置"
          title="设置"
          className={WS2_HOME_GHOST_BTN_CLASS}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className={cn(WS2_HOME_PANEL_CLASS, "mb-5")}>
      <CardContent className="p-6">{content}</CardContent>
    </Card>
  );
}
