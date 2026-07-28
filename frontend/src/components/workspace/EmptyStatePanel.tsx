import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyStatePanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/60 bg-muted/10 px-8 py-16 text-center shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
