// router.tsx — Route definitions for the studio layout

import { useEffect } from "react";
import { Route, Switch, Redirect, useParams, Router } from "wouter";
import { PublicSiteRoute, WorkspaceAuthRoute } from "@/components/auth/WorkspaceAuthRoute";
import { WeChatReauthHandler } from "@/components/auth/WeChatReauthHandler";
import { StudioLayout, SiteShell } from "@/components/layout";
import { StudioCanvasRouter } from "@/components/canvas/StudioCanvasRouter";
import { ProjectsPage } from "@/components/pages/ProjectsPage";
import { WelcomePage } from "@/components/pages/WelcomePage";
import { FeaturedWorksPage } from "@/components/pages/FeaturedWorksPage";
import { PromptFactoryPage } from "@/components/pages/PromptFactoryPage";
import { SystemConfigPage } from "@/components/pages/SystemConfigPage";
import { ProjectSettingsPage } from "@/components/pages/ProjectSettingsPage";
import { AssetLibraryPage } from "@/components/pages/AssetLibraryPage";
import { WorkspaceV2Page } from "@/components/pages/WorkspaceV2Page";
import { WorkspaceV2ProjectDetailPage } from "@/components/pages/WorkspaceV2ProjectDetailPage";
import { WeChatCallbackPage } from "@/pages/WeChatCallbackPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ToastOverlay } from "@/components/layout/ToastOverlay";
import { API } from "@/api";
import { useProjectsStore } from "@/stores/projects-store";
import { useAssistantStore } from "@/stores/assistant-store";
import { useAuthStore } from "@/stores/auth-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { getAppBase } from "@/utils/app-base";

// ---------------------------------------------------------------------------
// ConfigStatusLoader — 登录后集中拉取一次配置完整性状态
// ---------------------------------------------------------------------------

/**
 * 配置完整性（红点 / 必需设置提醒）的单点加载器，始终挂载在路由根，跨页面导航存活。
 * 单例 store 一次初始化即覆盖所有落地页（首页 / 设置 / 项目），不再依赖某个具体页面
 * 是否在 mount 时拉取。首次失败（如后端尚未就绪）时带界次数退避重试，无需手动刷新页面。
 */
function ConfigStatusLoader() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      await useConfigStatusStore.getState().fetch();
      if (cancelled) return;
      if (!useConfigStatusStore.getState().initialized && attempts < 5) {
        attempts += 1;
        timer = setTimeout(() => void tick(), 800 * attempts);
      }
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isAuthenticated]);

  return null;
}

// ---------------------------------------------------------------------------
// Studio workspace loader
// ---------------------------------------------------------------------------

function StudioWorkspace() {
  const params = useParams<{ projectName: string }>();
  const projectName = params.projectName ?? null;
  const { setCurrentProject, setProjectDetailLoading } = useProjectsStore();

  useEffect(() => {
    if (!projectName) return;
    let cancelled = false;

    // 清空上一个项目的 assistant 状态，确保会话隔离
    const assistantState = useAssistantStore.getState();
    assistantState.setSessions([]);
    assistantState.setCurrentSessionId(null);
    assistantState.setTurns([]);
    assistantState.setDraftTurn(null);
    assistantState.setSessionStatus(null);
    assistantState.setIsDraftSession(false);

    setProjectDetailLoading(true);
    API.getProject(projectName)
      .then((res) => {
        if (!cancelled) {
          setCurrentProject(projectName, res.project, res.scripts ?? {}, res.asset_fingerprints);
        }
      })
      .catch(() => {
        // Still set the project name so the UI shows something
        if (!cancelled) {
          setCurrentProject(projectName, null);
        }
      })
      .finally(() => {
        if (!cancelled) setProjectDetailLoading(false);
      });

    return () => {
      cancelled = true;
      setCurrentProject(null, null);
    };
  }, [projectName, setCurrentProject, setProjectDetailLoading]);

  return (
    <StudioLayout>
      <StudioCanvasRouter />
    </StudioLayout>
  );
}

// ---------------------------------------------------------------------------
// Top-level route tree
// ---------------------------------------------------------------------------

export function AppRoutes() {
  const routerBase = getAppBase() || undefined;

  return (
    <Router base={routerBase}>
      <ConfigStatusLoader />
      <WeChatReauthHandler />
      <Switch>
        {/* WeChat OAuth callback bridge（须排在 /login 重定向前） */}
        <Route path="/login/wechat-callback" component={WeChatCallbackPage} />

        {/* 旧密码登录页已下线：访问 /login 回首页 */}
        <Route path="/login">
          <Redirect to="/app/home" />
        </Route>

        {/* Root redirects to welcome home */}
        <Route path="/">
          <Redirect to="/app/home" />
        </Route>

        {/* /app and /app/ also redirect to welcome home */}
        <Route path="/app">
          <Redirect to="/app/home" />
        </Route>

        {/* Welcome home — public */}
        <Route path="/app/home">
          <PublicSiteRoute>
            <SiteShell>
              <WelcomePage />
            </SiteShell>
          </PublicSiteRoute>
        </Route>

        {/* Featured works — public */}
        <Route path="/app/featured">
          <PublicSiteRoute>
            <SiteShell>
              <FeaturedWorksPage />
            </SiteShell>
          </PublicSiteRoute>
        </Route>

        {/* Prompt factory — public */}
        <Route path="/app/prompt-factory">
          <PublicSiteRoute>
            <SiteShell>
              <PromptFactoryPage />
            </SiteShell>
          </PublicSiteRoute>
        </Route>

        {/* Projects list (workspace) — requires login */}
        <Route path="/app/projects">
          <SiteShell>
            <WorkspaceAuthRoute>
              <ProjectsPage />
            </WorkspaceAuthRoute>
          </SiteShell>
        </Route>

        {/* Workspace 2.0 — requires login */}
        <Route path="/app/workspace-v2">
          <SiteShell>
            <WorkspaceAuthRoute>
              <WorkspaceV2Page />
            </WorkspaceAuthRoute>
          </SiteShell>
        </Route>

        {/* Workspace 2.0 — project detail (nested sub-routes) */}
        <Route path="/app/workspace-v2/:projectId" nest>
          <SiteShell>
            <WorkspaceAuthRoute>
              <WorkspaceV2ProjectDetailPage />
            </WorkspaceAuthRoute>
          </SiteShell>
        </Route>

        {/* System settings — requires login */}
        <Route path="/app/settings">
          <SiteShell>
            <WorkspaceAuthRoute>
              <SystemConfigPage />
            </WorkspaceAuthRoute>
          </SiteShell>
        </Route>

        {/* Asset library — requires login */}
        <Route path="/app/assets">
          <SiteShell>
            <WorkspaceAuthRoute>
              <AssetLibraryPage />
            </WorkspaceAuthRoute>
          </SiteShell>
        </Route>

        {/* Project settings — requires login */}
        <Route path="/app/projects/:projectName/settings">
          <SiteShell>
            <WorkspaceAuthRoute>
              <ProjectSettingsPage />
            </WorkspaceAuthRoute>
          </SiteShell>
        </Route>

        {/* Studio workspace (three-column layout) — requires login */}
        <Route path="/app/projects/:projectName" nest>
          <WorkspaceAuthRoute>
            <StudioWorkspace />
          </WorkspaceAuthRoute>
        </Route>

        {/* 404 */}
        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
      <ToastOverlay />
    </Router>
  );
}
