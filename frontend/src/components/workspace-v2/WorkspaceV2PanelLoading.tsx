import { Loader2 } from "lucide-react";

interface WorkspaceV2PanelLoadingProps {
  label: string;
}

export function WorkspaceV2PanelLoading({ label }: WorkspaceV2PanelLoadingProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-5 py-6 text-text-3">
      <Loader2 className="h-5 w-5 motion-safe:animate-spin text-accent-2" aria-hidden />
      <span className="font-mono text-[11px] uppercase tracking-[0.14em]">{label}</span>
    </div>
  );
}
