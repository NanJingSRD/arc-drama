import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceV2WelcomeTipsProps {
  line1: string;
  line2: string;
  className?: string;
}

export function WorkspaceV2WelcomeTips({ line1, line2, className }: WorkspaceV2WelcomeTipsProps) {
  if (!line1.trim() && !line2.trim()) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-2 border-l border-white/10 pl-3",
        className,
      )}
    >
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/70" strokeWidth={2} />
      <div className="min-w-0 space-y-0.5 text-[11px] leading-[1.55] text-white/45">
        {line1.trim() ? <p>{line1}</p> : null}
        {line2.trim() ? <p>{line2}</p> : null}
      </div>
    </div>
  );
}
