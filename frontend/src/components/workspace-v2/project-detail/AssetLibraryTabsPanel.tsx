import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Loader2, Plus } from "lucide-react";
import {
  fetchWorkspaceV2ProjectAssets,
  mapWorkspaceV2ProjectAssets,
  type WorkspaceV2MappedProjectAssets,
} from "@/api/workspace-v2";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { W3_ACCENT_BTN_SM_CLS, W3_ACCENT_BUTTON_STYLE } from "@/components/workspace";
import { useWorkspaceV2AssetTaskRefresh } from "@/hooks/useWorkspaceV2AssetTaskRefresh";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import {
  WORKSPACE_V2_ASSET_SUB_NAV_LABELS,
  WORKSPACE_V2_PROGRESS_LABELS,
  type WorkspaceV2AssetSubNavId,
} from "@/types/workspace-v2";
import { errMsg, voidCall } from "@/utils/async";
import {
  parseWorkspaceV2ProjectDetailNav,
  workspaceV2ProjectAssetHref,
} from "@/utils/workspace-v2-project-paths";
import { AssetLibraryHeaderActionsContext } from "./AssetLibraryHeaderActionsContext";
import { AssetLibraryPanel } from "./AssetLibraryPanel";
import { useWorkspaceV2ProjectDetail } from "./WorkspaceV2ProjectDetailContext";
import { Ws2NodeContentLayout } from "./Ws2NodeContentLayout";
import { WorkspaceV2PanelContentTransition } from "../WorkspaceV2PanelContentTransition";
import { WS2_ASSET_TAB_ACTIVE_BG_CLASS, WS2_ASSET_TAB_COUNT_CLASS } from "../workspace-v2-theme";

const ASSET_TABS: WorkspaceV2AssetSubNavId[] = ["characters", "scenes", "props"];

const EMPTY_ASSETS: WorkspaceV2MappedProjectAssets = {
  characters: {},
  scenes: {},
  props: {},
};

interface AssetLibraryTabsPanelProps {
  assetCounts?: { characters: number; scenes: number; props: number };
}

export function AssetLibraryTabsPanel({ assetCounts }: AssetLibraryTabsPanelProps) {
  const { t } = useTranslation(["assets", "dashboard"]);
  const tRef = useRef(t);
  tRef.current = t;
  const { projectId } = useWorkspaceV2ProjectDetail();
  const [location, navigate] = useLocation();
  const { activeAssetSubNav } = parseWorkspaceV2ProjectDetailNav(location, projectId);
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);
  const [addingAsset, setAddingAsset] = useState(false);
  const [tabContentBusy, setTabContentBusy] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assets, setAssets] = useState<WorkspaceV2MappedProjectAssets>(EMPTY_ASSETS);

  const reloadAssets = useCallback(async () => {
    const data = await fetchWorkspaceV2ProjectAssets(projectId);
    const mapped = mapWorkspaceV2ProjectAssets(data);
    setAssets(mapped);
    return mapped;
  }, [projectId]);

  // 生成全部 / 单卡生成 / 提取资产任务成功后，重新拉 GET /assets
  useWorkspaceV2AssetTaskRefresh(projectId, reloadAssets);

  useEffect(() => {
    let cancelled = false;
    setAssetsLoading(true);
    voidCall((async () => {
      try {
        await reloadAssets();
      } catch (err) {
        if (!cancelled) {
          useAppStore
            .getState()
            .pushToast(
              tRef.current("dashboard:load_failed", { message: errMsg(err) }),
              "error",
            );
          setAssets(EMPTY_ASSETS);
        }
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    })());
    return () => {
      cancelled = true;
    };
  }, [reloadAssets]);

  useEffect(() => {
    setAddingAsset(false);
    setTabContentBusy(false);
  }, [activeAssetSubNav]);

  const resolvedCounts = {
    characters: Object.keys(assets.characters).length,
    scenes: Object.keys(assets.scenes).length,
    props: Object.keys(assets.props).length,
  };
  // 首屏加载中仍用详情里的统计，避免 tab 数字闪成 0
  const displayCounts = assetsLoading && assetCounts ? assetCounts : resolvedCounts;

  return (
    <AssetLibraryHeaderActionsContext.Provider value={setHeaderActions}>
      <Ws2NodeContentLayout
        title={WORKSPACE_V2_PROGRESS_LABELS.asset_generation}
        plainBody
        scrollBody={false}
        bodyInnerClassName="p-0"
        toolbar={
          <>
            <Tabs
              value={activeAssetSubNav}
              className="min-w-0"
              onValueChange={(value) => {
                navigate(workspaceV2ProjectAssetHref(projectId, value as WorkspaceV2AssetSubNavId));
              }}
            >
              <TabsList aria-label="资产类型">
                {ASSET_TABS.map((id) => {
                  const count = displayCounts[id];
                  return (
                    <TabsTrigger
                      key={id}
                      value={id}
                      className={cn("px-2.5 py-1.5 text-[12px]", WS2_ASSET_TAB_ACTIVE_BG_CLASS)}
                    >
                      {WORKSPACE_V2_ASSET_SUB_NAV_LABELS[id]}
                      <span className={WS2_ASSET_TAB_COUNT_CLASS}>{count}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {headerActions}
              <button
                type="button"
                onClick={() => setAddingAsset(true)}
                disabled={tabContentBusy || assetsLoading}
                className={cn(
                  W3_ACCENT_BTN_SM_CLS,
                  (tabContentBusy || assetsLoading) && "cursor-not-allowed opacity-50",
                )}
                style={W3_ACCENT_BUTTON_STYLE}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("create_title", { type: WORKSPACE_V2_ASSET_SUB_NAV_LABELS[activeAssetSubNav] })}
              </button>
            </div>
          </>
        }
      >
        {assetsLoading ? (
          <div
            className="flex min-h-[280px] flex-1 items-center justify-center"
            aria-busy="true"
          >
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400/70" />
          </div>
        ) : (
          <WorkspaceV2PanelContentTransition
            transitionKey={activeAssetSubNav}
            className="flex min-h-0 flex-1 flex-col"
          >
            <AssetLibraryPanel
              subNav={activeAssetSubNav}
              className="min-h-0 flex-1"
              assets={assets}
              onReloadAssets={reloadAssets}
              addingAsset={addingAsset}
              onAddingAssetChange={setAddingAsset}
              onTabContentBusyChange={setTabContentBusy}
            />
          </WorkspaceV2PanelContentTransition>
        )}
      </Ws2NodeContentLayout>
    </AssetLibraryHeaderActionsContext.Provider>
  );
}
