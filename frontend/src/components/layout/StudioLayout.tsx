import { useLocation } from "wouter";
import { GlobalHeader } from "./GlobalHeader";
import { AssetSidebar } from "./AssetSidebar";
import { useTasksSSE } from "@/hooks/useTasksSSE";
import { useProjectEventsSSE } from "@/hooks/useProjectEventsSSE";
import { TaskFailureListener } from "./TaskFailureListener";
import { ScriptGenerationNoticeListener } from "./ScriptGenerationNoticeListener";
import { BlockingOverlay } from "@/components/ui/BlockingOverlay";
import { useWorkspaceW3BodyClass, WorkspaceWeb3Background } from "@/components/workspace";
import { useProjectsStore } from "@/stores/projects-store";
import { absoluteAppPath } from "@/utils/app-base";

interface StudioLayoutProps {
  children: React.ReactNode;
}

/**
 * 工作台三栏布局壳：顶栏 + （侧栏 / 主区）。
 */
export function StudioLayout({ children }: StudioLayoutProps) {
  const [, setLocation] = useLocation();
  const currentProjectName = useProjectsStore((s) => s.currentProjectName);

  useWorkspaceW3BodyClass();

  useTasksSSE(currentProjectName);
  useProjectEventsSSE(currentProjectName);

  return (
    <div
      className="relative flex h-screen flex-col workspace-w3"
      style={{ color: "var(--color-text)" }}
    >
      <WorkspaceWeb3Background />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <TaskFailureListener projectName={currentProjectName} />
        <ScriptGenerationNoticeListener />
        <BlockingOverlay />
        <GlobalHeader onNavigateBack={() => setLocation(absoluteAppPath("/app/projects"))} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <AssetSidebar />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
