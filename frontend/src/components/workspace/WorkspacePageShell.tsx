import type { CSSProperties, ReactNode } from "react";
import { WorkspaceWeb3Background } from "./WorkspaceWeb3Background";
import { useWorkspaceW3BodyClass } from "./useWorkspaceW3BodyClass";

interface WorkspacePageShellProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 全屏固定布局（设置页、项目设置等） */
  fullHeight?: boolean;
  /** fixed inset-0 overlay（项目设置浮层） */
  fixed?: boolean;
  /** 隐藏背景中央大圆环（项目详情等专注内容页） */
  hideCenterRing?: boolean;
  /** flat — 工作空间 2.0 黑灰扁平背景；studio — 首页影棚级质感背景 */
  background?: "web3" | "flat" | "studio";
}

export function WorkspacePageShell({
  children,
  className = "",
  style,
  fullHeight = false,
  fixed = false,
  hideCenterRing = false,
  background = "web3",
}: WorkspacePageShellProps) {
  useWorkspaceW3BodyClass();

  const layoutCls = fixed
    ? "fixed inset-0 z-50 flex flex-col overflow-hidden"
    : fullHeight
      ? "relative flex h-screen flex-col overflow-hidden"
      : "relative min-h-screen";

  return (
    <div className={`${layoutCls} workspace-w3 text-text ${className}`} style={style}>
      <WorkspaceWeb3Background hideCenterRing={hideCenterRing} variant={background} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
