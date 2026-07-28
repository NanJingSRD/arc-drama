import type { LucideIcon } from "lucide-react";

interface AssetGalleryCardGeneratingOverlayProps {
  icon: LucideIcon;
  label: string;
}

export function AssetGalleryCardGeneratingOverlay({
  icon: Icon,
  label,
}: AssetGalleryCardGeneratingOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-2 overflow-hidden [clip-path:inset(0_round_0.75rem)]"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_50%_42%,oklch(0.62_0.16_195/0.2),transparent)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[#0a0e14]/65 backdrop-blur-[2px] [clip-path:inset(0_round_0.75rem)]"
      />
      <div aria-hidden className="absolute inset-0 overflow-hidden opacity-50 [clip-path:inset(0_round_0.75rem)]">
        <div className="absolute inset-0 animate-shimmer" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-xl border border-cyan-400/20 motion-safe:animate-ping"
            style={{ animationDuration: "2.4s" }}
          />
          <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-cyan-400/35 bg-[#0a0e14]/85 shadow-[0_0_22px_oklch(0.62_0.16_195/0.32)]">
            <Icon className="h-4 w-4 text-cyan-300 motion-safe:animate-pulse" strokeWidth={1.8} />
          </span>
        </div>

        <p className="bg-linear-to-r from-cyan-300 to-indigo-300 bg-clip-text text-[11px] font-semibold tracking-wide text-transparent">
          {label}
        </p>

        <span aria-hidden className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1 w-1 rounded-full bg-cyan-400/75 motion-safe:animate-bounce"
              style={{ animationDelay: `${index * 0.14}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
