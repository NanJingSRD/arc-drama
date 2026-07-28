import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "default" | "sm" | "icon";

const variantCls: Record<ButtonVariant, string> = {
  default:
    "bg-gradient-to-br from-[#06B6D4] to-[#6366F1] text-primary-foreground shadow-sm hover:opacity-95",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-accent/10 hover:text-accent-foreground",
  ghost: "text-muted-foreground hover:bg-accent/10 hover:text-foreground",
  destructive:
    "bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-sm",
};

const sizeCls: Record<ButtonSize, string> = {
  default: "h-9 gap-2 px-4 py-2 text-sm",
  sm: "h-8 gap-1.5 px-3 text-xs",
  icon: "h-8 w-8 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-0",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
