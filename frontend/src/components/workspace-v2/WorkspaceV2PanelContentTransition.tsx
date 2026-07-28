import type { ReactNode } from "react";

interface WorkspaceV2PanelContentTransitionProps {
  transitionKey: string | number;
  children: ReactNode;
  className?: string;
}

export function WorkspaceV2PanelContentTransition({
  transitionKey,
  children,
  className = "",
}: WorkspaceV2PanelContentTransitionProps) {
  return (
    <div
      key={transitionKey}
      className={`motion-safe:animate-[workspace-v2-panel-enter_0.22s_ease-out] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
