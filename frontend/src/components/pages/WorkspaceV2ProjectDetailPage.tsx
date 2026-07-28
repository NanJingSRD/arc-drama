import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { fetchWorkspaceV2ProjectDetail, workspaceV2FormFromProject } from "@/api/workspace-v2";
import { WorkspacePageShell } from "@/components/workspace";
import { WorkspaceV2CreateProjectModal } from "@/components/workspace-v2/WorkspaceV2CreateProjectModal";
import {
  ProjectDetailHeader,
  ProjectDetailWorkflowNav,
  WorkspaceV2ProjectDetailRouter,
} from "@/components/workspace-v2/project-detail";
import { WorkspaceV2ProjectDetailProvider } from "@/components/workspace-v2/project-detail/WorkspaceV2ProjectDetailContext";
import { WS2_DETAIL_NODE_BACKDROP_CLASS } from "@/components/workspace-v2/workspace-v2-theme";
import type { WorkspaceV2ProjectDetail } from "@/types/workspace-v2";
import { TaskFailureListener } from "@/components/layout/TaskFailureListener";
import {
  useWorkspaceV2AssetTaskRefresh,
  WORKSPACE_V2_PROJECT_DETAIL_TASK_REFRESH_TYPES,
} from "@/hooks/useWorkspaceV2AssetTaskRefresh";
import { useWorkspaceV2StyleTemplates } from "@/hooks/useWorkspaceV2StyleTemplates";
import { useWorkspaceV2Tasks } from "@/hooks/useWorkspaceV2Tasks";
import {
  workspaceV2ProjectBase,
  workspaceV2WorkflowStepHref,
} from "@/utils/workspace-v2-project-paths";
import { absoluteAppPath, toRouterPath } from "@/utils/app-base";

export function WorkspaceV2ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? "";
  const [, navigate] = useLocation();

  const [detail, setDetail] = useState<WorkspaceV2ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: styleTemplates,
    loading: styleTemplatesLoading,
    error: styleTemplatesError,
  } = useWorkspaceV2StyleTemplates();

  const editInitialForm = useMemo(
    () => (detail ? workspaceV2FormFromProject(detail.sourceProject) : null),
    [detail],
  );

  const loadDetail = useCallback(async (opts?: { showLoading?: boolean }) => {
    if (!projectId) return null;
    const showLoading = opts?.showLoading ?? false;
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchWorkspaceV2ProjectDetail(projectId);
      setDetail(data);
      return data;
    } catch {
      if (showLoading) setError("加载项目详情失败");
      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [projectId]);

  const refreshDetail = useCallback(() => loadDetail(), [loadDetail]);

  useEffect(() => {
    void loadDetail({ showLoading: true });
  }, [loadDetail]);

  useWorkspaceV2Tasks(projectId);
  // 资产图 / 视频任务成功后重拉详情，同步顶部工作流节点（含开放「已完成」）
  useWorkspaceV2AssetTaskRefresh(
    projectId,
    refreshDetail,
    WORKSPACE_V2_PROJECT_DETAIL_TASK_REFRESH_TYPES,
  );

  // 仅首次落到无子路径时按 current_phase 定位；之后 progress 刷新只更新节点样式，不自动跳转
  // 从项目卡片进入时已带目标子路径（workspaceV2ProjectEntryHref），不会走这条逻辑
  const bareLandingDoneRef = useRef(false);
  useEffect(() => {
    bareLandingDoneRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !detail || bareLandingDoneRef.current) return;
    const base = workspaceV2ProjectBase(projectId);
    const routerPath = toRouterPath(window.location.pathname);
    const isBare = routerPath === base || routerPath === `${base}/`;
    if (!isBare) {
      bareLandingDoneRef.current = true;
      return;
    }
    bareLandingDoneRef.current = true;
    navigate(workspaceV2WorkflowStepHref(projectId, detail.progress), { replace: true });
  }, [detail, navigate, projectId]);

  const assetCounts = detail
    ? {
        characters: detail.assetProgress.characters.total,
        scenes: detail.assetProgress.scenes.total,
        props: detail.assetProgress.props.total,
      }
    : undefined;

  return (
    <WorkspacePageShell fullHeight hideCenterRing>
      <TaskFailureListener projectName={projectId} />
      <ProjectDetailHeader
        projectName={detail?.name ?? decodeURIComponent(projectId)}
        contentModeLabel={detail?.contentModeLabel}
        dramaType={detail?.dramaType}
        onBack={() => navigate(absoluteAppPath("/app/workspace-v2"))}
        onSettings={() => {
          if (detail) setEditOpen(true);
        }}
        centerSlot={
          projectId ? (
            <ProjectDetailWorkflowNav
              projectId={projectId}
              projectProgress={detail?.progress}
              nodeBackdropClass={WS2_DETAIL_NODE_BACKDROP_CLASS}
              compact
            />
          ) : null
        }
      />

      <WorkspaceV2CreateProjectModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        editProjectId={detail?.id ?? projectId}
        initialForm={editInitialForm}
        onUpdated={() => void refreshDetail()}
        styleTemplates={styleTemplates}
        styleTemplatesLoading={styleTemplatesLoading}
        styleTemplatesError={styleTemplatesError}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pt-4">
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden pb-4">
              <WorkspaceV2ProjectDetailProvider
                value={{ projectId, detail, loading, error, refresh: refreshDetail }}
              >
                <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                  <WorkspaceV2ProjectDetailRouter assetCounts={assetCounts} />
                </div>
              </WorkspaceV2ProjectDetailProvider>
            </div>
          )}
        </main>
      </div>
    </WorkspacePageShell>
  );
}
