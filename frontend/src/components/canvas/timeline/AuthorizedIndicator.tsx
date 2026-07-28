import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AuthorizedIndicatorProps {
  variant?: "badge" | "thumbnail";
  /** 角标直角（工作空间 2.0 分镜卡片为直角外框时使用） */
  sharpCorners?: boolean;
}

/**
 * 分镜已授权状态指示器。thumbnail 用于列表缩略图叠加；badge 用于行内标签。
 */
export function AuthorizedIndicator({
  variant = "badge",
  sharpCorners = false,
}: AuthorizedIndicatorProps) {
  const { t } = useTranslation("dashboard");
  const label = t("storyboard_authorized");

  if (variant === "thumbnail") {
    return (
      <span
        className={`absolute right-0 top-0 z-10 flex items-center justify-center rounded-bl-[5px] px-[5px] py-[4px] ${
          sharpCorners ? "rounded-tr-none" : "rounded-tr-[5px]"
        }`}
        style={{
          background:
            "linear-gradient(135deg, oklch(0.88 0.2 95), oklch(0.72 0.18 70))",
          boxShadow:
            "0 0 10px oklch(0.82 0.18 90 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.35)",
        }}
        title={label}
        aria-label={label}
      >
        <ShieldCheck
          className="h-3.5 w-3.5"
          style={{ color: "oklch(0.16 0.02 60)" }}
          strokeWidth={2.5}
          aria-hidden="true"
        />
      </span>
    );
  }

  return (
    <span
      className="authorized-badge inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{
        color: "oklch(0.80 0.12 85)",
        background:
          "linear-gradient(135deg, oklch(0.28 0.04 85 / 0.55), oklch(0.22 0.03 70 / 0.45))",
        border: "1px solid oklch(0.75 0.12 85 / 0.4)",
        boxShadow: "0 0 12px oklch(0.75 0.12 85 / 0.22)",
      }}
      title={label}
    >
      <ShieldCheck className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
