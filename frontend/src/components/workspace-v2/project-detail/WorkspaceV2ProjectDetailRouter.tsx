import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Redirect, useLocation } from "wouter";
import { EmptyStatePanel } from "@/components/workspace";
import { AssetLibraryTabsPanel } from "./AssetLibraryTabsPanel";
import { EpisodeManagementPanel } from "./EpisodeManagementPanel";
import { ProjectDetailContentPanel } from "./ProjectDetailContentPanel";
import { ProjectOverviewPanel } from "./ProjectOverviewPanel";
import { StoryboardProductionPanel } from "./StoryboardProductionPanel";
import { WorkflowStepPlaceholderPanel } from "./WorkflowStepPlaceholderPanel";
import { useWorkspaceV2ProjectDetail } from "./WorkspaceV2ProjectDetailContext";
import {
  parseWorkspaceV2ProjectDetailNav,
  workspaceV2WorkflowStepNestPath,
} from "@/utils/workspace-v2-project-paths";

function workspaceV2DetailContentKey(location: string, projectId: string): string {
  const { activeNav, activeAssetSubNav } = parseWorkspaceV2ProjectDetailNav(location, projectId);
  if (activeNav === "asset-library") return `asset-${activeAssetSubNav}`;
  return activeNav;
}

interface WorkspaceV2ProjectDetailRouterProps {
  assetCounts?: { characters: number; scenes: number; props: number };
}

export function WorkspaceV2ProjectDetailRouter({ assetCounts }: WorkspaceV2ProjectDetailRouterProps) {
  const [location] = useLocation();
  const { projectId, detail, error } = useWorkspaceV2ProjectDetail();
  const reduceMotion = useReducedMotion();
  // 无子路径时只按首次拿到的 progress 落地一次，避免详情刷新后再次 Redirect
  const bareLandingNestPathRef = useRef<string | null>(null);
  useEffect(() => {
    bareLandingNestPathRef.current = null;
  }, [projectId]);

  if (error) {
    return (
      <ProjectDetailContentPanel>
        <EmptyStatePanel>
          <p className="text-sm text-foreground">{error}</p>
        </EmptyStatePanel>
      </ProjectDetailContentPanel>
    );
  }

  if (!detail) {
    return null;
  }

  // 须等 detail 就绪后再跳：此前写死 /overview 会抢在 current_phase 判定之前
  // 项目卡片进入已带具体子路径，不会命中此处
  if (location === "/" || location === "") {
    if (!bareLandingNestPathRef.current) {
      bareLandingNestPathRef.current = workspaceV2WorkflowStepNestPath(detail.progress);
    }
    return <Redirect to={bareLandingNestPathRef.current} replace />;
  }

  const contentKey = workspaceV2DetailContentKey(location, projectId);

  const panel = (() => {
    switch (contentKey) {
      case "overview":
        return <ProjectOverviewPanel detail={detail} />;
      case "asset-characters":
      case "asset-scenes":
      case "asset-props":
        return <AssetLibraryTabsPanel assetCounts={assetCounts} />;
      case "episode-management":
        return <EpisodeManagementPanel />;
      case "production":
        return <StoryboardProductionPanel />;
      case "completed":
        return <WorkflowStepPlaceholderPanel />;
      default:
        return <ProjectOverviewPanel detail={detail} />;
    }
  })();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={contentKey.startsWith("asset-") ? "asset-library" : contentKey}
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{
          duration: reduceMotion ? 0.12 : 0.26,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <ProjectDetailContentPanel
          contentClassName={contentKey === "production" ? "p-2 sm:p-2" : undefined}
        >
          {panel}
        </ProjectDetailContentPanel>
      </motion.div>
    </AnimatePresence>
  );
}
