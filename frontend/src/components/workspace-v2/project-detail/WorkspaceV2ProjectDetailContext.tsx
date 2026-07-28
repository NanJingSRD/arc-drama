import { createContext, useContext, type ReactNode } from "react";
import type { WorkspaceV2ProjectDetail } from "@/types/workspace-v2";

interface WorkspaceV2ProjectDetailContextValue {
  projectId: string;
  detail: WorkspaceV2ProjectDetail | null;
  loading: boolean;
  error: string | null;
  /** 重新拉取项目详情；成功时返回最新 detail（含 progress / current_phase） */
  refresh: () => Promise<WorkspaceV2ProjectDetail | null>;
}

const WorkspaceV2ProjectDetailContext = createContext<WorkspaceV2ProjectDetailContextValue | null>(
  null,
);

export function WorkspaceV2ProjectDetailProvider({
  value,
  children,
}: {
  value: WorkspaceV2ProjectDetailContextValue;
  children: ReactNode;
}) {
  return (
    <WorkspaceV2ProjectDetailContext.Provider value={value}>
      {children}
    </WorkspaceV2ProjectDetailContext.Provider>
  );
}

export function useWorkspaceV2ProjectDetail(): WorkspaceV2ProjectDetailContextValue {
  const ctx = useContext(WorkspaceV2ProjectDetailContext);
  if (!ctx) {
    throw new Error("useWorkspaceV2ProjectDetail must be used within WorkspaceV2ProjectDetailProvider");
  }
  return ctx;
}
