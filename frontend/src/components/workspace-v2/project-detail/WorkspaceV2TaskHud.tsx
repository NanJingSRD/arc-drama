import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { activateOnEnterSpace } from "@/utils/a11y";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image,
  Video,
  AudioLines,
  FileText,
  Check,
  X,
  Loader2,
  ChevronDown,
  ListChecks,
  Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import type { TaskItem } from "@/types";
import { GlassPopover } from "@/components/ui/GlassPopover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Theme tokens — v3 cool oklch + accent purple
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<TaskItem["status"], string> = {
  running: "var(--color-accent-2)",
  queued: "var(--color-text-4)",
  cancelling: "var(--color-text-3)",
  // 与顶部工作流节点已完成态一致：emerald-400
  succeeded: "#34d399",
  failed: "oklch(0.72 0.18 25)",
  cancelled: "var(--color-text-3)",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** WS2：auto_assets 优先展示 payload.asset_type，便于区分人物/场景/道具提取 */
function workspaceV2TaskResourceLabel(task: TaskItem): string {
  if (task.task_type === "auto_assets") {
    const assetType = task.payload?.asset_type;
    if (typeof assetType === "string" && assetType.trim()) return assetType.trim();
  }
  return task.resource_id;
}

function MediaTypeIcon({ mediaType }: { mediaType: TaskItem["media_type"] }) {
  const Icon =
    mediaType === "video"
      ? Video
      : mediaType === "audio"
        ? AudioLines
        : mediaType === "text"
          ? FileText
          : Image;
  return <Icon className="h-3.5 w-3.5" aria-hidden />;
}

function mediaTypeChannelLabelKey(
  mediaType: TaskItem["media_type"],
): "image_channel" | "video_channel" | "audio_channel" | "text_channel" {
  switch (mediaType) {
    case "video":
      return "video_channel";
    case "audio":
      return "audio_channel";
    case "text":
      return "text_channel";
    case "image":
    default:
      return "image_channel";
  }
}

function statusPillSurface(status: TaskItem["status"]): {
  color: string;
  background: string;
  border: string;
} {
  switch (status) {
    case "running":
      return {
        color: STATUS_COLORS.running,
        background: "oklch(0.55 0.14 265 / 0.18)",
        border: "1px solid oklch(0.65 0.12 265 / 0.35)",
      };
    case "queued":
      return {
        color: STATUS_COLORS.queued,
        background: "oklch(0.28 0.01 265 / 0.55)",
        border: "1px solid var(--color-hairline-soft)",
      };
    case "cancelling":
      return {
        color: STATUS_COLORS.cancelling,
        background: "oklch(0.28 0.01 265 / 0.55)",
        border: "1px solid var(--color-hairline-soft)",
      };
    case "succeeded":
      return {
        color: STATUS_COLORS.succeeded,
        background: "rgba(52, 211, 153, 0.12)",
        border: "1px solid rgba(52, 211, 153, 0.4)",
      };
    case "failed":
      return {
        color: STATUS_COLORS.failed,
        background: "oklch(0.30 0.10 25 / 0.22)",
        border: "1px solid oklch(0.55 0.14 25 / 0.4)",
      };
    case "cancelled":
      return {
        color: STATUS_COLORS.cancelled,
        background: "oklch(0.28 0.01 265 / 0.45)",
        border: "1px solid var(--color-hairline-soft)",
      };
  }
}

// ---------------------------------------------------------------------------
// SignalScanBar — animated scan line for live tasks
// ---------------------------------------------------------------------------

function SignalScanBar() {
  return (
    <div
      className="relative h-[2px] w-full overflow-hidden rounded-full"
      style={{ background: "oklch(0.18 0.012 265 / 0.8)" }}
    >
      <motion.div
        className="absolute inset-y-0 w-2/5 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
          boxShadow: "0 0 8px var(--color-accent-glow)",
        }}
        animate={{ x: ["-40%", "160%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// TelemetryStrip — terminal outcome meters above the feed
// ---------------------------------------------------------------------------

function TelemetryStrip({
  succeeded,
  failed,
}: {
  succeeded: number;
  failed: number;
}) {
  const { t } = useTranslation("dashboard");
  const meters = [
    {
      key: "ok",
      label: t("task_radar_meter_ok"),
      count: succeeded,
      color: STATUS_COLORS.succeeded,
      glow: "rgba(52, 211, 153, 0.45)",
    },
    {
      key: "fail",
      label: t("task_radar_meter_fail"),
      count: failed,
      color: STATUS_COLORS.failed,
      glow: "oklch(0.55 0.14 25 / 0.35)",
    },
  ] as const;

  const max = Math.max(1, ...meters.map((m) => m.count));

  return (
    <div
      className="mx-3 mt-2 mb-1 grid grid-cols-2 gap-1.5 rounded-xl px-2 py-2"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.20 0.014 265 / 0.55), oklch(0.16 0.012 265 / 0.35))",
        border: "1px solid var(--color-hairline-soft)",
        boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.04)",
      }}
    >
      {meters.map((meter) => (
        <div key={meter.key} className="min-w-0 flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-1">
            <span
              className="truncate text-[10px] font-medium tracking-wide uppercase"
              style={{ color: "var(--color-text-4)" }}
            >
              {meter.label}
            </span>
            <span
              className="shrink-0 tabular-nums text-[12px] font-semibold"
              style={{ color: meter.color }}
            >
              {meter.count}
            </span>
          </div>
          <div
            className="h-1 overflow-hidden rounded-full"
            style={{ background: "oklch(0.14 0.01 265 / 0.9)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: meter.color,
                boxShadow: meter.count > 0 ? `0 0 6px ${meter.glow}` : undefined,
              }}
              initial={false}
              animate={{ width: `${(meter.count / max) * 100}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SignalCard — card row replacing the old flat TaskRow
// ---------------------------------------------------------------------------

function SignalCard({
  task,
  expandedErrorId,
  onToggleError,
}: {
  task: TaskItem;
  expandedErrorId: string | null;
  onToggleError: (taskId: string) => void;
}) {
  const { t } = useTranslation("dashboard");
  const statusLabel: Record<TaskItem["status"], string> = {
    running: t("generating_status"),
    queued: t("queued_status"),
    cancelling: t("cancelling_status"),
    succeeded: t("completed_status"),
    failed: t("failed_status"),
    cancelled: t("cancelled_status"),
  };

  const isErrorExpanded = expandedErrorId === task.task_id;
  const hasError = task.status === "failed" && Boolean(task.error_message);
  const isLive = task.status === "running" || task.status === "cancelling";
  const pill = statusPillSurface(task.status);
  const accent = STATUS_COLORS[task.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="px-3 py-1"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl",
          hasError && "cursor-pointer",
        )}
        style={{
          background:
            task.status === "failed"
              ? "linear-gradient(135deg, oklch(0.26 0.06 25 / 0.45), oklch(0.18 0.02 265 / 0.55))"
              : task.status === "succeeded"
                ? "linear-gradient(135deg, rgba(52, 211, 153, 0.12), oklch(0.18 0.02 265 / 0.5))"
                : isLive
                  ? "linear-gradient(135deg, oklch(0.24 0.04 265 / 0.45), oklch(0.18 0.02 265 / 0.55))"
                  : "linear-gradient(180deg, oklch(0.22 0.014 265 / 0.45), oklch(0.17 0.012 265 / 0.4))",
          border: "1px solid var(--color-hairline-soft)",
          boxShadow:
            task.status === "failed"
              ? "inset 3px 0 0 oklch(0.65 0.18 25 / 0.85), 0 6px 16px -10px oklch(0.35 0.12 25 / 0.4)"
              : isLive
                ? "inset 3px 0 0 var(--color-accent), 0 6px 16px -10px var(--color-accent-glow)"
                : task.status === "succeeded"
                  ? "inset 3px 0 0 #34d399, 0 6px 16px -10px rgba(52, 211, 153, 0.35)"
                  : "inset 3px 0 0 oklch(0.45 0.02 265 / 0.5)",
        }}
        role={hasError ? "button" : undefined}
        tabIndex={hasError ? 0 : undefined}
        aria-expanded={hasError ? isErrorExpanded : undefined}
        aria-controls={hasError ? `task-error-${task.task_id}` : undefined}
        onClick={hasError ? () => onToggleError(task.task_id) : undefined}
        onKeyDown={
          hasError ? activateOnEnterSpace(() => onToggleError(task.task_id)) : undefined
        }
      >
        <div className="flex items-start gap-2.5 px-3 py-2.5">
          {/* Pulse node + media badge */}
          <div className="relative mt-0.5 shrink-0">
            <span
              className="grid h-8 w-8 place-items-center rounded-lg"
              style={{
                color: accent,
                background: "oklch(0.16 0.012 265 / 0.75)",
                border: `1px solid color-mix(in oklch, ${accent} 40%, transparent)`,
                boxShadow: isLive ? `0 0 12px color-mix(in oklch, ${accent} 35%, transparent)` : undefined,
              }}
            >
              {isLive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : task.status === "succeeded" ? (
                <Check className="h-3.5 w-3.5" />
              ) : task.status === "failed" || task.status === "cancelled" ? (
                <X className="h-3.5 w-3.5" />
              ) : (
                <MediaTypeIcon mediaType={task.media_type} />
              )}
            </span>
            {isLive && (
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full animate-breathe"
                style={{
                  background: accent,
                  boxShadow: `0 0 6px ${accent}`,
                }}
              />
            )}
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-[13px] font-semibold tracking-tight"
                  style={{ color: "var(--color-text)" }}
                >
                  {workspaceV2TaskResourceLabel(task)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      color: "var(--color-text-3)",
                      background: "oklch(0.20 0.012 265 / 0.7)",
                      border: "1px solid var(--color-hairline-soft)",
                    }}
                  >
                    <MediaTypeIcon mediaType={task.media_type} />
                    {t(mediaTypeChannelLabelKey(task.media_type))}
                  </span>
                  <span
                    className="max-w-[10rem] truncate rounded-md px-1.5 py-0.5 font-mono text-[10px]"
                    style={{
                      color: "var(--color-text-4)",
                      background: "oklch(0.14 0.01 265 / 0.65)",
                    }}
                    title={task.task_type}
                  >
                    {task.task_type}
                  </span>
                  {task.status === "cancelled" && task.cancelled_by === "cascade" && (
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[10px]"
                      style={{ color: "var(--color-text-4)" }}
                    >
                      {t("cascade_label")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={pill}
                >
                  {isLive && (
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full animate-breathe"
                      style={{ background: accent }}
                    />
                  )}
                  {statusLabel[task.status]}
                </span>
                {hasError && (
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      isErrorExpanded && "rotate-180",
                    )}
                    style={{ color: "var(--color-text-4)" }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {isLive && (
          <div className="px-3 pb-2.5">
            <SignalScanBar />
          </div>
        )}

        <AnimatePresence>
          {hasError && isErrorExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div
                id={`task-error-${task.task_id}`}
                className="mx-3 mb-2.5 rounded-lg px-2.5 py-2 text-[11px] leading-relaxed"
                style={{
                  color: "oklch(0.78 0.08 25)",
                  background: "oklch(0.22 0.06 25 / 0.35)",
                  border: "1px solid oklch(0.45 0.12 25 / 0.35)",
                }}
              >
                {task.error_message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ChannelTaskList — radar signal feed
// ---------------------------------------------------------------------------

function ChannelTaskList({
  tasks,
}: {
  tasks: TaskItem[];
}) {
  const { t } = useTranslation("dashboard");
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);

  const toggleError = useCallback((taskId: string) => {
    setExpandedErrorId((prev) => (prev === taskId ? null : taskId));
  }, []);

  // cancelling 是 running 的延伸中间态：归入 live 桶展示
  const live = tasks.filter(
    (task) => task.status === "running" || task.status === "cancelling",
  );
  const queued = tasks.filter((task) => task.status === "queued");
  // 工作空间 2.0：完整保留终态任务，不做渐出/隐藏
  const terminal = tasks.filter(
    (task) =>
      task.status === "succeeded" ||
      task.status === "failed" ||
      task.status === "cancelled",
  );
  const succeeded = terminal.filter((task) => task.status === "succeeded").length;
  const failed = terminal.filter((task) => task.status === "failed").length;
  const ordered = [...live, ...queued, ...terminal];

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
        <span
          aria-hidden
          className="grid h-10 w-10 place-items-center rounded-full"
          style={{
            color: "var(--color-text-4)",
            background: "oklch(0.18 0.012 265 / 0.6)",
            border: "1px dashed var(--color-hairline)",
          }}
        >
          <ListChecks className="h-4 w-4" />
        </span>
        <p
          className="text-center text-[12px]"
          style={{ color: "var(--color-text-4)" }}
        >
          {t("no_tasks")}
        </p>
        <p
          className="text-center text-[10px]"
          style={{ color: "var(--color-text-4)", opacity: 0.7 }}
        >
          {t("task_radar_empty_hint")}
        </p>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <TelemetryStrip succeeded={succeeded} failed={failed} />

      <div className="pt-1">
        <AnimatePresence initial={false}>
          {ordered.map((task) => (
            <SignalCard
              key={task.task_id}
              task={task}
              expandedErrorId={expandedErrorId}
              onToggleError={toggleError}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

type TaskChannelId = "all" | "image" | "video" | "audio" | "text";

interface TaskChannelConfig {
  id: TaskChannelId;
  labelKey: "all" | "image_channel" | "video_channel" | "audio_channel" | "text_channel";
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  tasks: TaskItem[];
}

// ---------------------------------------------------------------------------
// WorkspaceV2TaskHud
// ---------------------------------------------------------------------------

/** 工作空间 2.0 任务列表（与 Studio TaskHud 分离，终态任务常驻展示）。 */
export function WorkspaceV2TaskHud({
  anchorRef,
  channelsMaxHeightClass = "max-h-[28rem]",
}: {
  anchorRef: RefObject<HTMLElement | null>;
  channelsMaxHeightClass?: string;
}) {
  const { t } = useTranslation("dashboard");
  const { taskHudOpen, setTaskHudOpen } = useAppStore();
  const { tasks } = useTasksStore();

  const imageTasks = tasks.filter((task) => task.media_type === "image");
  const videoTasks = tasks.filter((task) => task.media_type === "video");
  const audioTasks = tasks.filter((task) => task.media_type === "audio");
  const textTasks = tasks.filter((task) => task.media_type === "text");
  const allTasks = tasks;

  const channels: TaskChannelConfig[] = [
    { id: "all", labelKey: "all", icon: Layers, tasks: allTasks },
    { id: "image", labelKey: "image_channel", icon: Image, tasks: imageTasks },
    { id: "video", labelKey: "video_channel", icon: Video, tasks: videoTasks },
    ...(audioTasks.length > 0
      ? [{ id: "audio" as const, labelKey: "audio_channel" as const, icon: AudioLines, tasks: audioTasks }]
      : []),
    ...(textTasks.length > 0
      ? [{ id: "text" as const, labelKey: "text_channel" as const, icon: FileText, tasks: textTasks }]
      : []),
  ];

  const [activeChannel, setActiveChannel] = useState<TaskChannelId>("all");

  const prevHudOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = taskHudOpen && !prevHudOpenRef.current;
    prevHudOpenRef.current = taskHudOpen;
    if (justOpened) {
      setActiveChannel("all");
    }
  }, [taskHudOpen]);

  useEffect(() => {
    if (
      (activeChannel === "audio" && audioTasks.length === 0) ||
      (activeChannel === "text" && textTasks.length === 0)
    ) {
      setActiveChannel("all");
    }
  }, [activeChannel, audioTasks.length, textTasks.length]);

  const activeTasks =
    channels.find((channel) => channel.id === activeChannel)?.tasks ?? allTasks;

  return (
    <GlassPopover
      open={taskHudOpen}
      onClose={() => setTaskHudOpen(false)}
      anchorRef={anchorRef}
      sideOffset={6}
      // 22rem 曾装下 2～3 个通道；加「全部」后 badge+文案会挤爆最右 tab。
      // 固定加宽 + 等分网格 + 标签 truncate，避免再次回归溢出。
      width="w-[min(28rem,calc(100vw-1.5rem))]"
    >
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="font-sans"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        {/* Header */}
        <div
          className="relative flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-hairline-soft)" }}
        >
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent-dim), oklch(0.76 0.09 295 / 0.05))",
              border: "1px solid var(--color-accent-soft)",
              color: "var(--color-accent-2)",
              boxShadow: "0 8px 18px -8px var(--color-accent-glow)",
            }}
          >
            <ListChecks className="h-3.5 w-3.5" />
          </span>
          <div
            className="min-w-0 text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-sans)" }}
          >
            {t("task_hud_title")}
          </div>
        </div>

        {/* Channels */}
        <div
          className={cn("flex flex-col overflow-hidden", channelsMaxHeightClass)}
          style={{ borderBottom: "1px solid var(--color-hairline-soft)" }}
        >
          <div className="shrink-0 px-3 py-2">
            <Tabs
              value={activeChannel}
              onValueChange={(value) => setActiveChannel(value as TaskChannelId)}
            >
              <TabsList
                aria-label={t("task_hud_title")}
                className={cn(
                  "grid h-auto w-full gap-1",
                  channels.length >= 5
                    ? "grid-cols-5"
                    : channels.length >= 4
                      ? "grid-cols-4"
                      : "grid-cols-3",
                )}
              >
                {channels.map((channel) => {
                  const Icon = channel.icon;
                  const activeCount = channel.tasks.filter(
                    (task) =>
                      task.status === "running" ||
                      task.status === "queued" ||
                      task.status === "cancelling",
                  ).length;
                  return (
                    <TabsTrigger
                      key={channel.id}
                      value={channel.id}
                      title={t(channel.labelKey)}
                      className="w-full min-w-0 gap-1 px-1.5 py-1.5 text-[12px]"
                    >
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="min-w-0 truncate">{t(channel.labelKey)}</span>
                      {channel.tasks.length > 0 ? (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {channel.tasks.length}
                        </span>
                      ) : null}
                      {activeCount > 0 ? (
                        <span
                          className="shrink-0 rounded px-1 py-px text-[11px]"
                          style={{
                            color: "var(--color-accent-2)",
                            background: "var(--color-accent-dim)",
                            border: "1px solid var(--color-accent-soft)",
                          }}
                        >
                          {activeCount}
                        </span>
                      ) : null}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ChannelTaskList tasks={activeTasks} />
          </div>
        </div>
      </motion.div>
    </GlassPopover>
  );
}
