import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "outline" | "novel" | "series" | "ad";

const variantCls: Record<BadgeVariant, string> = {
  default: "border-transparent bg-primary/20 text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  outline: "border-border text-foreground",
  novel: "border-indigo-400/40 bg-gradient-to-br from-indigo-500/90 to-violet-500/90 text-white shadow-sm",
  series: "border-cyan-400/40 bg-gradient-to-br from-cyan-600/90 to-cyan-400/90 text-white shadow-sm",
  ad: "border-amber-300/50 bg-gradient-to-br from-amber-400 to-orange-500 text-amber-950 shadow-sm",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide backdrop-blur-sm transition-colors duration-200",
        variantCls[variant],
        className,
      )}
      {...props}
    />
  );
}
