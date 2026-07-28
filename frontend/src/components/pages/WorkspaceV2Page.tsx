import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useWorkspaceV2Projects } from "@/hooks/useWorkspaceV2Projects";
import { useWorkspaceV2StyleTemplates } from "@/hooks/useWorkspaceV2StyleTemplates";
import { deleteWorkspaceV2Project } from "@/api/workspace-v2";
import {
  FilterBar,
  ProjectCard,
  WorkspaceV2CreateProjectModal,
  WorkspaceV2PageHeader,
  WorkspaceV2SettingsModal,
  type WorkspaceV2Filters,
} from "@/components/workspace-v2";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { WelcomeBackground } from "@/components/pages/welcome/WelcomeBackground";
import { WelcomeDeferredBackground } from "@/components/pages/welcome/WelcomeLazyVideo";
import { useAppStore } from "@/stores/app-store";
import { errMsg } from "@/utils/async";
import type { WorkspaceV2Project } from "@/types/workspace-v2";
import { WS2_HOME_PANEL_CLASS } from "@/components/workspace-v2/workspace-v2-home-theme";
import {
  APP_MODULE_PROJECT_GRID,
  APP_MODULE_SECTION,
  APP_MODULE_SHELL,
} from "@/utils/site-layout";
import { cn } from "@/lib/utils";

const EMPTY_FILTERS: WorkspaceV2Filters = {
  keyword: "",
  progress: "",
  style: "",
};

function WorkspaceV2EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <Card className={cn(WS2_HOME_PANEL_CLASS, "w-full max-w-md")}>
      <CardContent className="px-8 py-14 text-center">
        <p className="text-sm font-medium text-white/90">{title}</p>
        {description ? (
          <p className="mt-2 text-sm text-white/50">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function WorkspaceV2Page() {
  const [filters, setFilters] = useState<WorkspaceV2Filters>(EMPTY_FILTERS);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<WorkspaceV2Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const pushToast = useAppStore((s) => s.pushToast);
  const debouncedKeyword = useDebouncedValue(filters.keyword.trim(), 300);

  const queryFilters = useMemo(
    () => ({ ...filters, keyword: debouncedKeyword }),
    [filters.progress, filters.style, debouncedKeyword],
  );

  const { data, loading, error, refetch } = useWorkspaceV2Projects(queryFilters);
  const {
    data: styleTemplates,
    loading: styleTemplatesLoading,
    error: styleTemplatesError,
  } = useWorkspaceV2StyleTemplates();

  const handleFilterChange = (patch: Partial<WorkspaceV2Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleDeleteConfirm = () => {
    if (!deletingProject) return;

    setDeleteLoading(true);
    void deleteWorkspaceV2Project(deletingProject.id)
      .then(() => {
        pushToast(`项目「${deletingProject.name}」已删除`, "success");
        refetch();
        setDeletingProject(null);
      })
      .catch((err: unknown) => {
        pushToast(`删除失败：${errMsg(err)}`, "error");
      })
      .finally(() => {
        setDeleteLoading(false);
      });
  };

  const total = data?.total ?? 0;

  return (
    <div
      data-testid="workspace-v2-page"
      className="relative min-h-screen text-white"
    >
      <WelcomeDeferredBackground>
        <WelcomeBackground />
      </WelcomeDeferredBackground>

      <section className={`relative ${APP_MODULE_SECTION} pb-10 sm:pb-12`}>
        <div className={APP_MODULE_SHELL}>
          <div className="mb-6 sm:mb-8">
            <WorkspaceV2PageHeader
              embedded
              onCreate={() => setCreateOpen(true)}
              onSettings={() => setSettingsOpen(true)}
            />
          </div>

          <div className="mb-6">
            <FilterBar
              embedded
              filters={filters}
              styleTemplates={styleTemplates}
              onChange={handleFilterChange}
            />
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-white/45">
              <Loader2 className="h-4 w-4 motion-safe:animate-spin text-cyan-400" />
              加载项目中…
            </div>
          ) : error ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <WorkspaceV2EmptyState title="加载失败" description={error} />
            </div>
          ) : total === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <WorkspaceV2EmptyState
                title="暂无匹配项目"
                description="试试调整筛选条件或清空搜索关键词"
              />
            </div>
          ) : (
            <div className={APP_MODULE_PROJECT_GRID}>
              {data?.items.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onDelete={() => setDeletingProject(project)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <WorkspaceV2CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={refetch}
        styleTemplates={styleTemplates}
        styleTemplatesLoading={styleTemplatesLoading}
        styleTemplatesError={styleTemplatesError}
      />

      <WorkspaceV2SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ConfirmDialog
        open={!!deletingProject}
        tone="danger"
        title="删除项目"
        description={
          deletingProject
            ? `确定删除项目「${deletingProject.name}」吗？此操作不可恢复。`
            : null
        }
        confirmLabel="删除项目"
        loadingLabel="删除中..."
        cancelLabel="取消"
        loading={deleteLoading}
        onCancel={() => {
          if (!deleteLoading) setDeletingProject(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
