import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Clapperboard, FolderOpen, Landmark, LayoutDashboard, Package, Users } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { WorkspaceV2AssetSubNavId } from "@/types/workspace-v2";
import { WORKSPACE_V2_ASSET_SUB_NAV_LABELS } from "@/types/workspace-v2";
import {
  parseWorkspaceV2ProjectDetailNav,
  workspaceV2ProjectAssetHref,
  workspaceV2ProjectEpisodesHref,
  workspaceV2ProjectOverviewHref,
} from "@/utils/workspace-v2-project-paths";
import { Button } from "@/components/ui/button";
import {
  WS2_SIDEBAR_CLASS,
  ws2NavActiveClass,
  ws2NavInactiveClass,
  ws2SubNavActiveClass,
  ws2SubNavInactiveClass,
} from "../workspace-v2-theme";
import { cn } from "@/lib/utils";

const ASSET_SUB_ITEMS: { id: WorkspaceV2AssetSubNavId; label: string; icon: typeof Users }[] = [
  { id: "characters", label: WORKSPACE_V2_ASSET_SUB_NAV_LABELS.characters, icon: Users },
  { id: "scenes", label: WORKSPACE_V2_ASSET_SUB_NAV_LABELS.scenes, icon: Landmark },
  { id: "props", label: WORKSPACE_V2_ASSET_SUB_NAV_LABELS.props, icon: Package },
];

interface ProjectDetailSidebarProps {
  projectId: string;
  assetCounts?: { characters: number; scenes: number; props: number };
}

const linkClassName =
  "flex min-w-0 flex-1 items-center gap-2.5 text-left no-underline text-inherit";

function NavItem({
  active,
  href,
  icon: Icon,
  label,
  children,
}: {
  active: boolean;
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-medium transition-colors duration-200",
        active ? ws2NavActiveClass() : ws2NavInactiveClass(),
      )}
    >
      <Link href={href} className={linkClassName}>
        <Icon className="h-4 w-4 shrink-0 opacity-80" />
        <span className="flex-1">{label}</span>
      </Link>
      {children}
    </div>
  );
}

export function ProjectDetailSidebar({ projectId, assetCounts }: ProjectDetailSidebarProps) {
  const [location] = useLocation();
  const { activeNav, activeAssetSubNav } = useMemo(
    () => parseWorkspaceV2ProjectDetailNav(location, projectId),
    [location, projectId],
  );
  const [assetExpanded, setAssetExpanded] = useState(activeNav === "asset-library");

  useEffect(() => {
    if (activeNav === "asset-library") {
      setAssetExpanded(true);
    }
  }, [activeNav]);

  const overviewHref = workspaceV2ProjectOverviewHref(projectId);
  const episodesHref = workspaceV2ProjectEpisodesHref(projectId);
  const defaultAssetHref = workspaceV2ProjectAssetHref(projectId, activeAssetSubNav);

  return (
    <aside className={cn("flex w-[200px] shrink-0 flex-col py-4", WS2_SIDEBAR_CLASS)}>
      <nav className="flex flex-col gap-1 px-2 pt-1">
        <NavItem
          active={activeNav === "overview"}
          href={overviewHref}
          icon={LayoutDashboard}
          label="项目概览"
        />

        <NavItem
          active={activeNav === "episode-management"}
          href={episodesHref}
          icon={Clapperboard}
          label="剧集管理"
        />

        <div>
          <NavItem
            active={activeNav === "asset-library"}
            href={defaultAssetHref}
            icon={FolderOpen}
            label="资产库"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setAssetExpanded((v) => !v)}
              className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100"
              aria-label={assetExpanded ? "收起资产库" : "展开资产库"}
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform duration-200", assetExpanded && "rotate-180")}
              />
            </Button>
          </NavItem>

          {assetExpanded ? (
            <div className="mt-1 flex flex-col gap-0.5 pl-4">
              {ASSET_SUB_ITEMS.map(({ id: subId, label: subLabel, icon: SubIcon }) => {
                const subActive = activeNav === "asset-library" && activeAssetSubNav === subId;
                const count = assetCounts?.[subId];
                return (
                  <Link
                    key={subId}
                    href={workspaceV2ProjectAssetHref(projectId, subId)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs no-underline transition-colors duration-200",
                      subActive ? ws2SubNavActiveClass() : ws2SubNavInactiveClass(),
                    )}
                  >
                    <SubIcon className="h-3 w-3 opacity-50" />
                    <span className="flex-1">{subLabel}</span>
                    {count != null ? (
                      <span className="text-[10px] text-white/40">{count}</span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}
