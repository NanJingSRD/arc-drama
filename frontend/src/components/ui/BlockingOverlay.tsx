import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, Upload } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { lockBodyScroll } from "@/utils/body-scroll-lock";
import { UI_LAYERS } from "@/utils/ui-layers";
import { ambientGlowStyle, posterGridStyle } from "./darkroom-tokens";

/**
 * 全屏阻塞 loading 层 — 由 app-store.blockingOverlay 驱动，portal 到 body，
 * 覆盖顶栏/侧栏/画布。用于耗时请求期间禁止交互并给出主题一致的等待反馈。
 */
export function BlockingOverlay() {
  const message = useAppStore((s) => s.blockingOverlay);
  const open = message != null;

  useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center px-4 ${UI_LAYERS.blocking}`}
      aria-busy="true"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: "oklch(0.08 0.012 265 / 0.72)",
          backdropFilter: "blur(12px) saturate(1.1)",
          WebkitBackdropFilter: "blur(12px) saturate(1.1)",
        }}
      />
      <div
        role="status"
        aria-live="polite"
        aria-label={message}
        className="arc-glass-panel relative w-full max-w-sm overflow-hidden rounded-2xl px-6 py-7 text-center shadow-[0_40px_100px_-30px_oklch(0_0_0_/_0.85)]"
      >
        <span aria-hidden="true" className="arc-glass-hairline" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={posterGridStyle({ size: 36, opacity: 0.04 })}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={ambientGlowStyle({ at: "50% 0%", intensity: 0.22 })}
        />

        <span
          aria-hidden="true"
          className="relative mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent-dim), oklch(0.76 0.09 295 / 0.08))",
            border: "1px solid var(--color-accent-soft)",
            color: "var(--color-accent-2)",
            boxShadow: "0 10px 32px -10px var(--color-accent-glow)",
          }}
        >
          <Upload className="absolute h-4 w-4 opacity-35" strokeWidth={2.2} />
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>

        <p
          className="relative text-[14px] font-medium leading-relaxed"
          style={{ color: "var(--color-text)" }}
        >
          {message}
        </p>

        <div
          className="relative mx-auto mt-5 h-0.5 w-40 overflow-hidden rounded-full"
          style={{ background: "oklch(0.16 0.010 265 / 0.7)" }}
        >
          <div
            className="animate-progress-pulse absolute inset-y-0 left-0 w-1/3 rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--color-accent-soft), var(--color-accent), var(--color-accent-soft))",
              boxShadow: "0 0 6px var(--color-accent-glow)",
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
