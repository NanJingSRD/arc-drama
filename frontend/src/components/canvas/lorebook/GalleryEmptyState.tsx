import { W3 } from "@/components/workspace";

interface Props {
  icon: React.ReactNode;
  label: string;
  hint: string;
}

/**
 * GalleryEmptyState — 资产页空态：editorial 卡片，仅展示提示文案。
 */
export function GalleryEmptyState({ icon, label, hint }: Props) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl px-8 py-16 text-center"
      style={{
        border: `1px dashed ${W3.borderSoft}`,
        background:
          "radial-gradient(600px 280px at 50% -10%, rgba(34,211,238,0.08), transparent 60%), rgba(8,14,32,0.35)",
      }}
    >
      {/* Top accent line */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.35), transparent)",
        }}
      />

      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 place-items-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(99,102,241,0.08))",
            border: `1px solid ${W3.borderSoft}`,
            color: W3.cyan,
            boxShadow: W3.glowCyan,
          }}
        >
          {icon}
        </span>
        <div className="space-y-1">
          <div
            className="display-serif text-[18px] font-semibold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            {label}
          </div>
          <p
            className="text-[12.5px] leading-[1.6]"
            style={{ color: "var(--color-text-3)" }}
          >
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
}
