import type { CSSProperties, ReactNode } from "react";
import { W3 } from "./workspace-web3-theme";

interface GradientFrameProps {
  children: ReactNode;
  className?: string;
  radius?: number;
  glow?: boolean;
  /** subtle — 低饱和边框，用于 NOW EDITING 等大卡 */
  /** glass — 半透明毛玻璃，用于工作空间列表页头等 */
  tone?: "default" | "subtle" | "glass";
}

function glassPanelStyle(radius: number, glow: boolean): CSSProperties {
  return {
    borderRadius: radius,
    background: W3.glassPanelBg,
    backdropFilter: W3.glassPanelBlur,
    WebkitBackdropFilter: W3.glassPanelBlur,
    border: W3.glassPanelBorder,
    boxShadow: glow ? W3.glassPanelGlow : "inset 0 1px 0 rgba(255,255,255,0.05)",
    overflow: "hidden",
  };
}

export function GradientFrame({
  children,
  className,
  radius = 12,
  glow = false,
  tone = "default",
}: GradientFrameProps) {
  if (tone === "glass") {
    return (
      <div className={className} style={glassPanelStyle(radius, glow)}>
        {children}
      </div>
    );
  }

  const frameStyle =
    tone === "subtle"
      ? {
          padding: 1,
          borderRadius: radius,
          background:
            "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(99,102,241,0.12) 52%, rgba(168,85,247,0.10) 100%)",
          boxShadow: glow
            ? "0 0 28px -14px rgba(34,211,238,0.12), 0 20px 48px -32px rgba(0,0,0,0.75)"
            : undefined,
        }
      : {
          padding: 1,
          borderRadius: radius,
          background: W3.gradient,
          boxShadow: glow ? W3.glowCard : undefined,
        };

  return (
    <div className={className} style={frameStyle}>
      <div
        style={{
          borderRadius: radius - 1,
          background: W3.surfaceSolid,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
