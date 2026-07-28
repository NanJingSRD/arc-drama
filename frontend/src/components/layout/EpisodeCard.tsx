import { useTranslation } from "react-i18next";
import { Clapperboard } from "lucide-react";
import type { EpisodeMeta } from "@/types";
import { useCostStore } from "@/stores/cost-store";
import { totalBreakdown } from "@/utils/cost-format";
import {
  W3,
  W3_EPISODE_BADGE_ACTIVE,
  W3_EPISODE_BADGE_IDLE,
  W3_EPISODE_ROW_ACTIVE,
} from "@/components/workspace";

interface EpisodeCardProps {
  ep: EpisodeMeta;
  active: boolean;
  onClick: () => void;
  /** ad 项目隐藏集语义：徽标不显示 E{n}，改用场记板图标。 */
  showEpisodeBadge?: boolean;
  /** ep.title 为空时的兜底显示文本（ad 项目用项目标题）。 */
  fallbackTitle?: string;
}

const STATUS_COLOR: Record<string, string> = {
  completed: W3.green,
  in_production: W3.cyan,
  scripted: "rgba(148, 163, 184, 0.75)",
  draft: "rgba(100, 116, 139, 0.65)",
  missing: "rgba(100, 116, 139, 0.65)",
};

const STATUS_LABEL_KEY: Record<string, string> = {
  completed: "dashboard:episode_status_done",
  in_production: "dashboard:episode_status_active",
  scripted: "dashboard:episode_status_draft",
  draft: "dashboard:episode_status_draft",
  missing: "dashboard:episode_status_idea",
};

/**
 * 侧栏分集卡片：左缩略 (E1 字符) + 中标题/状态/进度 + 右费用。
 * Active 态有 accent 紫边框 + 玻璃面板背景。
 */
export function EpisodeCard({
  ep,
  active,
  onClick,
  showEpisodeBadge = true,
  fallbackTitle,
}: EpisodeCardProps) {
  const { t } = useTranslation(["dashboard"]);
  const status = ep.status ?? "draft";
  const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.draft;
  const statusLabel = t(STATUS_LABEL_KEY[status] ?? STATUS_LABEL_KEY.draft);
  const isActive = status === "in_production";

  // 进度：优先用 storyboards/videos completed/total
  const totalShots = ep.scenes_count ?? ep.storyboards?.total ?? ep.units_count ?? 0;
  const completedShots = ep.videos?.completed ?? 0;
  const progress =
    totalShots > 0 ? Math.round((completedShots / totalShots) * 100) : 0;
  const showProgress = totalShots > 0 && (active || progress > 0);

  // 实际费用
  const episodeCost = useCostStore((s) => s.getEpisodeCost(ep.episode));
  const spentBreakdown = episodeCost ? totalBreakdown(episodeCost.totals.actual) : null;
  // spentBreakdown 是 Record<currency, number>，取主要币种
  const spentEntries = spentBreakdown ? Object.entries(spentBreakdown).filter(([, v]) => v > 0) : [];
  const primaryCost = spentEntries.find(([c]) => c === "USD") ?? spentEntries[0];
  const costText = primaryCost
    ? `${primaryCost[0] === "CNY" ? "¥" : "$"}${primaryCost[1].toFixed(2)}`
    : null;

  // 时长格式化
  const dur = ep.duration_seconds ?? 0;
  const durLabel = dur > 0 ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}` : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative grid w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors focus-ring"
      style={{
        gridTemplateColumns: "auto 1fr auto",
        marginBottom: 3,
        ...(active
          ? W3_EPISODE_ROW_ACTIVE
          : { background: "transparent", border: "1px solid transparent", boxShadow: "none" }),
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "oklch(0.24 0.012 265 / 0.4)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        className="num grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[6px] text-[11px] font-bold leading-none"
        style={active ? W3_EPISODE_BADGE_ACTIVE : W3_EPISODE_BADGE_IDLE}
      >
        {showEpisodeBadge ? `E${ep.episode}` : <Clapperboard className="h-4 w-4" aria-hidden />}
      </div>

      <div className="min-w-0">
        <div
          className="truncate text-[13px]"
          style={{
            color: active ? "var(--color-text)" : "var(--color-text-2)",
            fontWeight: active ? 600 : 500,
          }}
        >
          {ep.title || fallbackTitle || ""}
        </div>
        <div className="mt-[3px] flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 text-[10.5px]"
            style={{ color: "var(--color-text-4)" }}
          >
            <span
              className={`h-[5px] w-[5px] rounded-full ${
                isActive ? "animate-shot-pulse" : ""
              }`}
              style={{ background: statusColor }}
            />
            {statusLabel}
          </span>
          {totalShots > 0 && (
            <>
              <span
                aria-hidden="true"
                className="h-px w-px rounded"
                style={{ background: "var(--color-hairline)", width: 2, height: 2 }}
              />
              <span className="num text-[10.5px]" style={{ color: "var(--color-text-4)" }}>
                {totalShots}
                {durLabel ? ` · ${durLabel}` : ""}
              </span>
            </>
          )}
        </div>
        {showProgress && (
          <div
            className="mt-[5px] h-[2px] overflow-hidden rounded-[1px]"
            style={{ background: "oklch(0.22 0.010 265)" }}
          >
            <div
              className="h-full"
              style={{
                width: `${progress}%`,
                background: W3.gradientProgress,
                boxShadow: W3.glowCyan,
              }}
            />
          </div>
        )}
      </div>

      {costText && (
        <span
          className="num self-start pt-0.5 text-[10.5px]"
          style={{ color: active ? W3.cyan : "var(--color-text-4)" }}
        >
          {costText}
        </span>
      )}
    </button>
  );
}
