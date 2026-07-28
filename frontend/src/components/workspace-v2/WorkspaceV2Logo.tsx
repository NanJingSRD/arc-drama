import { useId } from "react";

type LogoVariant = "brand" | "neutral" | "premium";

const VARIANT_STYLES = {
  brand: {
    glow: "rgba(34,211,238,0.4)",
    gradient: "linear-gradient(135deg, #22D3EE 0%, #6366F1 55%, #A855F7 100%)",
    gradientOpacity: 0.28,
    stops: ["#22D3EE", "#6366F1", "#A855F7"] as const,
    bars: ["#22D3EE", "#6366F1", "#A855F7"] as const,
  },
  neutral: {
    glow: "rgba(255,255,255,0.08)",
    gradient: "linear-gradient(135deg, #a1a1aa 0%, #71717a 100%)",
    gradientOpacity: 0.12,
    stops: ["#d4d4d8", "#a1a1aa", "#71717a"] as const,
    bars: ["#a1a1aa", "#71717a", "#52525b"] as const,
  },
  premium: {
    glow: "rgba(129,140,248,0.35)",
    gradient: "linear-gradient(135deg, #818cf8 0%, #6366f1 55%, #4f46e5 100%)",
    gradientOpacity: 0.22,
    stops: ["#a5b4fc", "#818cf8", "#6366f1"] as const,
    bars: ["#a5b4fc", "#818cf8", "#6366f1"] as const,
  },
} as const;

/** 创作向模块徽标 — 导演取景框 + 播放核心 */
export function WorkspaceV2Logo({
  size = 40,
  variant = "brand",
}: {
  size?: number;
  variant?: LogoVariant;
}) {
  const gradId = useId();
  const glowId = useId();
  const styles = VARIANT_STYLES[variant];

  return (
    <span
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="absolute inset-[12%] rounded-full"
        style={{
          background: styles.gradient,
          opacity: styles.gradientOpacity,
          filter: "blur(10px)",
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative"
        style={{ filter: `drop-shadow(0 0 8px ${styles.glow})` }}
      >
        <defs>
          <linearGradient id={gradId} x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor={styles.stops[0]} />
            <stop offset="0.55" stopColor={styles.stops[1]} />
            <stop offset="1" stopColor={styles.stops[2]} />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.35" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x="9"
          y="11"
          width="22"
          height="18"
          rx="3"
          fill="rgba(8,12,28,0.9)"
          stroke={`url(#${gradId})`}
          strokeWidth="1.2"
          strokeOpacity="0.65"
        />

        <g className="ws2-logo-corners-expand" filter={`url(#${glowId})`}>
          <path d="M2.5 15V9H6.5" stroke={`url(#${gradId})`} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M37.5 15V9H33.5" stroke={`url(#${gradId})`} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M2.5 25V31H6.5" stroke={`url(#${gradId})`} strokeWidth="1.1" strokeLinecap="round" />
          <path d="M37.5 25V31H33.5" stroke={`url(#${gradId})`} strokeWidth="1.1" strokeLinecap="round" />
        </g>

        <path d="M18.2 17.2L24.8 20L18.2 22.8V17.2Z" fill={`url(#${gradId})`} />

        <rect x="6.5" y="14" width="1.6" height="2.2" rx="0.4" fill={styles.bars[0]} opacity="0.55" />
        <rect x="6.5" y="18.5" width="1.6" height="2.2" rx="0.4" fill={styles.bars[1]} opacity="0.5" />
        <rect x="6.5" y="23" width="1.6" height="2.2" rx="0.4" fill={styles.bars[2]} opacity="0.45" />
        <rect x="31.9" y="14" width="1.6" height="2.2" rx="0.4" fill={styles.bars[0]} opacity="0.55" />
        <rect x="31.9" y="18.5" width="1.6" height="2.2" rx="0.4" fill={styles.bars[1]} opacity="0.5" />
        <rect x="31.9" y="23" width="1.6" height="2.2" rx="0.4" fill={styles.bars[2]} opacity="0.45" />
      </svg>
    </span>
  );
}
