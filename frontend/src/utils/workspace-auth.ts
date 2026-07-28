/** 工作空间登录是否走微信（false = 测试环境，可用扳手入口粘贴 token） */
export const WORKSPACE_REQUIRES_WECHAT_AUTH =
  import.meta.env.VITE_WORKSPACE_REQUIRES_WECHAT_AUTH !== "false";

export function isWorkspaceNavItem(id: string): boolean {
  return id === "workspace" || id === "workspace-v2";
}

export function isWorkspaceAppPath(pathname: string): boolean {
  return (
    pathname === "/app/projects" ||
    pathname.startsWith("/app/projects/") ||
    pathname === "/app/workspace-v2" ||
    pathname.startsWith("/app/workspace-v2/") ||
    pathname === "/app/settings" ||
    pathname === "/app/assets"
  );
}
