import { absoluteAppPath, toRouterPath } from "@/utils/app-base";
import {
  WORKSPACE_V2_PROGRESS_ORDER,
  type WorkspaceV2AssetSubNavId,
  type WorkspaceV2DetailNavId,
  type WorkspaceV2Progress,
} from "@/types/workspace-v2";

const ASSET_SUB_NAVS: WorkspaceV2AssetSubNavId[] = ["characters", "scenes", "props"];

export function workspaceV2ProjectBase(projectId: string): string {
  return `/app/workspace-v2/${encodeURIComponent(projectId)}`;
}

export function workspaceV2ProjectOverviewPath(projectId: string): string {
  return `${workspaceV2ProjectBase(projectId)}/overview`;
}

export function workspaceV2ProjectAssetPath(
  projectId: string,
  asset: WorkspaceV2AssetSubNavId,
): string {
  return `${workspaceV2ProjectBase(projectId)}/assets/${asset}`;
}

export function workspaceV2ProjectEpisodesPath(projectId: string): string {
  return `${workspaceV2ProjectBase(projectId)}/episodes`;
}

export function workspaceV2ProjectProductionPath(projectId: string): string {
  return `${workspaceV2ProjectBase(projectId)}/production`;
}

export function workspaceV2ProjectCompletedPath(projectId: string): string {
  return `${workspaceV2ProjectBase(projectId)}/completed`;
}

/** wouter nest 内跳转须用 `~` 绝对路径，否则会拼到当前 nest 下。 */
export function workspaceV2ProjectOverviewHref(projectId: string): string {
  return absoluteAppPath(workspaceV2ProjectOverviewPath(projectId));
}

export function workspaceV2ProjectAssetHref(
  projectId: string,
  asset: WorkspaceV2AssetSubNavId,
): string {
  return absoluteAppPath(workspaceV2ProjectAssetPath(projectId, asset));
}

export function workspaceV2ProjectEpisodesHref(projectId: string): string {
  return absoluteAppPath(workspaceV2ProjectEpisodesPath(projectId));
}

export function workspaceV2ProjectProductionHref(projectId: string): string {
  return absoluteAppPath(workspaceV2ProjectProductionPath(projectId));
}

export function workspaceV2ProjectCompletedHref(projectId: string): string {
  return absoluteAppPath(workspaceV2ProjectCompletedPath(projectId));
}

export interface WorkspaceV2ProjectDetailNavState {
  activeNav: WorkspaceV2DetailNavId;
  activeAssetSubNav: WorkspaceV2AssetSubNavId;
}

/** 详情页顶部工作流节点 — 进度已到达（含当前）的节点可跳转 */
export const WORKSPACE_V2_NAVIGABLE_WORKFLOW_STEPS =
  WORKSPACE_V2_PROGRESS_ORDER satisfies readonly WorkspaceV2Progress[];

export function workspaceV2NavToWorkflowStep(
  activeNav: WorkspaceV2DetailNavId,
): WorkspaceV2Progress {
  switch (activeNav) {
    case "overview":
      return "script_import";
    case "episode-management":
      return "script_episoding";
    case "asset-library":
      return "asset_generation";
    case "production":
      return "production";
    case "completed":
      return "completed";
  }
}

/** nest 路由内 Redirect / 相对跳转用的子路径 */
export function workspaceV2WorkflowStepNestPath(step: WorkspaceV2Progress): string {
  switch (step) {
    case "script_import":
      return "/overview";
    case "script_episoding":
      return "/episodes";
    case "asset_generation":
      return "/assets/characters";
    case "production":
      return "/production";
    case "completed":
      return "/completed";
  }
}

export function workspaceV2WorkflowStepHref(
  projectId: string,
  step: WorkspaceV2Progress,
): string {
  switch (step) {
    case "script_import":
      return workspaceV2ProjectOverviewHref(projectId);
    case "script_episoding":
      return workspaceV2ProjectEpisodesHref(projectId);
    case "asset_generation":
      return workspaceV2ProjectAssetHref(projectId, "characters");
    case "production":
      return workspaceV2ProjectProductionHref(projectId);
    case "completed":
      return workspaceV2ProjectCompletedHref(projectId);
  }
}

/** 从项目列表进入详情时落到当前激活工作流节点 */
export function workspaceV2ProjectEntryHref(
  projectId: string,
  progress: WorkspaceV2Progress,
): string {
  return workspaceV2WorkflowStepHref(projectId, progress);
}

/** 从当前 pathname 解析项目详情侧栏高亮状态。 */
export function parseWorkspaceV2ProjectDetailNav(
  pathname: string,
  projectId: string,
): WorkspaceV2ProjectDetailNavState {
  const base = workspaceV2ProjectBase(projectId);
  const routerPath = toRouterPath(pathname);
  // nest 路由下 useLocation 可能只返回 `/overview` 等相对段，需同时支持完整路径。
  const rest = routerPath.startsWith(base)
    ? routerPath.slice(base.length)
    : routerPath.startsWith("/")
      ? routerPath
      : `/${routerPath}`;

  if (rest.startsWith("/assets/")) {
    const segment = rest.slice("/assets/".length).split("/")[0];
    const asset = ASSET_SUB_NAVS.find((id) => id === segment) ?? "characters";
    return { activeNav: "asset-library", activeAssetSubNav: asset };
  }

  if (rest.startsWith("/episodes")) {
    return { activeNav: "episode-management", activeAssetSubNav: "characters" };
  }

  if (rest.startsWith("/production")) {
    return { activeNav: "production", activeAssetSubNav: "characters" };
  }

  if (rest.startsWith("/completed")) {
    return { activeNav: "completed", activeAssetSubNav: "characters" };
  }

  return { activeNav: "overview", activeAssetSubNav: "characters" };
}
