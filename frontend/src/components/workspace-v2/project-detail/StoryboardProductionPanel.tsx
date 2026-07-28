import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  Clapperboard,
  Film,
  ImageIcon,
  Landmark,
  Link2,
  Loader2,
  Maximize2,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Lightbulb,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  addWorkspaceV2Storyboard,
  deleteWorkspaceV2Episode,
  deleteWorkspaceV2Storyboard,
  fetchWorkspaceV2CostEstimate,
  fetchWorkspaceV2ProjectProduction,
  generateWorkspaceV2EpisodeConfig,
  generateWorkspaceV2Storyboard,
  generateWorkspaceV2StoryboardBatch,
  generateWorkspaceV2Video,
  generateWorkspaceV2VideoBatch,
  insertWorkspaceV2Episode,
  mapWorkspaceV2ProductionEpisodes,
  resolveWorkspaceV2ShotDurationSec,
  resolveWorkspaceV2BatchGenerateTaskIds,
  resolveWorkspaceV2ScriptProcessTaskId,
  updateWorkspaceV2ScriptScene,
  uploadWorkspaceV2File,
  uploadWorkspaceV2Storyboard,
  uploadWorkspaceV2StoryboardsBatch,
  workspaceV2EpisodeScriptFile,
  workspaceV2ProductionHasEpisodeConfigs,
} from "@/api/workspace-v2";
import { AuthorizedIndicator } from "@/components/canvas/timeline/AuthorizedIndicator";
import { DropdownPill } from "@/components/ui/DropdownPill";
import { GlassModal } from "@/components/ui/GlassModal";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { ShotBoundAssetsEditModal } from "./ShotBoundAssetsEditModal";
import { VideoLightbox } from "@/components/ui/VideoLightbox";
import { Popover } from "@/components/ui/Popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { posterGridStyle } from "@/components/ui/darkroom-tokens";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WS2_HOME_SELECT_PANEL_CLASS } from "../workspace-v2-home-theme";
import { useAppStore } from "@/stores/app-store";
import { useTasksStore } from "@/stores/tasks-store";
import type { CameraMotion, CostBreakdown, SegmentCost, ShotType, TaskStatus } from "@/types";
import {
  CAMERA_MOTIONS,
  CAMERA_MOTION_I18N_KEYS,
  SHOT_TYPES,
  SHOT_TYPE_I18N_KEYS,
} from "@/types";
import { cn } from "@/lib/utils";
import { errMsg } from "@/utils/async";
import { costEntries, formatCost } from "@/utils/cost-format";
import { SOURCE_FILE_ACCEPT } from "@/utils/source-files";
import {
  upsertOptimisticScriptProcessTask,
  upsertOptimisticShotMediaTask,
} from "@/utils/optimistic-asset-task";
import { upsertWorkspaceV2EpisodeConfigTask } from "./upsertWorkspaceV2EpisodeConfigTask";
import { WORKSPACE_V2_PROGRESS_LABELS } from "@/types/workspace-v2";
import {
  WS2_ASSET_TAB_ACTIVE_BG_CLASS,
  WS2_CARD_CLASS,
  WS2_MODAL_PANEL_CLASS,
  WS2_SECTION_HEADER_CLASS,
} from "../workspace-v2-theme";
import { useWorkspaceV2ProjectDetail } from "./WorkspaceV2ProjectDetailContext";
import { Ws2NodeContentLayout } from "./Ws2NodeContentLayout";
import { Ws2NoDataPlaceholder } from "./Ws2NoDataPlaceholder";
import {
  formatStoryboardEpisodeCode,
  formatStoryboardEpisodeHeading,
  episodeNeedsStoryboardConfig,
  DEFAULT_STORYBOARD_SYSTEM_PROMPT_KEYS,
  DEFAULT_VIDEO_SYSTEM_PROMPT_KEYS,
  normalizeStoryboardImagePromptDraft,
  resolveStoryboardImagePrompt,
  resolveStoryboardSegmentId,
  resolveStoryboardShotLabel,
  resolveStoryboardVideoPrompt,
  resolveStoryboardVideoPromptDraft,
  resolveSystemPromptKeyLabel,
  type StoryboardEpisode,
  type StoryboardImagePromptDraft,
  type StoryboardShot,
  type StoryboardSystemPromptTemplates,
  type StoryboardVideoPromptDraft,
} from "./storyboard-production";

const EPISODE_CONFIG_ACTIVE = new Set<TaskStatus>(["queued", "running", "cancelling"]);
const SHOT_MEDIA_ACTIVE = new Set<TaskStatus>(["queued", "running", "cancelling"]);
const SCRIPT_PROCESS_ACTIVE = new Set<TaskStatus>(["queued", "running", "cancelling"]);

/** 从分镜图/视频任务推断集号：script_file=episode_1.json 或 resource_id=E1S01 */
function episodeNumberFromShotMediaTask(task: {
  script_file?: string | null;
  resource_id?: string | null;
}): number | null {
  const scriptFile = task.script_file?.trim() ?? "";
  const fromScript = scriptFile.match(/episode[_-]?(\d+)/i);
  if (fromScript) {
    const n = Number(fromScript[1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  const resourceId = task.resource_id?.trim() ?? "";
  const fromResource = resourceId.match(/^E(\d+)/i);
  if (fromResource) {
    const n = Number(fromResource[1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

/** 新增/删除镜头入口 */
const SHOW_STORYBOARD_SHOT_CRUD = true;

/** 与工作空间 2.0 首页项目卡片一致的海报格子 */
const SHOT_CARD_GRID = posterGridStyle({ size: 28, opacity: 0.1 });

/** 人物名 → 稳定配色，同名跨镜头同色（与剧本分集人物 tag 一致） */
const CHARACTER_TAG_PALETTES = [
  { text: "text-sky-300", bg: "bg-sky-500/15", border: "border-sky-500/35" },
  { text: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/35" },
  { text: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/35" },
  { text: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/35" },
  { text: "text-rose-300", bg: "bg-rose-500/15", border: "border-rose-500/35" },
  { text: "text-teal-300", bg: "bg-teal-500/15", border: "border-teal-500/35" },
  { text: "text-orange-300", bg: "bg-orange-500/15", border: "border-orange-500/35" },
  { text: "text-indigo-300", bg: "bg-indigo-500/15", border: "border-indigo-500/35" },
  { text: "text-fuchsia-300", bg: "bg-fuchsia-500/15", border: "border-fuchsia-500/35" },
  { text: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/35" },
] as const;

function characterTagPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return CHARACTER_TAG_PALETTES[Math.abs(hash) % CHARACTER_TAG_PALETTES.length]!;
}

function CharacterTagChip({ name }: { name: string }) {
  const palette = characterTagPalette(name);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none",
        palette.text,
        palette.bg,
        palette.border,
      )}
    >
      {name}
    </span>
  );
}

function BoundAssetGroup({
  icon,
  label,
  names,
}: {
  icon: ReactNode;
  label: string;
  names: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        <span className="shrink-0 text-cyan-300/80" aria-hidden>
          {icon}
        </span>
        <span>{label}</span>
        <span className="font-mono text-foreground/55">{names.length}</span>
      </div>
      {names.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {names.map((name) => (
            <CharacterTagChip key={`${label}-${name}`} name={name} />
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground/70">暂无</p>
      )}
    </div>
  );
}

/** 分镜图/视频 tab 左侧：绑定角色 / 场景 / 道具（可收起；高度随内容，上限为容器全高） */
function ShotBoundAssetsPanel({
  projectId,
  sceneId,
  characters,
  scenes,
  props: propNames,
  onSaved,
}: {
  projectId: string;
  sceneId: string;
  characters?: string[];
  scenes?: string[];
  props?: string[];
  onSaved: () => void | Promise<void>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const totalCount =
    (characters?.length ?? 0) + (scenes?.length ?? 0) + (propNames?.length ?? 0);
  const contentMotion = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };
  const canEdit = Boolean(projectId && sceneId);

  return (
    <>
    <aside
      className={cn(
        "flex max-h-full shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/3",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        collapsed ? "w-10" : "w-[200px] min-[1520px]:w-[240px]",
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {collapsed ? (
          <motion.button
            key="collapsed"
            type="button"
            initial={reduceMotion ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -8 }}
            transition={contentMotion}
            onClick={() => setCollapsed(false)}
            className="flex w-full flex-col items-center gap-2 px-1 py-2.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-cyan-200/90"
            title="展开绑定资产"
            aria-label="展开绑定资产"
            aria-expanded={false}
          >
            <Link2 className="h-3.5 w-3.5 shrink-0 text-cyan-300/85" strokeWidth={2.2} />
            <span
              className="font-mono text-[10px] font-semibold tabular-nums text-foreground/55"
              title={`${totalCount} 项`}
            >
              {totalCount}
            </span>
            <span
              className="mt-1 text-[10px] font-semibold tracking-widest text-muted-foreground"
              style={{ writingMode: "vertical-rl" }}
            >
              绑定资产
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={reduceMotion ? false : { opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: 10 }}
            transition={contentMotion}
            className="flex min-h-0 w-[200px] flex-col min-[1520px]:w-[240px]"
          >
            <div className="flex h-10 shrink-0 items-center gap-0.5 border-b border-white/8 px-1.5 pl-3">
              <span className="shrink-0 text-cyan-300/85" aria-hidden>
                <Link2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                绑定资产
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-0 px-1.5 text-[11px] font-medium text-muted-foreground opacity-80 hover:opacity-100"
                onClick={() => setEditOpen(true)}
                disabled={!canEdit}
                title="编辑绑定资产"
                aria-label="编辑绑定资产"
              >
                编辑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100"
                onClick={() => setCollapsed(true)}
                title="收起绑定资产"
                aria-label="收起绑定资产"
                aria-expanded={true}
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
              </Button>
            </div>
            <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-3">
              <BoundAssetGroup
                icon={<Users className="h-3 w-3" strokeWidth={2.2} />}
                label="角色"
                names={characters ?? []}
              />
              <BoundAssetGroup
                icon={<Landmark className="h-3 w-3" strokeWidth={2.2} />}
                label="场景"
                names={scenes ?? []}
              />
              <BoundAssetGroup
                icon={<Package className="h-3 w-3" strokeWidth={2.2} />}
                label="道具"
                names={propNames ?? []}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
    <ShotBoundAssetsEditModal
      open={editOpen}
      onClose={() => setEditOpen(false)}
      projectId={projectId}
      sceneId={sceneId}
      initialCharacters={characters ?? []}
      initialScenes={scenes ?? []}
      initialProps={propNames ?? []}
      onSaved={onSaved}
    />
    </>
  );
}

function episodeNumberFromConfigTask(task: {
  resource_id: string;
  payload: Record<string, unknown>;
}): number | null {
  const fromPayload = task.payload?.episode;
  if (typeof fromPayload === "number" && Number.isFinite(fromPayload) && fromPayload > 0) {
    return Math.floor(fromPayload);
  }
  if (typeof fromPayload === "string" && fromPayload.trim()) {
    const n = Number(fromPayload.trim());
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  const raw = task.resource_id.trim();
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const addMatch = raw.match(/^episode_(\d+)_storyboard_add$/i);
  if (addMatch?.[1]) return Number(addMatch[1]);
  const match = raw.match(/^ep-(\d+)$/i);
  if (match?.[1]) return Number(match[1]);
  return null;
}

/** 新增剧集触发的 script_process：resource_id=script_process_5 / episode_5.json 等 */
function episodeNumberFromScriptProcessTask(task: {
  resource_id: string;
  script_file?: string | null;
  payload: Record<string, unknown>;
}): number | null {
  const fromPayload = task.payload?.episode;
  if (typeof fromPayload === "number" && Number.isFinite(fromPayload) && fromPayload > 0) {
    return Math.floor(fromPayload);
  }
  if (typeof fromPayload === "string" && fromPayload.trim()) {
    const n = Number(fromPayload.trim());
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  const resourceId = task.resource_id.trim();
  const fromResource =
    resourceId.match(/^script_process[_-]?(\d+)$/i) ??
    resourceId.match(/^episode[_-]?(\d+)$/i) ??
    resourceId.match(/^ep[_-]?(\d+)$/i);
  if (fromResource?.[1]) {
    const n = Number(fromResource[1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  const scriptFile = task.script_file?.trim() ?? "";
  const fromScript = scriptFile.match(/episode[_-]?(\d+)/i);
  if (fromScript?.[1]) {
    const n = Number(fromScript[1]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

/** 新增分镜触发的异步配置任务（勿当成「生成本集分镜」全页 loading） */
function isStoryboardAddConfigTask(task: { resource_id: string }): boolean {
  return /storyboard_add/i.test(task.resource_id.trim());
}

const SCENE_CONTENT_ACTIVE = new Set<TaskStatus>(["queued", "running", "cancelling"]);

function pickTrimmedString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** 解析新增分镜接口返回的 scene_id / 两阶段 task id */
function resolveAddStoryboardResponse(result: unknown): {
  sceneId: string;
  contentTaskId: string;
  configTaskId: string;
} {
  if (!result || typeof result !== "object") {
    return { sceneId: "", contentTaskId: "", configTaskId: "" };
  }
  const root = result as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : null;
  const scene =
    (root.scene && typeof root.scene === "object"
      ? (root.scene as Record<string, unknown>)
      : null) ??
    (nested?.scene && typeof nested.scene === "object"
      ? (nested.scene as Record<string, unknown>)
      : null);

  return {
    sceneId: pickTrimmedString(
      root.scene_id,
      root.sceneId,
      nested?.scene_id,
      nested?.sceneId,
      scene?.id,
      scene?.scene_id,
      scene?.sceneId,
    ),
    contentTaskId: pickTrimmedString(
      root.content_task_id,
      root.contentTaskId,
      nested?.content_task_id,
      nested?.contentTaskId,
    ),
    configTaskId: pickTrimmedString(
      root.config_task_id,
      root.configTaskId,
      nested?.config_task_id,
      nested?.configTaskId,
    ),
  };
}

function episodeDisplayName(episode: StoryboardEpisode) {
  return episode.title.trim() || `第 ${episode.episodeNumber} 集`;
}

function episodeTitleFromFilename(filename: string): string {
  const trimmed = filename.trim();
  if (!trimmed) return "未命名剧集";
  const withoutExt = trimmed.replace(/\.[^.]+$/, "").trim();
  return withoutExt || trimmed;
}

function hasCostAmount(breakdown: CostBreakdown | undefined): boolean {
  return costEntries(breakdown).length > 0;
}

/** 将多个货币明细累加（前端自行合计） */
function sumCostBreakdowns(
  ...items: Array<CostBreakdown | undefined>
): CostBreakdown {
  const result: CostBreakdown = {};
  for (const item of items) {
    if (!item) continue;
    for (const [currency, amount] of Object.entries(item)) {
      if (typeof amount !== "number" || !Number.isFinite(amount)) continue;
      result[currency] = (result[currency] ?? 0) + amount;
    }
  }
  for (const currency of Object.keys(result)) {
    result[currency] = Math.round(result[currency] * 10000) / 10000;
  }
  return result;
}

/** 累加一集下全部分镜的 image + video 费用 */
function sumEpisodeMediaCosts(
  segments: SegmentCost[],
  kind: "estimate" | "actual",
): CostBreakdown {
  return sumCostBreakdowns(
    ...segments.flatMap((seg) => [seg[kind].image, seg[kind].video]),
  );
}

function buildSegmentCostIndex(
  episodes: Array<{ segments: SegmentCost[] }>,
): Map<string, SegmentCost> {
  const index = new Map<string, SegmentCost>();
  for (const ep of episodes) {
    for (const seg of ep.segments) {
      index.set(seg.segment_id, seg);
    }
  }
  return index;
}

/** 分镜图/视频卡片费用：生成前显示预估；生成后叠加实际；无金额则不展示 */
function ShotMediaCostBadge({
  estimate,
  actual,
  mediaGenerated,
}: {
  estimate?: CostBreakdown;
  actual?: CostBreakdown;
  mediaGenerated: boolean;
}) {
  const showEstimate = hasCostAmount(estimate);
  const showActual = mediaGenerated && hasCostAmount(actual);
  if (!showEstimate && !showActual) return null;

  return (
    <div
      className="flex min-w-0 flex-col items-end gap-0.5 text-[10px] leading-tight tabular-nums text-white/75"
      title="费用"
    >
      {showEstimate ? (
        <span className="whitespace-nowrap">
          <span className="mr-1 text-white/40">预估</span>
          {formatCost(estimate)}
        </span>
      ) : null}
      {showActual ? (
        <span className="whitespace-nowrap text-emerald-300/90">
          <span className="mr-1 text-white/40">实际</span>
          {formatCost(actual)}
        </span>
      ) : null}
    </div>
  );
}

function EpisodeCostSummary({
  estimate,
  actual,
}: {
  estimate: CostBreakdown;
  actual: CostBreakdown;
}) {
  const showEstimate = hasCostAmount(estimate);
  const showActual = hasCostAmount(actual);
  if (!showEstimate && !showActual) return null;

  return (
    <div className="flex min-w-0 shrink-0 flex-wrap items-end gap-x-2.5 gap-y-0.5 pb-px text-[10px] leading-none tabular-nums text-muted-foreground">
      {showEstimate ? (
        <span className="whitespace-nowrap">
          <span className="mr-1 text-white/40">预估</span>
          <span className="text-foreground/80">{formatCost(estimate)}</span>
        </span>
      ) : null}
      {showActual ? (
        <span className="whitespace-nowrap">
          <span className="mr-1 text-white/40">实际</span>
          <span className="text-emerald-300/90">{formatCost(actual)}</span>
        </span>
      ) : null}
    </div>
  );
}

function StoryboardEpisodeListItem({
  episode,
  selected,
  deleting,
  disabled,
  onSelect,
  onDelete,
}: {
  episode: StoryboardEpisode;
  selected: boolean;
  deleting?: boolean;
  /** 批量授权等阻塞操作时禁止切换 / 删除剧集 */
  disabled?: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("dashboard");
  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-1 rounded-lg transition-colors duration-200",
        selected
          ? "bg-cyan-500/10 text-foreground"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 text-left disabled:cursor-not-allowed"
      >
        <span
          className={cn(
            "mt-px shrink-0 font-mono text-[11px] font-semibold tabular-nums",
            selected ? "text-cyan-400" : "text-muted-foreground/70",
          )}
        >
          {formatStoryboardEpisodeCode(episode.episodeNumber)}
        </span>
        <span className="min-w-0 flex-1 text-xs font-medium leading-snug">
          <span className="block break-words pr-5">{episodeDisplayName(episode)}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={disabled || deleting}
        title={t("workspace_delete_episode")}
        aria-label={t("workspace_delete_episode")}
        className={cn(
          "absolute right-1 top-1.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-opacity hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-40",
          "opacity-0 focus-visible:opacity-100 group-hover:opacity-100",
        )}
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
        ) : (
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
        )}
      </button>
    </div>
  );
}

function StoryboardShotCard({
  episodeNumber,
  shot,
  selected,
  configuring,
  onSelect,
}: {
  episodeNumber: number;
  shot: StoryboardShot;
  selected: boolean;
  /** 新增分镜后异步写配置中 */
  configuring?: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation("dashboard");
  const shotLabel = resolveStoryboardShotLabel(episodeNumber, shot);
  const shotDurationSec = resolveWorkspaceV2ShotDurationSec(shot);
  const visualPreview = shot.visual.trim();
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumbSrc = shot.thumbnailUrl || shot.storyboardImageUrl;

  useEffect(() => {
    setThumbFailed(false);
  }, [thumbSrc]);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={configuring}
      // 14″ 本默认约 1512 CSS 宽 → 小卡；外接屏通常更宽 → 大卡
      className="w-[160px] shrink-0 text-left min-[1520px]:w-[300px]"
    >
      <Card
        className={cn(
          "overflow-hidden rounded-none border border-border bg-card shadow-sm transition-colors duration-200",
          selected && "border-2 border-cyan-400/60 ring-2 ring-cyan-400/25",
          configuring && "border-cyan-400/35",
        )}
      >
        <div className="relative aspect-video overflow-hidden bg-[#12151c]">
          {thumbSrc && !thumbFailed ? (
            <img
              src={thumbSrc}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500/10 to-cyan-500/5">
              <span className="font-mono text-xs font-semibold text-cyan-400/80">{shotLabel}</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0" style={SHOT_CARD_GRID} />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/90 via-black/35 to-black/10" />
          <Badge
            className={cn(
              "absolute left-1.5 top-1.5 z-10 h-5 min-w-0 justify-center rounded-md px-1.5 font-mono text-[9px]",
              selected
                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100"
                : "border-border bg-background/80 text-muted-foreground",
            )}
          >
            {shotLabel}
          </Badge>
          {shotDurationSec > 0 ? (
            <span className="absolute right-1.5 top-1.5 z-10 rounded bg-background/75 px-1 py-0.5 text-[9px] text-muted-foreground">
              {shotDurationSec}s
            </span>
          ) : null}
          {shot.authorized ? (
            <span className="absolute bottom-1.5 right-1.5 z-10">
              <AuthorizedIndicator variant="badge" />
            </span>
          ) : null}
          {visualPreview && !configuring ? (
            <p
              className={cn(
                "absolute bottom-1.5 left-1.5 z-10 line-clamp-2 text-[11px] leading-snug text-white/90",
                shot.authorized ? "max-w-[calc(100%-5.5rem)]" : "max-w-full",
                "drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]",
              )}
              title={visualPreview}
            >
              {visualPreview}
            </p>
          ) : null}
          {configuring ? (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#0a0e14]/72 backdrop-blur-[2px]"
              aria-busy="true"
              aria-label={t("workspace_add_shot_configuring")}
            >
              <Loader2 className="h-6 w-6 animate-spin text-cyan-300" strokeWidth={2.4} />
              <span className="text-[11px] font-medium text-cyan-100/90">
                {t("workspace_add_shot_configuring")}
              </span>
            </div>
          ) : null}
        </div>
      </Card>
    </button>
  );
}

/** 分镜图 / 视频预览：16:9；窄屏（笔记本）限高，宽屏（外接大屏）全宽自适应 */
const SHOT_MEDIA_FRAME_CLASS =
  "relative mx-auto aspect-video h-[min(148px,20vh)] w-auto max-w-full shrink-0 overflow-hidden rounded-lg border border-white/8 bg-black/30 " +
  "min-[1520px]:mx-0 min-[1520px]:h-auto min-[1520px]:w-full";

function ShotMediaFrame({ children }: { children: ReactNode }) {
  return <div className={SHOT_MEDIA_FRAME_CLASS}>{children}</div>;
}

const MEDIA_PREVIEW_BTN_CLS =
  "absolute right-1.5 top-1.5 z-10 inline-flex h-7 items-center justify-center gap-1 rounded-full border border-white/14 bg-slate-950/55 px-2.5 text-white/90 shadow-[0_8px_22px_rgba(15,23,42,0.35)] backdrop-blur-md transition-all " +
  "opacity-100 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100 " +
  "hover:-translate-y-0.5 hover:border-white/28 hover:bg-slate-950/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/28";

function ShotMediaPreviewImage({
  src,
  alt,
  onError,
}: {
  src: string;
  alt: string;
  onError?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ShotMediaFrame>
        <div className="group absolute inset-0">
          <img
            src={src}
            alt={alt}
            className="absolute inset-0 h-full w-full object-contain"
            onError={onError}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            aria-label={`大图查看：${alt}`}
            className={MEDIA_PREVIEW_BTN_CLS}
          >
            <Maximize2 className="h-3 w-3 shrink-0" strokeWidth={2.25} />
            <span className="text-[11px] font-medium tracking-wide">大图查看</span>
          </button>
        </div>
      </ShotMediaFrame>
      {open ? <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ShotMediaPreviewVideo({ src, title }: { src: string; title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ShotMediaFrame>
        <div className="group absolute inset-0">
          <video
            src={src}
            controls
            playsInline
            className="absolute inset-0 h-full w-full object-contain"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            aria-label={`大屏查看：${title}`}
            className={MEDIA_PREVIEW_BTN_CLS}
          >
            <Maximize2 className="h-3 w-3 shrink-0" strokeWidth={2.25} />
            <span className="text-[11px] font-medium tracking-wide">大屏查看</span>
          </button>
        </div>
      </ShotMediaFrame>
      {open ? (
        <VideoLightbox src={src} title={title} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function ShotMediaEmpty({ label }: { label: string }) {
  return (
    <ShotMediaFrame>
      <div className="absolute inset-0 flex flex-col items-center justify-center border border-dashed border-white/10 bg-black/20 px-4 text-center">
        <p className="text-[13px] text-muted-foreground">暂无{label}</p>
        <p className="mt-1 text-[11px] text-muted-foreground/70">生成后将在此展示</p>
      </div>
    </ShotMediaFrame>
  );
}

function PromptFieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-14 shrink-0 pt-0.5 text-[11px] text-muted-foreground">{label}</span>
      <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-foreground/85">
        {value.trim() || "—"}
      </p>
    </div>
  );
}

/** 编辑态多行参数输入（光线 / 氛围 / 音效） */
function PromptTallInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex items-start gap-2">
      <span className="w-14 shrink-0 pt-1.5 text-[11px] text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="min-h-[4.5rem] min-w-0 flex-1 resize-none rounded-md border border-white/12 bg-black/35 px-2.5 py-2 text-[12px] leading-relaxed text-foreground/90 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
      />
    </label>
  );
}

/** 编辑态下拉：标题与触发器分行对齐，触发器略加高 */
function PromptSelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  renderOption,
  emptyLabel = "—",
}: {
  label: string;
  value: T | "";
  options: readonly T[];
  onChange: (value: T) => void;
  renderOption?: (value: T) => ReactNode;
  emptyLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <DropdownPill
        value={value as T}
        options={options}
        onChange={onChange}
        renderOption={(v) => {
          if (!value) return emptyLabel;
          return renderOption ? renderOption(v) : v;
        }}
        matchTriggerWidth
        className="min-w-0 flex-1 [&_button]:h-9 [&_button]:w-full [&_button]:justify-between [&_button]:rounded-md [&_button]:px-2.5 [&_button]:py-2 [&_button]:text-[12px]"
      />
    </div>
  );
}

function PromptMainText({
  value,
  editing,
  onChange,
  placeholder,
  systemPromptTitle,
  systemPrompts,
  systemPromptGroup,
  allSystemPromptTemplates,
  projectId,
  sceneId,
  onSystemPromptTemplatesSaved,
}: {
  value: string;
  editing?: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** 系统提示词弹窗标题 */
  systemPromptTitle?: string;
  /** episodes[].scenes[].system_prompt_templates 对应分组 */
  systemPrompts?: Record<string, string> | null;
  systemPromptGroup: "storyboard" | "video";
  allSystemPromptTemplates?: StoryboardSystemPromptTemplates | null;
  projectId?: string;
  sceneId?: string;
  onSystemPromptTemplatesSaved?: (
    next: StoryboardSystemPromptTemplates,
  ) => void | Promise<void>;
}) {
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const systemPromptTitleId = useId();
  const defaultKeys =
    systemPromptGroup === "storyboard"
      ? DEFAULT_STORYBOARD_SYSTEM_PROMPT_KEYS
      : DEFAULT_VIDEO_SYSTEM_PROMPT_KEYS;
  const entries = useMemo(() => {
    const source = systemPrompts ?? {};
    const keys =
      Object.keys(source).length > 0 ? Object.keys(source) : [...defaultKeys];
    return keys.map((key) => ({
      key,
      label: resolveSystemPromptKeyLabel(key),
      text: source[key] ?? "",
    }));
  }, [defaultKeys, systemPrompts]);
  const canSaveSystemPrompts = Boolean(projectId && sceneId);

  useEffect(() => {
    if (!systemPromptOpen) return;
    const source = systemPrompts ?? {};
    if (Object.keys(source).length > 0) {
      setDraft({ ...source });
      return;
    }
    setDraft(Object.fromEntries(defaultKeys.map((key) => [key, ""])));
  }, [defaultKeys, systemPromptOpen, systemPrompts]);

  const dirty = useMemo(() => {
    const keys = new Set([
      ...Object.keys(systemPrompts ?? {}),
      ...Object.keys(draft),
    ]);
    for (const key of keys) {
      if ((draft[key] ?? "") !== (systemPrompts?.[key] ?? "")) return true;
    }
    return false;
  }, [draft, systemPrompts]);

  const handleSaveSystemPrompts = async () => {
    if (!projectId || !sceneId || saving || !dirty) {
      if (!dirty) setSystemPromptOpen(false);
      return;
    }
    setSaving(true);
    try {
      const nextGroup: Record<string, string> = {};
      for (const [key, text] of Object.entries(draft)) {
        nextGroup[key] = text;
      }
      const nextTemplates: StoryboardSystemPromptTemplates = {
        storyboard:
          systemPromptGroup === "storyboard"
            ? nextGroup
            : { ...(allSystemPromptTemplates?.storyboard ?? {}) },
        video:
          systemPromptGroup === "video"
            ? nextGroup
            : { ...(allSystemPromptTemplates?.video ?? {}) },
      };
      await updateWorkspaceV2ScriptScene(projectId, sceneId, {
        system_prompt_templates: nextTemplates,
      });
      await onSystemPromptTemplatesSaved?.(nextTemplates);
      useAppStore.getState().pushToast("系统提示词已保存", "success");
      setSystemPromptOpen(false);
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(`保存系统提示词失败：${errMsg(err)}`, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          提示词
        </div>
        <button
          type="button"
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-white/8 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
          aria-label={systemPromptTitle ?? "编辑系统提示词"}
          title={systemPromptTitle ?? "系统提示词"}
          onClick={() => setSystemPromptOpen(true)}
        >
          <Lightbulb className="h-3 w-3" strokeWidth={2.2} aria-hidden />
        </button>
      </div>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="h-[6.25rem] w-full resize-none rounded-lg border border-white/12 bg-black/35 px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground/90 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
        />
      ) : value.trim() ? (
        <p className="max-h-[6.25rem] overflow-y-auto whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground/90">
          {value}
        </p>
      ) : (
        <p className="text-[12px] text-muted-foreground/70">暂无提示词</p>
      )}

      <GlassModal
        open={systemPromptOpen}
        onClose={saving ? () => undefined : () => setSystemPromptOpen(false)}
        labelledBy={systemPromptTitleId}
        widthClassName="w-[560px]"
        panelClassName={cn(WS2_MODAL_PANEL_CLASS, "flex max-h-[75vh] flex-col overflow-hidden")}
        closeOnBackdrop={!saving}
        closeOnEscape={!saving}
      >
        <div
          className={cn(
            WS2_SECTION_HEADER_CLASS,
            "flex shrink-0 items-center justify-between gap-3 px-5 py-3.5",
          )}
        >
          <h3
            id={systemPromptTitleId}
            className="text-[15px] font-semibold text-foreground"
          >
            {systemPromptTitle ?? "系统提示词"}
          </h3>
          <ModalCloseButton
            onClick={() => setSystemPromptOpen(false)}
            disabled={saving}
          />
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          {entries.map((entry) => (
            <div key={entry.key} className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {entry.label}
              </div>
              <textarea
                value={draft[entry.key] ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [entry.key]: e.target.value }))
                }
                disabled={saving || !canSaveSystemPrompts}
                rows={4}
                className="w-full resize-y rounded-lg border border-cyan-400/20 bg-gradient-to-br from-cyan-500/12 via-sky-500/8 to-transparent px-3 py-2.5 text-[12.5px] leading-relaxed text-foreground/90 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.12)] outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40 disabled:opacity-60"
              />
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/8 px-5 py-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="motion-safe:hover:translate-y-0"
            onClick={() => setSystemPromptOpen(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            className="motion-safe:hover:translate-y-0"
            onClick={() => void handleSaveSystemPrompts()}
            disabled={saving || !dirty || !canSaveSystemPrompts}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
            ) : null}
            确认
          </Button>
        </div>
      </GlassModal>
    </div>
  );
}

function resolveShotTypeLabel(
  shotType: string,
  t: (key: string) => string,
): string {
  if (!shotType) return "";
  const key = SHOT_TYPE_I18N_KEYS[shotType as ShotType];
  return key ? t(key) : shotType;
}

function resolveCameraMotionLabel(
  motion: string,
  t: (key: string) => string,
): string {
  if (!motion) return "";
  const key = CAMERA_MOTION_I18N_KEYS[motion as CameraMotion];
  return key ? t(key) : motion;
}

/** 分镜图卡片：仅展示 / 编辑 image_prompt */
function ShotImagePromptFields({
  draft,
  editing,
  onChange,
  systemPrompts,
  allSystemPromptTemplates,
  projectId,
  sceneId,
  onSystemPromptTemplatesSaved,
}: {
  draft: StoryboardImagePromptDraft;
  editing: boolean;
  onChange?: (next: StoryboardImagePromptDraft) => void;
  systemPrompts?: Record<string, string> | null;
  allSystemPromptTemplates?: StoryboardSystemPromptTemplates | null;
  projectId?: string;
  sceneId?: string;
  onSystemPromptTemplatesSaved?: (
    next: StoryboardSystemPromptTemplates,
  ) => void | Promise<void>;
}) {
  const { t } = useTranslation("dashboard");

  if (editing) {
    return (
      <div className="space-y-2.5">
        <PromptMainText
          value={draft.scene}
          editing
          onChange={(scene) => onChange?.({ ...draft, scene })}
          placeholder={t("image_prompt_placeholder")}
          systemPromptTitle="分镜图系统提示词"
          systemPrompts={systemPrompts}
          systemPromptGroup="storyboard"
          allSystemPromptTemplates={allSystemPromptTemplates}
          projectId={projectId}
          sceneId={sceneId}
          onSystemPromptTemplatesSaved={onSystemPromptTemplatesSaved}
        />
        <div className="flex flex-col gap-2 pl-0.5">
          <PromptSelectField
            label={t("shot_label")}
            value={draft.composition.shot_type}
            options={SHOT_TYPES}
            renderOption={(v: ShotType) => t(SHOT_TYPE_I18N_KEYS[v])}
            onChange={(shot_type: ShotType) =>
              onChange?.({
                ...draft,
                composition: { ...draft.composition, shot_type },
              })
            }
          />
          <PromptTallInput
            label={t("lighting_label")}
            value={draft.composition.lighting}
            onChange={(lighting) =>
              onChange?.({
                ...draft,
                composition: { ...draft.composition, lighting },
              })
            }
            placeholder={t("lighting_placeholder")}
          />
          <PromptTallInput
            label={t("ambiance_label")}
            value={draft.composition.ambiance}
            onChange={(ambiance) =>
              onChange?.({
                ...draft,
                composition: { ...draft.composition, ambiance },
              })
            }
            placeholder={t("ambiance_placeholder")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <PromptMainText
        value={draft.scene}
        systemPromptTitle="分镜图系统提示词"
        systemPrompts={systemPrompts}
        systemPromptGroup="storyboard"
        allSystemPromptTemplates={allSystemPromptTemplates}
        projectId={projectId}
        sceneId={sceneId}
        onSystemPromptTemplatesSaved={onSystemPromptTemplatesSaved}
      />
      <div className="space-y-1.5 pl-0.5">
        <PromptFieldRow
          label={t("shot_label")}
          value={resolveShotTypeLabel(draft.composition.shot_type, t)}
        />
        <PromptFieldRow label={t("lighting_label")} value={draft.composition.lighting} />
        <PromptFieldRow label={t("ambiance_label")} value={draft.composition.ambiance} />
      </div>
    </div>
  );
}

/** 分镜视频卡片：对白列表（展示 / 编辑） */
function ShotDialogueFields({
  dialogue,
  editing,
  characterNames,
  onChange,
}: {
  dialogue: StoryboardVideoPromptDraft["dialogue"];
  editing: boolean;
  /** 可选说话人：来自本镜绑定的人物资产 */
  characterNames?: string[];
  onChange?: (dialogue: StoryboardVideoPromptDraft["dialogue"]) => void;
}) {
  const { t } = useTranslation("dashboard");
  const speakerOptions = useMemo(() => {
    const names = (characterNames ?? [])
      .map((name) => name.trim())
      .filter(Boolean);
    return [...new Set(names)];
  }, [characterNames]);

  const updateEntry = (
    index: number,
    patch: Partial<StoryboardVideoPromptDraft["dialogue"][number]>,
  ) => {
    onChange?.(
      dialogue.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  };

  if (editing) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <span className="w-14 shrink-0 pt-1.5 text-[11px] text-muted-foreground">
            {t("workspace_script_scene_dialogue")}
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            {dialogue.map((entry, index) => (
              <div key={index} className="flex items-start gap-1.5">
                <DropdownPill
                  value={entry.speaker}
                  options={speakerOptions}
                  onChange={(speaker) => updateEntry(index, { speaker })}
                  renderOption={(v) =>
                    v.trim() ? v : t("speaker_placeholder")
                  }
                  matchTriggerWidth
                  className="h-8 w-[6.5rem] shrink-0 [&_button]:h-8 [&_button]:w-full [&_button]:justify-between [&_button]:rounded-md [&_button]:px-2 [&_button]:py-0 [&_button]:text-[12px]"
                />
                <textarea
                  value={entry.line}
                  onChange={(e) => updateEntry(index, { line: e.target.value })}
                  placeholder={t("line_placeholder")}
                  rows={2}
                  className="min-h-[2.75rem] min-w-0 flex-1 resize-none rounded-md border border-white/12 bg-black/35 px-2.5 py-1.5 text-[12px] leading-relaxed text-foreground/90 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                />
                <button
                  type="button"
                  onClick={() => onChange?.(dialogue.filter((_, i) => i !== index))}
                  aria-label={t("dialogue_remove")}
                  title={t("dialogue_remove")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground/85"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => onChange?.([...dialogue, { speaker: "", line: "" }])}
              disabled={speakerOptions.length === 0}
              title={
                speakerOptions.length === 0
                  ? "请先在绑定资产中添加角色"
                  : undefined
              }
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground/85 disabled:pointer-events-none disabled:opacity-40"
            >
              <Plus className="h-3 w-3" strokeWidth={2.4} />
              {t("add_dialogue")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (dialogue.length === 0) {
    return (
      <PromptFieldRow label={t("workspace_script_scene_dialogue")} value="" />
    );
  }

  return (
    <div className="flex items-start gap-2">
      <span className="w-14 shrink-0 pt-0.5 text-[11px] text-muted-foreground">
        {t("workspace_script_scene_dialogue")}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        {dialogue.map((entry, index) => (
          <div key={`${entry.speaker}-${index}`}>
            {entry.speaker.trim() ? (
              <CharacterTagChip name={entry.speaker} />
            ) : null}
            <p
              className={cn(
                "text-[12px] leading-relaxed text-foreground/85",
                entry.speaker.trim() ? "mt-1" : undefined,
              )}
            >
              {entry.line.trim() || "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 分镜视频卡片：镜头时长（展示 / 编辑） */
function ShotDurationField({
  durationSec,
  editing,
  onChange,
}: {
  durationSec: number;
  editing: boolean;
  onChange?: (durationSec: number) => void;
}) {
  const { t } = useTranslation("dashboard");
  const label = t("duration");

  if (editing) {
    return (
      <label className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-[11px] text-muted-foreground">{label}</span>
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={durationSec > 0 ? durationSec : ""}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange?.(Number.isFinite(next) && next > 0 ? Math.floor(next) : 0);
          }}
          placeholder="4"
          className="h-8 min-w-0 flex-1 rounded-md border border-white/12 bg-black/35 px-2.5 text-[12px] text-foreground/90 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
        />
      </label>
    );
  }

  return (
    <PromptFieldRow
      label={label}
      value={
        durationSec > 0
          ? t("duration_seconds_value_text", { value: durationSec })
          : ""
      }
    />
  );
}

/** 分镜视频卡片：仅展示 / 编辑 video_prompt */
function ShotVideoPromptFields({
  draft,
  durationSec,
  editing,
  characterNames,
  onChange,
  onDurationChange,
  systemPrompts,
  allSystemPromptTemplates,
  projectId,
  sceneId,
  onSystemPromptTemplatesSaved,
}: {
  draft: StoryboardVideoPromptDraft;
  durationSec: number;
  editing: boolean;
  /** 对白说话人选项：本镜绑定角色 */
  characterNames?: string[];
  onChange?: (next: StoryboardVideoPromptDraft) => void;
  onDurationChange?: (durationSec: number) => void;
  systemPrompts?: Record<string, string> | null;
  allSystemPromptTemplates?: StoryboardSystemPromptTemplates | null;
  projectId?: string;
  sceneId?: string;
  onSystemPromptTemplatesSaved?: (
    next: StoryboardSystemPromptTemplates,
  ) => void | Promise<void>;
}) {
  const { t } = useTranslation("dashboard");

  if (editing) {
    return (
      <div className="space-y-2.5">
        <PromptMainText
          value={draft.action}
          editing
          onChange={(action) => onChange?.({ ...draft, action })}
          placeholder={t("video_prompt_placeholder")}
          systemPromptTitle="分镜视频系统提示词"
          systemPrompts={systemPrompts}
          systemPromptGroup="video"
          allSystemPromptTemplates={allSystemPromptTemplates}
          projectId={projectId}
          sceneId={sceneId}
          onSystemPromptTemplatesSaved={onSystemPromptTemplatesSaved}
        />
        <div className="flex flex-col gap-2 pl-0.5">
          <PromptSelectField
            label={t("camera_motion_label")}
            value={draft.camera_motion}
            options={CAMERA_MOTIONS}
            renderOption={(v: CameraMotion) => t(CAMERA_MOTION_I18N_KEYS[v])}
            onChange={(camera_motion: CameraMotion) =>
              onChange?.({ ...draft, camera_motion })
            }
          />
          <PromptTallInput
            label={t("ambiance_audio_label")}
            value={draft.ambiance_audio}
            onChange={(ambiance_audio) => onChange?.({ ...draft, ambiance_audio })}
            placeholder={t("ambiance_audio_placeholder")}
          />
          <ShotDurationField
            durationSec={durationSec}
            editing
            onChange={onDurationChange}
          />
          <ShotDialogueFields
            dialogue={draft.dialogue}
            editing
            characterNames={characterNames}
            onChange={(dialogue) => onChange?.({ ...draft, dialogue })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <PromptMainText
        value={draft.action}
        systemPromptTitle="分镜视频系统提示词"
        systemPrompts={systemPrompts}
        systemPromptGroup="video"
        allSystemPromptTemplates={allSystemPromptTemplates}
        projectId={projectId}
        sceneId={sceneId}
        onSystemPromptTemplatesSaved={onSystemPromptTemplatesSaved}
      />
      <div className="space-y-1.5 pl-0.5">
        <PromptFieldRow
          label={t("camera_motion_label")}
          value={resolveCameraMotionLabel(draft.camera_motion, t)}
        />
        <PromptFieldRow label={t("ambiance_audio_label")} value={draft.ambiance_audio} />
        <ShotDurationField durationSec={durationSec} editing={false} />
        <ShotDialogueFields dialogue={draft.dialogue} editing={false} />
      </div>
    </div>
  );
}

/** 单镜分镜图/视频生成中 — 紧凑双环光晕 */
function ShotMediaGenerating({
  kind,
  reduceMotion,
}: {
  kind: "storyboard" | "video";
  reduceMotion: boolean | null;
}) {
  const title = kind === "storyboard" ? "正在生成分镜图" : "正在生成分镜视频";
  const message =
    kind === "storyboard"
      ? "AI 正在绘制本镜画面，完成后将自动展示"
      : "AI 正在渲染本镜视频，请稍候片刻";

  return (
    <ShotMediaFrame>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e14]/80 px-4"
        aria-busy="true"
        aria-live="polite"
        aria-label={title}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_40%,oklch(0.62_0.16_195/0.22),transparent)]"
        />
        {!reduceMotion ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-linear-to-r from-transparent via-cyan-400/35 to-transparent"
            animate={{ opacity: [0.25, 0.75, 0.25], scaleX: [0.72, 1, 0.72] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center gap-3.5"
        >
          <div className="relative flex h-14 w-14 items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-cyan-400/25 motion-safe:animate-spin"
              style={{ animationDuration: "3.2s" }}
            />
            <span
              aria-hidden
              className="absolute inset-1.5 rounded-full border border-t-cyan-300/85 border-r-transparent border-b-indigo-400/55 border-l-transparent motion-safe:animate-spin"
              style={{ animationDuration: "1.05s" }}
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-cyan-400/12 blur-md motion-safe:animate-pulse"
            />
            {kind === "storyboard" ? (
              <ImageIcon
                className="relative h-5 w-5 text-cyan-300 motion-safe:animate-pulse"
                strokeWidth={2}
              />
            ) : (
              <Clapperboard
                className="relative h-5 w-5 text-cyan-300 motion-safe:animate-pulse"
                strokeWidth={2}
              />
            )}
          </div>
          <div className="text-center">
            <p className="bg-linear-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-[13px] font-semibold text-transparent">
              {title}
            </p>
            <p className="mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-white/45">
              {message}
            </p>
          </div>
        </motion.div>
      </div>
    </ShotMediaFrame>
  );
}

function ShotMediaGenerateButton({
  label,
  disabled,
  disabledHint,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  disabledHint?: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      className="h-7 shrink-0 gap-1 px-2.5 text-[11px]"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
    >
      <RefreshCw className="h-3 w-3" strokeWidth={2.4} />
      {label}
    </Button>
  );
}

function ShotMediaPanel({
  title,
  icon,
  children,
  action,
  cost,
  awaiting,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  /** 卡片标题栏费用（已生成时显示预估/实际） */
  cost?: ReactNode;
  /** 生成中时边框呼吸高亮 */
  awaiting?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/3",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        awaiting && "shot-media-await",
      )}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-white/8 px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-cyan-300/85" aria-hidden>
            {icon}
          </span>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </div>
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {cost}
          {action}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

/** 分镜图 → 分镜视频：原画感 Z 弧（左卡右上 → 右卡左下） */
const SHOT_MEDIA_FLOW_PATH =
  "M 4 22 C 42 20, 48 58, 60 80 C 72 102, 78 138, 116 136";

type ShotMediaFlowStatus = "idle" | "generating" | "done";

function ShotMediaFlowConnector({
  reduceMotion,
  status,
}: {
  reduceMotion: boolean | null;
  status: ShotMediaFlowStatus;
}) {
  const reactId = useId().replace(/:/g, "");
  const gradId = `smf-grad-${reactId}`;
  const coreGradId = `smf-core-${reactId}`;
  const shellClass =
    "relative hidden h-full min-h-0 w-full self-stretch sm:block min-[1520px]:min-h-[14rem]";

  if (status === "done") {
    return (
      <div aria-hidden className={shellClass} title="分镜视频已完成">
        <svg
          viewBox="0 0 120 160"
          className="absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          <path
            d={SHOT_MEDIA_FLOW_PATH}
            stroke={`url(#${gradId})`}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.18"
          />
          <path
            d={SHOT_MEDIA_FLOW_PATH}
            stroke={`url(#${gradId})`}
            strokeWidth="1.35"
            strokeLinecap="round"
            opacity="0.92"
          />

          <circle cx="4" cy="22" r="2.1" fill="#34d399" opacity="0.95" />
          <circle
            cx="4"
            cy="22"
            r="3.6"
            fill="none"
            stroke="#6ee7b7"
            strokeWidth="0.7"
            opacity="0.55"
          />

          <circle cx="116" cy="136" r="5.2" fill="#052e1c" stroke="#34d399" strokeWidth="1.1" />
          <path
            d="M112.6 136.1 L114.8 138.4 L119.6 133.2"
            stroke="#6ee7b7"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  if (status === "idle") {
    return (
      <div aria-hidden className={shellClass} title="待生成分镜视频">
        <svg
          viewBox="0 0 120 160"
          className="absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          <path
            d={SHOT_MEDIA_FLOW_PATH}
            stroke={`url(#${gradId})`}
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.16"
          />
          <path
            d={SHOT_MEDIA_FLOW_PATH}
            stroke={`url(#${gradId})`}
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeDasharray="3 5"
            opacity="0.7"
          />

          <circle cx="4" cy="22" r="1.7" fill="#67e8f9" opacity="0.7" />
          <circle cx="116" cy="136" r="1.7" fill="#a78bfa" opacity="0.65" />
        </svg>
      </div>
    );
  }

  // generating：能量束动效
  return (
    <div aria-hidden className={shellClass} title="分镜视频生成中">
      <svg
        viewBox="0 0 120 160"
        className="absolute inset-0 h-full w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
            <stop offset="45%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id={coreGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ecfeff" stopOpacity="0" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d={SHOT_MEDIA_FLOW_PATH}
          stroke={`url(#${gradId})`}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.22"
        />
        <path
          d={SHOT_MEDIA_FLOW_PATH}
          stroke={`url(#${gradId})`}
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.9"
        />

        {!reduceMotion ? (
          <>
            <path
              d={SHOT_MEDIA_FLOW_PATH}
              stroke="#a5f3fc"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeDasharray="2 10"
              opacity="0.6"
              className="shot-media-flow-dash"
            />
            <path
              d={SHOT_MEDIA_FLOW_PATH}
              stroke={`url(#${coreGradId})`}
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeDasharray="10 48"
              className="shot-media-flow-core"
            />
          </>
        ) : null}

        <circle cx="4" cy="22" r="1.55" fill="#67e8f9" opacity="0.95" />
        <circle
          cx="4"
          cy="22"
          r="3"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="0.65"
          opacity="0.5"
          className={reduceMotion ? undefined : "shot-media-flow-node"}
        />
        <circle cx="116" cy="136" r="1.55" fill="#c4b5fd" opacity="0.95" />
        <circle
          cx="116"
          cy="136"
          r="3"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="0.65"
          opacity="0.5"
          className={reduceMotion ? undefined : "shot-media-flow-node"}
        />
      </svg>
    </div>
  );
}

function StoryboardShotDetail({
  episodeNumber,
  projectId,
  shot,
  segmentCost,
  generatingStoryboard,
  generatingVideo,
  uploadingStoryboard,
  deletingStoryboard,
  systemPromptTemplates,
  onGenerateStoryboard,
  onGenerateVideo,
  onUploadStoryboard,
  onDeleteStoryboard,
  onPromptSaved,
  onSystemPromptTemplatesSaved,
}: {
  episodeNumber: number;
  projectId: string;
  shot: StoryboardShot;
  segmentCost?: SegmentCost | null;
  generatingStoryboard: boolean;
  generatingVideo: boolean;
  uploadingStoryboard: boolean;
  deletingStoryboard?: boolean;
  systemPromptTemplates?: StoryboardSystemPromptTemplates | null;
  onGenerateStoryboard: () => void;
  onGenerateVideo: () => void;
  onUploadStoryboard?: () => void;
  onDeleteStoryboard?: () => void | Promise<boolean>;
  onPromptSaved: () => Promise<void>;
  onSystemPromptTemplatesSaved?: (
    next: StoryboardSystemPromptTemplates,
  ) => void | Promise<void>;
}) {
  const { t } = useTranslation(["dashboard", "common"]);
  const shotLabel = resolveStoryboardShotLabel(episodeNumber, shot);
  const shotDurationSec = resolveWorkspaceV2ShotDurationSec(shot);
  const reduceMotion = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);
  const [uploadConfirmOpen, setUploadConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [imageDraft, setImageDraft] = useState(() =>
    normalizeStoryboardImagePromptDraft(shot.imagePrompt),
  );
  const [videoDraft, setVideoDraft] = useState(() =>
    resolveStoryboardVideoPromptDraft(shot),
  );
  const [durationDraft, setDurationDraft] = useState(() => shotDurationSec);
  const [trackedShotId, setTrackedShotId] = useState(shot.id);
  const hasStoryboard = Boolean(shot.storyboardImageUrl);
  const hasVideo = Boolean(shot.storyboardVideoUrl);
  /** 分镜图已生成时展示图→视频连线：待生成 / 生成中 / 已完成 */
  const showMediaFlowConnector = hasStoryboard && !imageFailed;
  const mediaFlowStatus: ShotMediaFlowStatus = hasVideo
    ? "done"
    : generatingVideo
      ? "generating"
      : "idle";
  const awaitVideo = mediaFlowStatus === "generating";
  const awaitStoryboard = generatingStoryboard;
  const isAuthorized = shot.authorized === true;
  const storyboardUploadBlocking = useAppStore((s) => s.blockingOverlay != null);
  const storyboardUploadBusy = uploadingStoryboard || storyboardUploadBlocking;
  const shotMediaBusy = generatingStoryboard || generatingVideo;
  const shotMediaBusyHint = generatingStoryboard
    ? "分镜图生成中，请稍候"
    : generatingVideo
      ? "分镜视频生成中，请稍候"
      : undefined;

  // 切镜头时同步回到「分镜图/视频」，避免 useEffect 晚一帧先闪出新媒体图
  if (shot.id !== trackedShotId) {
    setTrackedShotId(shot.id);
    setImageFailed(false);
    setUploadConfirmOpen(false);
    setDeleteConfirmOpen(false);
    setEditing(false);
    setImageDraft(normalizeStoryboardImagePromptDraft(shot.imagePrompt));
    setVideoDraft(resolveStoryboardVideoPromptDraft(shot));
    setDurationDraft(shotDurationSec);
  }

  const enterEditMode = () => {
    setImageDraft(normalizeStoryboardImagePromptDraft(shot.imagePrompt));
    setVideoDraft(resolveStoryboardVideoPromptDraft(shot));
    setDurationDraft(shotDurationSec);
    setEditing(true);
  };

  const cancelEditMode = () => {
    setImageDraft(normalizeStoryboardImagePromptDraft(shot.imagePrompt));
    setVideoDraft(resolveStoryboardVideoPromptDraft(shot));
    setDurationDraft(shotDurationSec);
    setEditing(false);
  };

  const handleConfirmSavePrompt = async () => {
    if (!projectId || savingPrompt) return;
    const segmentId = resolveStoryboardSegmentId(shot);
    if (!segmentId) return;
    if (durationDraft <= 0 || !Number.isFinite(durationDraft)) {
      useAppStore
        .getState()
        .pushToast(t("workspace_add_shot_duration_invalid"), "error");
      return;
    }
    setSavingPrompt(true);
    try {
      // 分镜图/视频提示词：PATCH /script-scenes/{scene_id}（不再走 episodes/config）
      // 对白只写在 video_prompt.dialogue，不单独提交顶层 dialogue
      await updateWorkspaceV2ScriptScene(projectId, segmentId, {
        image_prompt: imageDraft as unknown as Record<string, unknown>,
        video_prompt: {
          ...(videoDraft as unknown as Record<string, unknown>),
          duration_seconds: Math.floor(durationDraft),
        },
        duration_seconds: Math.floor(durationDraft),
      });
      await onPromptSaved();
      setEditing(false);
      useAppStore.getState().pushToast(t("saved"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(t("save_failed", { message: errMsg(err) }), "error");
    } finally {
      setSavingPrompt(false);
    }
  };

  return (
    <Card className={cn(WS2_CARD_CLASS, "flex h-full min-h-0 flex-col overflow-hidden")}>
      <div
        className={cn(
          WS2_SECTION_HEADER_CLASS,
          "flex shrink-0 items-center gap-2 px-4 py-1.5",
        )}
      >
        <span className="text-[11px] font-medium text-muted-foreground">分镜图/视频</span>
        <span className="flex-1" />
        {!editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 shrink-0 gap-1 px-2.5 text-[11px] motion-safe:hover:translate-y-0"
            onClick={enterEditMode}
            disabled={shotMediaBusy}
            title={shotMediaBusy ? shotMediaBusyHint : t("edit_overview")}
          >
            <Pencil className="h-3 w-3" strokeWidth={2.4} />
            {t("edit_overview")}
          </Button>
        ) : null}
        {onUploadStoryboard && !editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 shrink-0 gap-1 px-2.5 text-[11px] motion-safe:hover:translate-y-0"
            onClick={() => setUploadConfirmOpen(true)}
            disabled={
              shotMediaBusy || storyboardUploadBusy || !hasStoryboard || isAuthorized
            }
            title={
              shotMediaBusy
                ? shotMediaBusyHint
                : isAuthorized
                  ? t("upload_storyboard_already_authorized")
                  : !hasStoryboard
                    ? t("media_generate_video_disabled_hint")
                    : t("upload_storyboard")
            }
          >
            {storyboardUploadBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
            ) : null}
            {t("upload_storyboard")}
          </Button>
        ) : null}
        {onDeleteStoryboard && !editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 shrink-0 gap-1 px-2.5 text-[11px] text-rose-300/90 motion-safe:hover:translate-y-0 hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={Boolean(deletingStoryboard) || shotMediaBusy}
            title={shotMediaBusy ? shotMediaBusyHint : t("workspace_delete_shot")}
          >
            {deletingStoryboard ? (
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.4} />
            ) : (
              <Trash2 className="h-3 w-3" strokeWidth={2.4} />
            )}
            {t("workspace_delete_shot")}
          </Button>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain px-5 py-3">
        <div className="flex h-full min-h-0 flex-1 items-start gap-3">
          <ShotBoundAssetsPanel
            projectId={projectId}
            sceneId={resolveStoryboardSegmentId(shot)}
            characters={shot.characters}
            scenes={shot.scenes}
            props={shot.props}
            onSaved={onPromptSaved}
          />
          <div className="mx-auto grid h-full min-h-0 min-w-0 w-full max-w-5xl flex-1 grid-cols-1 items-stretch gap-3 sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] sm:gap-0 min-[1520px]:max-w-none">
            <ShotMediaPanel
              title="分镜图"
              icon={<ImageIcon className="h-3.5 w-3.5" strokeWidth={2.2} />}
              awaiting={awaitStoryboard}
              cost={
                <ShotMediaCostBadge
                  estimate={segmentCost?.estimate.image}
                  actual={segmentCost?.actual.image}
                  mediaGenerated={hasStoryboard && !imageFailed}
                />
              }
              action={
                !generatingStoryboard && !editing ? (
                  <ShotMediaGenerateButton
                    label={hasStoryboard ? "重新生成分镜图" : "生成分镜图"}
                    disabled={generatingVideo}
                    disabledHint={
                      generatingVideo ? "分镜视频生成中，请稍候" : undefined
                    }
                    onClick={onGenerateStoryboard}
                  />
                ) : null
              }
            >
              {generatingStoryboard ? (
                <ShotMediaGenerating kind="storyboard" reduceMotion={reduceMotion} />
              ) : shot.storyboardImageUrl && !imageFailed ? (
                <ShotMediaPreviewImage
                  src={shot.storyboardImageUrl}
                  alt={`${shotLabel} 分镜图`}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <ShotMediaEmpty label="分镜图" />
              )}
              <ShotImagePromptFields
                draft={
                  editing
                    ? imageDraft
                    : normalizeStoryboardImagePromptDraft(shot.imagePrompt)
                }
                editing={editing}
                onChange={setImageDraft}
                systemPrompts={systemPromptTemplates?.storyboard}
                allSystemPromptTemplates={systemPromptTemplates}
                projectId={projectId}
                sceneId={resolveStoryboardSegmentId(shot)}
                onSystemPromptTemplatesSaved={onSystemPromptTemplatesSaved}
              />
            </ShotMediaPanel>

            {showMediaFlowConnector ? (
              <ShotMediaFlowConnector
                reduceMotion={reduceMotion}
                status={mediaFlowStatus}
              />
            ) : (
              <div className="hidden sm:block" aria-hidden />
            )}

            <ShotMediaPanel
              title="分镜视频"
              icon={<Video className="h-3.5 w-3.5" strokeWidth={2.2} />}
              awaiting={awaitVideo}
              cost={
                <ShotMediaCostBadge
                  estimate={segmentCost?.estimate.video}
                  actual={segmentCost?.actual.video}
                  mediaGenerated={hasVideo}
                />
              }
              action={
                !generatingVideo && !editing ? (
                  <ShotMediaGenerateButton
                    label={
                      hasVideo
                        ? t("media_regenerate_video")
                        : t("media_generate_video")
                    }
                    disabled={
                      !hasStoryboard || !isAuthorized || generatingStoryboard
                    }
                    disabledHint={
                      generatingStoryboard
                        ? "分镜图生成中，完成后即可生成视频"
                        : !hasStoryboard
                          ? t("media_generate_video_disabled_hint")
                          : !isAuthorized
                            ? t("media_generate_video_unauthorized_hint")
                            : t("media_generate_video_disabled_hint")
                    }
                    onClick={onGenerateVideo}
                  />
                ) : null
              }
            >
              {generatingVideo ? (
                <ShotMediaGenerating kind="video" reduceMotion={reduceMotion} />
              ) : hasVideo ? (
                <ShotMediaPreviewVideo
                  src={shot.storyboardVideoUrl!}
                  title={`${shotLabel} 分镜视频`}
                />
              ) : (
                <ShotMediaEmpty label="分镜视频" />
              )}
              <ShotVideoPromptFields
                draft={
                  editing
                    ? videoDraft
                    : resolveStoryboardVideoPromptDraft(shot)
                }
                durationSec={editing ? durationDraft : shotDurationSec}
                editing={editing}
                characterNames={shot.characters}
                onChange={setVideoDraft}
                onDurationChange={setDurationDraft}
                systemPrompts={systemPromptTemplates?.video}
                allSystemPromptTemplates={systemPromptTemplates}
                projectId={projectId}
                sceneId={resolveStoryboardSegmentId(shot)}
                onSystemPromptTemplatesSaved={onSystemPromptTemplatesSaved}
              />
            </ShotMediaPanel>
          </div>
        </div>
      </div>

      {editing ? (
        <div
          className={cn(
            WS2_SECTION_HEADER_CLASS,
            "flex shrink-0 items-center justify-end gap-2 border-t border-white/8 px-5 py-2.5",
          )}
        >
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="motion-safe:hover:translate-y-0"
            onClick={cancelEditMode}
            disabled={savingPrompt}
          >
            {t("common:cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            className="motion-safe:hover:translate-y-0"
            onClick={() => void handleConfirmSavePrompt()}
            disabled={savingPrompt}
          >
            {savingPrompt ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
            ) : null}
            {t("common:confirm")}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={uploadConfirmOpen}
        title={t("upload_storyboard_confirm_title")}
        description={t("upload_storyboards_confirm_description")}
        confirmLabel={t("upload_storyboards_confirm")}
        cancelLabel={t("common:cancel")}
        onCancel={() => setUploadConfirmOpen(false)}
        onConfirm={() => {
          setUploadConfirmOpen(false);
          onUploadStoryboard?.();
        }}
      />
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t("workspace_delete_shot_confirm_title")}
        description={t("workspace_delete_shot_confirm_desc", { id: shotLabel })}
        confirmLabel={t("workspace_delete_shot_confirm")}
        cancelLabel={t("common:cancel")}
        tone="danger"
        loading={Boolean(deletingStoryboard)}
        onCancel={() => {
          if (deletingStoryboard) return;
          setDeleteConfirmOpen(false);
        }}
        onConfirm={async () => {
          const ok = await onDeleteStoryboard?.();
          if (ok !== false) setDeleteConfirmOpen(false);
        }}
      />
    </Card>
  );
}

/** 右侧分镜内容区 loading — 双环 + 光晕 */
function StoryboardGeneratingOverlay({
  title,
  message,
  reduceMotion,
  icon = "clapperboard",
}: {
  title: string;
  message: string;
  reduceMotion: boolean | null;
  icon?: "clapperboard" | "shield";
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-[#0a0e14]/55 backdrop-blur-[3px]"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_42%,oklch(0.62_0.16_195/0.18),transparent)]"
      />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.92, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex flex-col items-center gap-4 rounded-2xl border border-cyan-400/25 bg-[#0a0e14]/92 px-8 py-7 shadow-[0_0_56px_oklch(0.62_0.16_195/0.32),inset_0_1px_0_oklch(1_0_0/0.06)]"
      >
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-cyan-400/20 motion-safe:animate-spin"
            style={{ animationDuration: "3.2s" }}
          />
          <span
            aria-hidden
            className="absolute inset-1.5 rounded-full border border-t-cyan-300/80 border-r-transparent border-b-indigo-400/50 border-l-transparent motion-safe:animate-spin"
            style={{ animationDuration: "1.1s" }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-cyan-400/10 blur-md motion-safe:animate-pulse"
          />
          {icon === "shield" ? (
            <ShieldCheck
              className="relative h-6 w-6 text-cyan-300 motion-safe:animate-pulse"
              strokeWidth={2}
            />
          ) : (
            <Clapperboard
              className="relative h-6 w-6 text-cyan-300 motion-safe:animate-pulse"
              strokeWidth={2}
            />
          )}
        </div>
        <div className="text-center">
          <p className="bg-linear-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-sm font-semibold text-transparent">
            {title}
          </p>
          <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-white/45">{message}</p>
        </div>
      </motion.div>
    </div>
  );
}

type PipelineStepDef = {
  id: string;
  label: string;
  hint: string;
};

/** 两阶段流水线 tips 卡片（弹框内 / 内容区遮罩共用） */
function PipelineStepsCard({
  stage,
  steps,
  title,
  reduceMotion,
  className,
}: {
  stage: string;
  steps: PipelineStepDef[];
  title: string;
  reduceMotion: boolean | null;
  className?: string;
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === stage),
  );
  const activeHint = steps[activeIndex]?.hint ?? "";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex w-full max-w-[380px] flex-col gap-5 rounded-2xl border border-cyan-400/25 bg-[#0a0e14]/94 px-7 py-7 shadow-[0_0_56px_oklch(0.62_0.16_195/0.3),inset_0_1px_0_oklch(1_0_0/0.06)]",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-cyan-400/20 motion-safe:animate-spin"
            style={{ animationDuration: "3.2s" }}
          />
          <span
            aria-hidden
            className="absolute inset-1.5 rounded-full border border-t-cyan-300/80 border-r-transparent border-b-indigo-400/50 border-l-transparent motion-safe:animate-spin"
            style={{ animationDuration: "1.1s" }}
          />
          <Clapperboard
            className="relative h-5 w-5 text-cyan-300 motion-safe:animate-pulse"
            strokeWidth={2}
          />
        </div>
        <p className="bg-linear-to-r from-cyan-300 via-sky-300 to-indigo-300 bg-clip-text text-sm font-semibold text-transparent">
          {title}
        </p>
      </div>

      <ol className="space-y-2.5">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const active = step.id === stage;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                active
                  ? "border-cyan-400/35 bg-cyan-500/10"
                  : done
                    ? "border-emerald-400/25 bg-emerald-500/8"
                    : "border-white/8 bg-white/3",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  active
                    ? "bg-cyan-400/25 text-cyan-200"
                    : done
                      ? "bg-emerald-400/25 text-emerald-200"
                      : "bg-white/8 text-white/40",
                )}
              >
                {done ? "✓" : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[12.5px] font-medium",
                    active
                      ? "text-cyan-100"
                      : done
                        ? "text-emerald-100/90"
                        : "text-white/45",
                  )}
                >
                  {step.label}
                </p>
                {active ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">{step.hint}</p>
                ) : null}
              </div>
              {active ? (
                <Loader2
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-cyan-300"
                  strokeWidth={2.4}
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="text-center text-[11px] leading-relaxed text-white/40">{activeHint}</p>
    </motion.div>
  );
}

type AddEpisodePipelineStage = "script" | "config";
type AddShotPipelineStage = "content" | "config";

/** 新增剧集：剧本处理 → 自动生成配置，分阶段 tips */
function AddEpisodePipelineOverlay({
  stage,
  reduceMotion,
  title,
  scriptLabel,
  scriptHint,
  configLabel,
  configHint,
}: {
  stage: AddEpisodePipelineStage;
  reduceMotion: boolean | null;
  title: string;
  scriptLabel: string;
  scriptHint: string;
  configLabel: string;
  configHint: string;
}) {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden bg-[#0a0e14]/60 backdrop-blur-[3px]"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_50%_42%,oklch(0.62_0.16_195/0.2),transparent)]"
      />
      <PipelineStepsCard
        className="mx-4"
        stage={stage}
        reduceMotion={reduceMotion}
        title={title}
        steps={[
          { id: "script", label: scriptLabel, hint: scriptHint },
          { id: "config", label: configLabel, hint: configHint },
        ]}
      />
    </div>
  );
}

/** 尚未生成分镜配置时遮挡整块内容区（含剧集列表）；按钮在卡片内，生成中才起 logo 动效 */
function StoryboardConfigRequiredOverlay({
  title,
  hint,
  actionLabel,
  generatingLabel,
  generating,
  disabled,
  reduceMotion,
  onGenerate,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  generatingLabel: string;
  generating: boolean;
  disabled?: boolean;
  reduceMotion: boolean | null;
  onGenerate: () => void;
}) {
  const showMotion = generating && !reduceMotion;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-busy={generating || undefined}
      aria-label={generating ? generatingLabel : title}
    >
      {/* 底层压暗 + 模糊，挡住列表与右侧内容交互 */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[#060a10]/72 backdrop-blur-md backdrop-saturate-50"
      />

      {/* 氛围光：与「生成分镜配置」按钮蓝青绿渐变呼应 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 78% 8%, oklch(0.55 0.18 250 / 0.28), transparent 60%)," +
            "radial-gradient(ellipse 50% 40% at 50% 48%, oklch(0.62 0.14 210 / 0.22), transparent 65%)," +
            "radial-gradient(ellipse 40% 35% at 22% 70%, oklch(0.55 0.12 160 / 0.16), transparent 60%)",
        }}
      />

      {/* 细网格 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.75 0.08 210 / 0.35) 1px, transparent 1px)," +
            "linear-gradient(90deg, oklch(0.75 0.08 210 / 0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 75%)",
        }}
      />

      {/* 扫描线：仅生成中播放 */}
      {showMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-24 opacity-40"
          style={{
            background:
              "linear-gradient(to bottom, transparent, oklch(0.7 0.12 200 / 0.18), transparent)",
          }}
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "linear" }}
        />
      ) : null}

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-4 flex max-w-[360px] flex-col items-center gap-5 rounded-2xl border border-cyan-400/30 bg-[#0a0e14]/90 px-8 py-8 shadow-[0_0_64px_oklch(0.58_0.14_210/0.4),inset_0_1px_0_oklch(1_0_0/0.08)]"
      >
        <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center">
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full border border-cyan-400/25",
              showMotion && "animate-spin",
            )}
            style={showMotion ? { animationDuration: "3.6s" } : undefined}
          />
          <span
            aria-hidden
            className={cn(
              "absolute inset-2 rounded-full border border-t-emerald-300/80 border-r-transparent border-b-sky-400/55 border-l-transparent",
              showMotion && "animate-spin",
            )}
            style={
              showMotion
                ? { animationDuration: "1.15s", animationDirection: "reverse" }
                : undefined
            }
          />
          <span
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-full bg-cyan-400/15 blur-lg",
              showMotion && "animate-pulse",
            )}
          />
          <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#2563eb]/40 via-[#0891b2]/35 to-[#059669]/40 shadow-[0_0_24px_oklch(0.62_0.14_210/0.45)]">
            <Clapperboard
              className={cn("h-5 w-5 text-cyan-100", showMotion && "animate-pulse")}
              strokeWidth={2.2}
            />
          </span>
        </div>

        <div className="relative text-center">
          <p className="bg-gradient-to-r from-[#93c5fd] via-[#67e8f9] to-[#6ee7b7] bg-clip-text text-[15px] font-semibold tracking-tight text-transparent">
            {generating ? generatingLabel : title}
          </p>
          <p className="mt-2.5 max-w-[280px] text-[12px] leading-relaxed text-white/50">
            {hint}
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          className={cn(
            "relative shrink-0 border-0 px-5 motion-safe:hover:translate-y-0",
            "bg-gradient-to-r from-[#2563eb] via-[#0891b2] to-[#059669] text-white",
            "shadow-[0_0_22px_oklch(0.62_0.14_210/0.45),inset_0_1px_0_oklch(1_0_0/0.28)]",
            "hover:opacity-95",
          )}
          onClick={onGenerate}
          disabled={disabled || generating}
          title={generating ? generatingLabel : actionLabel}
        >
          <Clapperboard
            className={cn("h-3.5 w-3.5", generating && "animate-pulse")}
            strokeWidth={2.4}
          />
          {generating ? generatingLabel : actionLabel}
        </Button>
      </motion.div>
    </div>
  );
}

export function StoryboardProductionPanel() {
  const { t } = useTranslation("dashboard");
  const tRef = useRef(t);
  tRef.current = t;
  const reduceMotion = useReducedMotion();
  const { projectId } = useWorkspaceV2ProjectDetail();
  const tasks = useTasksStore((s) => s.tasks);

  const [episodes, setEpisodes] = useState<StoryboardEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const [selectedShotId, setSelectedShotId] = useState("");
  /** production.episodes 为空（未生成分镜配置）时显示「生成分镜配置」 */
  const [showGenerateConfig, setShowGenerateConfig] = useState(true);
  const [batchUploadConfirmOpen, setBatchUploadConfirmOpen] = useState(false);
  /** 批量授权分镜（同步接口，内容区 loading） */
  const [batchAuthorizing, setBatchAuthorizing] = useState(false);
  const [batchAuthorizingCount, setBatchAuthorizingCount] = useState(0);
  const [batchGeneratingStoryboards, setBatchGeneratingStoryboards] = useState(false);
  const [batchGeneratingVideos, setBatchGeneratingVideos] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const moreActionsAnchorRef = useRef<HTMLButtonElement>(null);
  const [addShotOpen, setAddShotOpen] = useState(false);
  /** 新增镜头流水线硬锁：loading 期间禁止任何途径关弹框，仅两阶段成功后解锁 */
  const addShotPipelineLockRef = useRef(false);
  const requestCloseAddShotModal = useCallback(() => {
    if (addShotPipelineLockRef.current) return;
    setAddShotOpen(false);
  }, []);
  const [addShotIndex, setAddShotIndex] = useState("0");
  const [addShotDuration, setAddShotDuration] = useState("8");
  const [addShotText, setAddShotText] = useState("");
  const [addingShot, setAddingShot] = useState(false);
  const [deletingShot, setDeletingShot] = useState(false);
  const [addEpisodeOpen, setAddEpisodeOpen] = useState(false);
  const [addEpisodeIndex, setAddEpisodeIndex] = useState("1");
  const [addEpisodeMode, setAddEpisodeMode] = useState<"text" | "file">("text");
  const [addEpisodeText, setAddEpisodeText] = useState("");
  const [addEpisodeFile, setAddEpisodeFile] = useState<File | null>(null);
  const [addingEpisode, setAddingEpisode] = useState(false);
  const [deleteEpisodeTarget, setDeleteEpisodeTarget] = useState<StoryboardEpisode | null>(null);
  const [deletingEpisode, setDeletingEpisode] = useState(false);
  const addEpisodeFileInputRef = useRef<HTMLInputElement>(null);
  /** 新增分镜后等待 scene_content → episode_*_storyboard_add（接口直接返回两阶段 task id） */
  const [addShotPending, setAddShotPending] = useState<{
    episodeNumber: number;
    sceneId: string;
    stage: AddShotPipelineStage;
    contentTaskId: string;
    configTaskId: string;
  } | null>(null);
  /** 新增剧集流水线：script_process → 自动 generate-config */
  const [addEpisodePending, setAddEpisodePending] = useState<{
    episodeNumber: number;
    stage: AddEpisodePipelineStage;
    taskId?: string;
    configTaskId?: string;
    startedAt: number;
    /** 本地占位标题（production 尚未返回该集时用） */
    placeholderTitle?: string;
  } | null>(null);
  const addEpisodePendingRef = useRef(addEpisodePending);
  addEpisodePendingRef.current = addEpisodePending;
  const handledAddShotTaskIdsRef = useRef(new Set<string>());
  const handledAddEpisodeTaskIdsRef = useRef(new Set<string>());
  /** 新增剧集流水线触发的 config task，成功时用专用 toast */
  const addEpisodeConfigTaskIdsRef = useRef(new Set<string>());
  const addEpisodeConfigStartingRef = useRef(false);
  const addShotTitleId = useId();
  const addEpisodeTitleId = useId();
  /** 正在提交 / 跟踪中的单集生成（episodeNumber → taskId） */
  const [submittingEpisode, setSubmittingEpisode] = useState<number | null>(null);
  const [generateTaskByEpisode, setGenerateTaskByEpisode] = useState<
    Partial<Record<number, string>>
  >({});
  const handledGenerateTaskIdsRef = useRef(new Set<string>());
  /** segment_id → 费用明细（cost-estimate） */
  const [segmentCostById, setSegmentCostById] = useState<Map<string, SegmentCost>>(
    () => new Map(),
  );
  /** episode number → 该集 segments（用于标题合计） */
  const [episodeCostSegments, setEpisodeCostSegments] = useState<
    Map<number, SegmentCost[]>
  >(() => new Map());

  const refreshCostEstimate = useCallback(async () => {
    if (!projectId) return;
    try {
      const result = await fetchWorkspaceV2CostEstimate(projectId);
      setSegmentCostById(buildSegmentCostIndex(result.episodes));
      const byEpisode = new Map<number, SegmentCost[]>();
      for (const ep of result.episodes) {
        byEpisode.set(ep.episode, ep.segments);
      }
      setEpisodeCostSegments(byEpisode);
    } catch {
      // 费用为辅助信息，失败不阻断分镜制作主流程
    }
  }, [projectId]);

  const refreshProduction = useCallback(async () => {
    const result = await fetchWorkspaceV2ProjectProduction(projectId);
    // production 以 episodes 为分集+镜头主数据
    let mapped = mapWorkspaceV2ProductionEpisodes(result, projectId);
    const pending = addEpisodePendingRef.current;
    // 流水线中的新集可能尚未出现在 production：保留占位，避免侧栏/选中/loading 被冲掉
    if (
      pending &&
      !mapped.some((ep) => ep.episodeNumber === pending.episodeNumber)
    ) {
      mapped = [
        ...mapped,
        {
          id: `ep-${pending.episodeNumber}`,
          episodeNumber: pending.episodeNumber,
          title: pending.placeholderTitle?.trim() || `第 ${pending.episodeNumber} 集`,
          description: "",
          shots: [],
        },
      ].sort((a, b) => a.episodeNumber - b.episodeNumber);
    }
    setShowGenerateConfig(!workspaceV2ProductionHasEpisodeConfigs(result));
    setEpisodes(mapped);
    setSelectedEpisodeId((prev) => {
      if (prev && mapped.some((ep) => ep.id === prev)) return prev;
      if (
        pending &&
        mapped.some((ep) => ep.episodeNumber === pending.episodeNumber)
      ) {
        return `ep-${pending.episodeNumber}`;
      }
      return mapped[0]?.id ?? "";
    });
    return mapped;
  }, [projectId]);

  /** 刷新 production 后同步指定集的选中镜头（替代原 GET config） */
  const applyEpisodeConfig = useCallback(
    async (episodeNumber: number) => {
      const mapped = await refreshProduction();
      const ep = mapped.find((item) => item.episodeNumber === episodeNumber);
      const shots = ep?.shots ?? [];
      setSelectedShotId((prev) => {
        if (prev && shots.some((shot) => shot.id === prev)) return prev;
        return shots[0]?.id ?? "";
      });
      return mapped;
    },
    [refreshProduction],
  );

  // 进入节点：拉 production（episodes 含分集/scenes），默认选中第一集
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setGenerateTaskByEpisode({});
    setSubmittingEpisode(null);
    addShotPipelineLockRef.current = false;
    setAddShotPending(null);
    handledGenerateTaskIdsRef.current = new Set();
    handledAddShotTaskIdsRef.current = new Set();
    handledAddEpisodeTaskIdsRef.current = new Set();
    addEpisodeConfigTaskIdsRef.current = new Set();
    addEpisodeConfigStartingRef.current = false;
    handledShotMediaTaskIdsRef.current = new Set();
    submittedShotMediaTaskIdsRef.current = new Set();
    prevShotMediaStatusRef.current = new Map();
    shotMediaStatusSeededRef.current = false;
    setAddEpisodePending(null);
    setSegmentCostById(new Map());
    setEpisodeCostSegments(new Map());

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchWorkspaceV2ProjectProduction(projectId);
        if (cancelled) return;
        const mapped = mapWorkspaceV2ProductionEpisodes(result, projectId);
        setShowGenerateConfig(!workspaceV2ProductionHasEpisodeConfigs(result));
        setEpisodes(mapped);
        setSelectedEpisodeId(mapped[0]?.id ?? "");
        setSelectedShotId(mapped[0]?.shots[0]?.id ?? "");
        void refreshCostEstimate();
      } catch (err) {
        if (cancelled) return;
        setEpisodes([]);
        setSelectedEpisodeId("");
        setSelectedShotId("");
        setShowGenerateConfig(true);
        setError(errMsg(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshCostEstimate]);

  // 切集时：数据已在 production.episodes 中，仅同步选中镜头
  useEffect(() => {
    if (loading || !selectedEpisodeId) return;
    const ep = episodes.find((item) => item.id === selectedEpisodeId);
    const shots = ep?.shots ?? [];
    setSelectedShotId((prev) => {
      if (prev && shots.some((shot) => shot.id === prev)) return prev;
      return shots[0]?.id ?? "";
    });
  }, [episodes, loading, selectedEpisodeId]);

  useEffect(() => {
    setMoreActionsOpen(false);
    // 新增镜头流水线进行中时不打断弹框
    if (addShotPipelineLockRef.current || addShotPending) return;
    setAddShotOpen(false);
  }, [selectedEpisodeId, addShotPending]);

  const isEpisodeGenerating = useCallback(
    (episodeNumber: number) => {
      // 0 = 全量生成进行中，所有集视为 busy
      if (submittingEpisode === 0 || submittingEpisode === episodeNumber) return true;
      const allTaskId = generateTaskByEpisode[0];
      if (allTaskId) {
        const allTracked = tasks.find((task) => task.task_id === allTaskId);
        if (!allTracked || EPISODE_CONFIG_ACTIVE.has(allTracked.status)) return true;
      }
      const trackedId = generateTaskByEpisode[episodeNumber];
      if (trackedId) {
        const tracked = tasks.find((task) => task.task_id === trackedId);
        if (!tracked) return true;
        if (EPISODE_CONFIG_ACTIVE.has(tracked.status)) return true;
      }
      return tasks.some((task) => {
        if (
          task.project_name !== projectId ||
          task.task_type !== "episode_config" ||
          !EPISODE_CONFIG_ACTIVE.has(task.status) ||
          isStoryboardAddConfigTask(task)
        ) {
          return false;
        }
        const ep = episodeNumberFromConfigTask(task);
        // 无 episode 标记的「全部生成」任务：所有集视为 busy
        if (ep == null) return true;
        return ep === episodeNumber;
      });
    },
    [generateTaskByEpisode, projectId, submittingEpisode, tasks],
  );

  /** 新增剧集流水线进行中（剧本处理或自动生成配置） */
  const isAddEpisodePipelineBusy = useCallback(
    (episodeNumber: number) => {
      // pending 未清除前始终视为 busy，避免 config 刚成功、production 未刷新时闪「生成配置」蒙层
      if (addEpisodePending?.episodeNumber === episodeNumber) return true;

      return tasks.some((task) => {
        if (
          task.project_name !== projectId ||
          task.task_type !== "script_process" ||
          !SCRIPT_PROCESS_ACTIVE.has(task.status)
        ) {
          return false;
        }
        return episodeNumberFromScriptProcessTask(task) === episodeNumber;
      });
    },
    [addEpisodePending, projectId, tasks],
  );

  // 任务终态：成功刷新 production；失败 toast
  useEffect(() => {
    const entries = Object.entries(generateTaskByEpisode) as [string, string][];
    for (const [epRaw, taskId] of entries) {
      const episodeNumber = Number(epRaw);
      if (!Number.isFinite(episodeNumber)) continue;
      if (handledGenerateTaskIdsRef.current.has(taskId)) continue;
      const task = tasks.find((item) => item.task_id === taskId);
      if (!task || EPISODE_CONFIG_ACTIVE.has(task.status)) continue;
      handledGenerateTaskIdsRef.current.add(taskId);

      setGenerateTaskByEpisode((prev) => {
        if (prev[episodeNumber] !== taskId) return prev;
        const next = { ...prev };
        delete next[episodeNumber];
        return next;
      });

      if (task.status === "succeeded") {
        const fromAddEpisodePipeline = addEpisodeConfigTaskIdsRef.current.has(taskId);
        if (fromAddEpisodePipeline) {
          addEpisodeConfigTaskIdsRef.current.delete(taskId);
          // 先刷新本集配置，再清 pending，避免流水线蒙层与「生成配置」蒙层之间闪一下
          void applyEpisodeConfig(episodeNumber)
            .then(() => {
              setAddEpisodePending((prev) =>
                prev?.configTaskId === taskId || prev?.episodeNumber === episodeNumber
                  ? null
                  : prev,
              );
              useAppStore
                .getState()
                .pushToast(tRef.current("workspace_add_episode_ready"), "success");
            })
            .catch((err: unknown) => {
              setAddEpisodePending((prev) =>
                prev?.configTaskId === taskId || prev?.episodeNumber === episodeNumber
                  ? null
                  : prev,
              );
              useAppStore.getState().pushToast(errMsg(err), "error");
            });
          continue;
        }
        const done = episodeNumber === 0 ? refreshProduction() : applyEpisodeConfig(episodeNumber);
        void done
          .then(() => {
            void refreshCostEstimate();
            useAppStore
              .getState()
              .pushToast(tRef.current("workspace_storyboards_ready_toast"), "success");
          })
          .catch((err: unknown) => {
            useAppStore.getState().pushToast(errMsg(err), "error");
          });
        continue;
      }

      if (task.status === "failed" || task.status === "cancelled") {
        if (addEpisodeConfigTaskIdsRef.current.has(taskId)) {
          addEpisodeConfigTaskIdsRef.current.delete(taskId);
          setAddEpisodePending((prev) =>
            prev?.configTaskId === taskId || prev?.episodeNumber === episodeNumber
              ? null
              : prev,
          );
        }
        useAppStore.getState().pushToast(
          tRef.current("workspace_storyboards_failed", {
            message:
              task.error_message?.trim() ||
              tRef.current("workspace_asset_extract_failed_fallback"),
          }),
          "error",
        );
      }
    }
  }, [applyEpisodeConfig, generateTaskByEpisode, refreshCostEstimate, refreshProduction, tasks]);

  // 新增分镜流水线：直接用接口返回的 content_task_id / config_task_id 轮询，都成功后关弹框
  useEffect(() => {
    if (!addShotPending || !projectId) return;
    const { sceneId, contentTaskId, configTaskId, stage } = addShotPending;

    const trackedContent = tasks.find((task) => task.task_id === contentTaskId);
    const trackedConfig = tasks.find((task) => task.task_id === configTaskId);

    if (
      trackedContent &&
      (trackedContent.status === "failed" || trackedContent.status === "cancelled")
    ) {
      if (handledAddShotTaskIdsRef.current.has(`content:${contentTaskId}`)) return;
      handledAddShotTaskIdsRef.current.add(`content:${contentTaskId}`);
      addShotPipelineLockRef.current = false;
      setAddShotPending(null);
      useAppStore.getState().pushToast(
        tRef.current("workspace_add_shot_content_failed", {
          message:
            trackedContent.error_message?.trim() ||
            tRef.current("workspace_asset_extract_failed_fallback"),
        }),
        "error",
      );
      return;
    }
    if (
      trackedConfig &&
      (trackedConfig.status === "failed" || trackedConfig.status === "cancelled")
    ) {
      if (handledAddShotTaskIdsRef.current.has(`config:${configTaskId}`)) return;
      handledAddShotTaskIdsRef.current.add(`config:${configTaskId}`);
      addShotPipelineLockRef.current = false;
      setAddShotPending(null);
      useAppStore.getState().pushToast(
        tRef.current("workspace_add_shot_config_failed", {
          message:
            trackedConfig.error_message?.trim() ||
            tRef.current("workspace_asset_extract_failed_fallback"),
        }),
        "error",
      );
      return;
    }

    const contentDone = trackedContent?.status === "succeeded";
    const configDone = trackedConfig?.status === "succeeded";
    const contentActive = Boolean(
      trackedContent && SCENE_CONTENT_ACTIVE.has(trackedContent.status),
    );

    const nextStage: AddShotPipelineStage =
      contentDone && !contentActive ? "config" : "content";
    if (nextStage !== stage) {
      setAddShotPending((prev) =>
        prev && prev.contentTaskId === contentTaskId ? { ...prev, stage: nextStage } : prev,
      );
    }

    if (!contentDone || !configDone) return;

    const finishKey = `finish:${configTaskId}:${contentTaskId}`;
    if (handledAddShotTaskIdsRef.current.has(finishKey)) return;
    handledAddShotTaskIdsRef.current.add(finishKey);

    addShotPipelineLockRef.current = false;
    setAddShotPending(null);
    setAddShotOpen(false);
    setAddShotText("");
    void refreshProduction()
      .then(() => {
        if (sceneId) setSelectedShotId(sceneId);
        useAppStore
          .getState()
          .pushToast(tRef.current("workspace_add_shot_pipeline_ready"), "success");
      })
      .catch((err: unknown) => {
        useAppStore.getState().pushToast(errMsg(err), "error");
      });
  }, [addShotPending, projectId, refreshProduction, tasks]);

  // 新增剧集流水线：script_process 完成后自动 generate-config
  useEffect(() => {
    if (!addEpisodePending || !projectId) return;
    const { episodeNumber, taskId, startedAt, stage } = addEpisodePending;
    if (stage !== "script") return;

    const bindTask =
      (taskId ? tasks.find((task) => task.task_id === taskId) : undefined) ??
      tasks.find(
        (task) =>
          task.project_name === projectId &&
          task.task_type === "script_process" &&
          episodeNumberFromScriptProcessTask(task) === episodeNumber &&
          (SCRIPT_PROCESS_ACTIVE.has(task.status) ||
            (task.status === "succeeded" &&
              task.finished_at != null &&
              Date.parse(task.finished_at) >= startedAt - 2000)),
      );

    if (!bindTask) return;

    if (!taskId || taskId !== bindTask.task_id) {
      setAddEpisodePending((prev) =>
        prev && prev.episodeNumber === episodeNumber && prev.stage === "script"
          ? { ...prev, taskId: bindTask.task_id }
          : prev,
      );
    }

    if (SCRIPT_PROCESS_ACTIVE.has(bindTask.status)) return;
    if (handledAddEpisodeTaskIdsRef.current.has(bindTask.task_id)) return;
    handledAddEpisodeTaskIdsRef.current.add(bindTask.task_id);

    if (bindTask.status === "failed" || bindTask.status === "cancelled") {
      setAddEpisodePending((prev) =>
        prev?.taskId === bindTask.task_id || prev?.episodeNumber === episodeNumber
          ? null
          : prev,
      );
      useAppStore.getState().pushToast(
        tRef.current("workspace_add_episode_process_failed", {
          message:
            bindTask.error_message?.trim() ||
            tRef.current("workspace_asset_extract_failed_fallback"),
        }),
        "error",
      );
      return;
    }

    if (bindTask.status !== "succeeded") return;
    if (addEpisodeConfigStartingRef.current) return;
    addEpisodeConfigStartingRef.current = true;

    setAddEpisodePending((prev) =>
      prev && prev.episodeNumber === episodeNumber
        ? { ...prev, stage: "config", taskId: bindTask.task_id }
        : prev,
    );

    void (async () => {
      try {
        await refreshProduction();
        const result = await generateWorkspaceV2EpisodeConfig(projectId, {
          episode: episodeNumber,
        });
        if (!result.success) {
          setAddEpisodePending(null);
          useAppStore.getState().pushToast(
            tRef.current("workspace_storyboards_failed", {
              message: result.message || tRef.current("workspace_asset_extract_failed_fallback"),
            }),
            "error",
          );
          return;
        }

        const configTaskId = result.task_id?.trim();
        if (configTaskId) {
          addEpisodeConfigTaskIdsRef.current.add(configTaskId);
          handledGenerateTaskIdsRef.current.delete(configTaskId);
          upsertWorkspaceV2EpisodeConfigTask({
            taskId: configTaskId,
            projectName: projectId,
            episode: episodeNumber,
          });
          setGenerateTaskByEpisode((prev) => ({ ...prev, [episodeNumber]: configTaskId }));
          setAddEpisodePending((prev) =>
            prev && prev.episodeNumber === episodeNumber
              ? { ...prev, stage: "config", configTaskId }
              : prev,
          );
          return;
        }

        // 同步完成：直接刷新并结束流水线
        await applyEpisodeConfig(episodeNumber);
        setAddEpisodePending(null);
        useAppStore.getState().pushToast(tRef.current("workspace_add_episode_ready"), "success");
      } catch (err) {
        setAddEpisodePending(null);
        useAppStore.getState().pushToast(
          tRef.current("workspace_storyboards_failed", { message: errMsg(err) }),
          "error",
        );
      } finally {
        addEpisodeConfigStartingRef.current = false;
      }
    })();
  }, [addEpisodePending, applyEpisodeConfig, projectId, refreshProduction, tasks]);

  const handleGenerateEpisode = useCallback(
    async (episodeNumber: number) => {
      if (!projectId || isEpisodeGenerating(episodeNumber)) return;
      setSubmittingEpisode(episodeNumber);
      try {
        const result = await generateWorkspaceV2EpisodeConfig(projectId, {
          episode: episodeNumber,
        });
        if (!result.success) {
          useAppStore.getState().pushToast(
            tRef.current("workspace_storyboards_failed", {
              message: result.message || tRef.current("workspace_asset_extract_failed_fallback"),
            }),
            "error",
          );
          return;
        }

        const taskId = result.task_id?.trim();
        if (taskId) {
          handledGenerateTaskIdsRef.current.delete(taskId);
          upsertWorkspaceV2EpisodeConfigTask({
            taskId,
            projectName: projectId,
            episode: episodeNumber,
          });
          setGenerateTaskByEpisode((prev) => ({ ...prev, [episodeNumber]: taskId }));
          useAppStore
            .getState()
            .pushToast(
              result.message?.trim() || tRef.current("workspace_storyboards_queued"),
              "info",
            );
          return;
        }

        await applyEpisodeConfig(episodeNumber);
        useAppStore
          .getState()
          .pushToast(
            result.message?.trim() || tRef.current("workspace_storyboards_ready_toast"),
            "success",
          );
      } catch (err) {
        useAppStore.getState().pushToast(
          tRef.current("workspace_storyboards_failed", { message: errMsg(err) }),
          "error",
        );
      } finally {
        setSubmittingEpisode((current) => (current === episodeNumber ? null : current));
      }
    },
    [applyEpisodeConfig, isEpisodeGenerating, projectId],
  );

  const handleGenerateAll = useCallback(async () => {
    if (!projectId) return;
    // 任一侧进行中则不再触发全部生成
    if (submittingEpisode != null || Object.keys(generateTaskByEpisode).length > 0) return;
    if (
      tasks.some(
        (task) =>
          task.project_name === projectId &&
          task.task_type === "episode_config" &&
          EPISODE_CONFIG_ACTIVE.has(task.status),
      )
    ) {
      return;
    }
    setSubmittingEpisode(0);
    try {
      const result = await generateWorkspaceV2EpisodeConfig(projectId);
      if (!result.success) {
        useAppStore.getState().pushToast(
          tRef.current("workspace_storyboards_failed", {
            message: result.message || tRef.current("workspace_asset_extract_failed_fallback"),
          }),
          "error",
        );
        return;
      }

      const taskId = result.task_id?.trim();
      if (taskId) {
        handledGenerateTaskIdsRef.current.delete(taskId);
        upsertWorkspaceV2EpisodeConfigTask({ taskId, projectName: projectId });
        // 用 0 表示「全部」跟踪；isEpisodeGenerating 对无 episode 标记的任务也会命中各集
        setGenerateTaskByEpisode((prev) => ({ ...prev, 0: taskId }));
        useAppStore
          .getState()
          .pushToast(
            result.message?.trim() || tRef.current("workspace_storyboards_queued"),
            "info",
          );
        return;
      }

      await refreshProduction();
      useAppStore
        .getState()
        .pushToast(
          result.message?.trim() || tRef.current("workspace_storyboards_ready_toast"),
          "success",
        );
    } catch (err) {
      useAppStore.getState().pushToast(
        tRef.current("workspace_storyboards_failed", { message: errMsg(err) }),
        "error",
      );
    } finally {
      setSubmittingEpisode((current) => (current === 0 ? null : current));
    }
  }, [generateTaskByEpisode, projectId, refreshProduction, submittingEpisode, tasks]);

  const selectedEpisode = useMemo(
    () => episodes.find((ep) => ep.id === selectedEpisodeId) ?? episodes[0],
    [episodes, selectedEpisodeId],
  );

  const selectedEpisodeCostTotals = useMemo(() => {
    if (!selectedEpisode) {
      return { estimate: {} as CostBreakdown, actual: {} as CostBreakdown };
    }
    const segments = episodeCostSegments.get(selectedEpisode.episodeNumber) ?? [];
    return {
      estimate: sumEpisodeMediaCosts(segments, "estimate"),
      actual: sumEpisodeMediaCosts(segments, "actual"),
    };
  }, [episodeCostSegments, selectedEpisode]);

  // 首次未生成配置时 episodes 为空、无 selectedEpisode；全量生成仍用 episodeNumber=0 判断 busy
  const selectedEpisodeGenerating =
    selectedEpisode != null
      ? isEpisodeGenerating(selectedEpisode.episodeNumber)
      : showGenerateConfig && isEpisodeGenerating(0);
  // 新增剧集流水线进行中：不依赖「当前选中集是否已出现在 production」——新集常尚未入 episodes
  const selectedEpisodePipelineBusy =
    addEpisodePending != null ||
    (selectedEpisode != null && isAddEpisodePipelineBusy(selectedEpisode.episodeNumber));
  const selectedAddEpisodeStage = addEpisodePending?.stage ?? null;
  /** 项目已有配置，但当前集镜头提示词全空 → 本集待生成配置 */
  const selectedEpisodeNeedsConfig =
    !showGenerateConfig &&
    !selectedEpisodePipelineBusy &&
    episodeNeedsStoryboardConfig(selectedEpisode);
  const selectedHasStoryboards = (selectedEpisode?.shots.length ?? 0) > 0;
  const batchUploadableCount = useMemo(
    () =>
      selectedEpisode?.shots.filter((shot) => shot.storyboardImageUrl && !shot.authorized).length ??
      0,
    [selectedEpisode?.shots],
  );
  const batchStoryboardGeneratableCount = useMemo(
    () =>
      selectedEpisode?.shots.filter((shot) => {
        if (shot.storyboardImageUrl) return false;
        const segmentId = resolveStoryboardSegmentId(shot);
        if (!segmentId) return false;
        const prompt = resolveStoryboardImagePrompt(shot);
        if (typeof prompt === "string") return Boolean(prompt.trim());
        return Object.keys(prompt).length > 0;
      }).length ?? 0,
    [selectedEpisode?.shots],
  );
  const batchVideoGeneratableCount = useMemo(
    () =>
      selectedEpisode?.shots.filter((shot) => {
        if (!shot.storyboardImageUrl || !shot.authorized || shot.storyboardVideoUrl) {
          return false;
        }
        const prompt = resolveStoryboardVideoPrompt(shot);
        if (typeof prompt === "string") return Boolean(prompt.trim());
        return Object.keys(prompt).length > 0;
      }).length ?? 0,
    [selectedEpisode?.shots],
  );
  const rightPaneBusy =
    selectedEpisodeGenerating || batchAuthorizing || selectedEpisodePipelineBusy;

  const selectedShot = useMemo(() => {
    if (!selectedEpisode) return undefined;
    return (
      selectedEpisode.shots.find((shot) => shot.id === selectedShotId) ?? selectedEpisode.shots[0]
    );
  }, [selectedEpisode, selectedShotId]);

  const selectedShotSegmentCost = useMemo(() => {
    if (!selectedShot) return null;
    return segmentCostById.get(resolveStoryboardSegmentId(selectedShot)) ?? null;
  }, [segmentCostById, selectedShot]);

  useEffect(() => {
    if (!selectedEpisode) return;
    const stillValid = selectedEpisode.shots.some((shot) => shot.id === selectedShotId);
    if (!stillValid) {
      setSelectedShotId(selectedEpisode.shots[0]?.id ?? "");
    }
  }, [selectedEpisode, selectedShotId]);

  const isShotMediaGenerating = useCallback(
    (taskType: "storyboard" | "video" | "storyboard_upload", segmentId: string) =>
      tasks.some(
        (task) =>
          task.project_name === projectId &&
          task.task_type === taskType &&
          task.resource_id === segmentId &&
          SHOT_MEDIA_ACTIVE.has(task.status),
      ),
    [projectId, tasks],
  );

  const handledShotMediaTaskIdsRef = useRef(new Set<string>());
  const submittedShotMediaTaskIdsRef = useRef(new Set<string>());
  /** 分镜图/视频任务状态基线：用于检测 succeeded 跃迁并刷新 production */
  const prevShotMediaStatusRef = useRef<Map<string, TaskStatus>>(new Map());
  const shotMediaStatusSeededRef = useRef(false);

  const handleGenerateShotStoryboard = useCallback(
    async (episodeNumber: number, shot: StoryboardShot) => {
      if (!projectId) return;
      const segmentId = resolveStoryboardSegmentId(shot);
      if (!segmentId || isShotMediaGenerating("storyboard", segmentId)) return;
      const prompt = resolveStoryboardImagePrompt(shot);
      if (
        (typeof prompt === "string" && !prompt.trim()) ||
        (typeof prompt === "object" && Object.keys(prompt).length === 0)
      ) {
        useAppStore.getState().pushToast(tRef.current("media_no_prompt_yet"), "error");
        return;
      }
      const scriptFile = workspaceV2EpisodeScriptFile(episodeNumber);
      try {
        const res = await generateWorkspaceV2Storyboard(
          projectId,
          segmentId,
          prompt,
          scriptFile,
        );
        if (res.task_id?.trim()) {
          const taskId = res.task_id.trim();
          submittedShotMediaTaskIdsRef.current.add(taskId);
          upsertOptimisticShotMediaTask({
            taskId,
            projectName: projectId,
            taskType: "storyboard",
            resourceId: segmentId,
            scriptFile,
          });
        }
        useAppStore
          .getState()
          .pushToast(tRef.current("storyboard_task_submitted_toast", { id: segmentId }), "success");
      } catch (err) {
        useAppStore
          .getState()
          .pushToast(
            tRef.current("generate_storyboard_failed", { message: errMsg(err) }),
            "error",
          );
      }
    },
    [isShotMediaGenerating, projectId],
  );

  const handleGenerateShotVideo = useCallback(
    async (episodeNumber: number, shot: StoryboardShot) => {
      if (!projectId) return;
      if (!shot.storyboardImageUrl) {
        useAppStore
          .getState()
          .pushToast(tRef.current("media_generate_video_disabled_hint"), "error");
        return;
      }
      if (!shot.authorized) {
        useAppStore
          .getState()
          .pushToast(tRef.current("media_generate_video_unauthorized_hint"), "error");
        return;
      }
      const segmentId = resolveStoryboardSegmentId(shot);
      if (!segmentId || isShotMediaGenerating("video", segmentId)) return;
      const prompt = resolveStoryboardVideoPrompt(shot);
      if (
        (typeof prompt === "string" && !prompt.trim()) ||
        (typeof prompt === "object" && Object.keys(prompt).length === 0)
      ) {
        useAppStore.getState().pushToast(tRef.current("media_no_prompt_yet"), "error");
        return;
      }
      const scriptFile = workspaceV2EpisodeScriptFile(episodeNumber);
      const durationSeconds = resolveWorkspaceV2ShotDurationSec(shot) || 4;
      try {
        const res = await generateWorkspaceV2Video(
          projectId,
          segmentId,
          prompt,
          scriptFile,
          durationSeconds,
        );
        if (res.task_id?.trim()) {
          const taskId = res.task_id.trim();
          submittedShotMediaTaskIdsRef.current.add(taskId);
          upsertOptimisticShotMediaTask({
            taskId,
            projectName: projectId,
            taskType: "video",
            resourceId: segmentId,
            scriptFile,
          });
        }
        useAppStore
          .getState()
          .pushToast(tRef.current("video_task_submitted_toast", { id: segmentId }), "success");
      } catch (err) {
        useAppStore
          .getState()
          .pushToast(tRef.current("generate_video_failed", { message: errMsg(err) }), "error");
      }
    },
    [isShotMediaGenerating, projectId],
  );

  const handleUploadShotStoryboard = useCallback(
    async (shot: StoryboardShot) => {
      if (!projectId || !selectedEpisode) return;
      const segmentId = resolveStoryboardSegmentId(shot);
      if (!segmentId || shot.authorized || !shot.storyboardImageUrl) return;
      if (isShotMediaGenerating("storyboard_upload", segmentId)) return;

      useAppStore
        .getState()
        .setBlockingOverlay(tRef.current("storyboard_upload_loading", { id: segmentId }));
      try {
        await uploadWorkspaceV2Storyboard(projectId, segmentId);
        await applyEpisodeConfig(selectedEpisode.episodeNumber);
        useAppStore
          .getState()
          .pushToast(tRef.current("storyboard_upload_submitted_toast", { id: segmentId }), "success");
      } catch (err) {
        useAppStore
          .getState()
          .pushToast(tRef.current("upload_storyboard_failed", { message: errMsg(err) }), "error");
      } finally {
        useAppStore.getState().setBlockingOverlay(null);
      }
    },
    [applyEpisodeConfig, isShotMediaGenerating, projectId, selectedEpisode],
  );

  const openAddShotModal = useCallback(() => {
    if (!selectedEpisode) return;
    setAddShotIndex(String(selectedEpisode.shots.length));
    setAddShotDuration("8");
    setAddShotText("");
    setAddShotOpen(true);
  }, [selectedEpisode]);

  const openAddEpisodeModal = useCallback(() => {
    setAddEpisodeIndex(String(Math.max(1, episodes.length + 1)));
    setAddEpisodeMode("text");
    setAddEpisodeText("");
    setAddEpisodeFile(null);
    if (addEpisodeFileInputRef.current) addEpisodeFileInputRef.current.value = "";
    setAddEpisodeOpen(true);
  }, [episodes.length]);

  const addEpisodeIndexValid = useMemo(() => {
    const raw = addEpisodeIndex.trim();
    const n = Number(raw);
    return /^\d+$/.test(raw) && Number.isFinite(n) && n >= 1;
  }, [addEpisodeIndex]);

  const addEpisodeContentReady =
    addEpisodeMode === "text"
      ? addEpisodeText.trim().length > 0
      : addEpisodeFile != null;

  const canSubmitAddEpisode =
    addEpisodeIndexValid && addEpisodeContentReady && !addingEpisode;

  const handleAddEpisode = useCallback(async () => {
    if (!projectId || addingEpisode) return;
    const indexRaw = addEpisodeIndex.trim();
    const index = Number(indexRaw);
    if (!/^\d+$/.test(indexRaw) || !Number.isFinite(index) || index < 1) {
      useAppStore.getState().pushToast(tRef.current("workspace_add_episode_index_invalid"), "error");
      return;
    }

    const text = addEpisodeText.trim();
    if (addEpisodeMode === "text" && !text) {
      useAppStore
        .getState()
        .pushToast(tRef.current("workspace_add_episode_text_required"), "error");
      return;
    }
    if (addEpisodeMode === "file" && !addEpisodeFile) {
      useAppStore
        .getState()
        .pushToast(tRef.current("workspace_add_episode_file_required"), "error");
      return;
    }

    setAddingEpisode(true);
    try {
      let insertResult: unknown;
      if (addEpisodeMode === "text") {
        const titleFromText = text.split(/\r?\n/).find((line) => line.trim())?.trim() ?? "";
        insertResult = await insertWorkspaceV2Episode(projectId, {
          title: titleFromText.slice(0, 40) || `第 ${index} 集`,
          text,
          index,
        });
      } else {
        const file = addEpisodeFile!;
        const uploaded = await uploadWorkspaceV2File(projectId, "source", file);
        const filePath = uploaded.path?.trim();
        if (!filePath) {
          throw new Error("upload missing path");
        }
        insertResult = await insertWorkspaceV2Episode(projectId, {
          title: episodeTitleFromFilename(file.name),
          file_path: filePath,
          index,
        });
      }

      const taskId = resolveWorkspaceV2ScriptProcessTaskId(
        (insertResult && typeof insertResult === "object"
          ? insertResult
          : {}) as Parameters<typeof resolveWorkspaceV2ScriptProcessTaskId>[0],
      );
      if (taskId) {
        upsertOptimisticScriptProcessTask({
          taskId,
          projectName: projectId,
          resourceId: `script_process_${index}`,
        });
      }

      const placeholderTitle =
        addEpisodeMode === "text"
          ? (text.split(/\r?\n/).find((line) => line.trim())?.trim() ?? "").slice(0, 40) ||
            `第 ${index} 集`
          : addEpisodeFile
            ? episodeTitleFromFilename(addEpisodeFile.name)
            : `第 ${index} 集`;

      const pendingPayload = {
        episodeNumber: index,
        stage: "script" as const,
        ...(taskId ? { taskId } : {}),
        startedAt: Date.now(),
        placeholderTitle,
      };
      addEpisodePendingRef.current = pendingPayload;
      setAddEpisodePending(pendingPayload);

      setAddEpisodeOpen(false);
      setAddEpisodeText("");
      setAddEpisodeFile(null);
      useAppStore.getState().pushToast(tRef.current("workspace_add_episode_success"), "success");
      await refreshProduction();
      setSelectedEpisodeId(`ep-${index}`);
      setError(null);
    } catch (err) {
      setAddEpisodePending(null);
      useAppStore
        .getState()
        .pushToast(tRef.current("workspace_add_episode_failed", { message: errMsg(err) }), "error");
    } finally {
      setAddingEpisode(false);
    }
  }, [
    addEpisodeFile,
    addEpisodeIndex,
    addEpisodeMode,
    addEpisodeText,
    addingEpisode,
    projectId,
    refreshProduction,
  ]);

  const handleDeleteEpisode = useCallback(async () => {
    if (!projectId || !deleteEpisodeTarget || deletingEpisode) return;
    const episodeNumber = deleteEpisodeTarget.episodeNumber;
    const episodeId = deleteEpisodeTarget.id;
    setDeletingEpisode(true);
    try {
      await deleteWorkspaceV2Episode(projectId, episodeNumber);
      setDeleteEpisodeTarget(null);
      useAppStore.getState().pushToast(tRef.current("workspace_delete_episode_success"), "success");
      const mapped = await refreshProduction();
      setSelectedEpisodeId((prev) => {
        if (prev === episodeId) return mapped[0]?.id ?? "";
        if (prev && mapped.some((ep) => ep.id === prev)) return prev;
        return mapped[0]?.id ?? "";
      });
      if (mapped.length === 0) {
        setSelectedShotId("");
      }
      setError(null);
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(tRef.current("workspace_delete_episode_failed", { message: errMsg(err) }), "error");
    } finally {
      setDeletingEpisode(false);
    }
  }, [deleteEpisodeTarget, deletingEpisode, projectId, refreshProduction]);

  const handleAddShot = useCallback(async () => {
    if (!projectId || !selectedEpisode || addingShot || addShotPending) return;
    const indexRaw = addShotIndex.trim();
    const index = Number(indexRaw);
    if (!/^\d+$/.test(indexRaw) || !Number.isFinite(index) || index < 0) {
      useAppStore.getState().pushToast(tRef.current("workspace_add_shot_index_invalid"), "error");
      return;
    }
    const durationRaw = addShotDuration.trim();
    const durationSeconds = Number(durationRaw);
    if (
      !/^\d+$/.test(durationRaw) ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds <= 0
    ) {
      useAppStore
        .getState()
        .pushToast(tRef.current("workspace_add_shot_duration_invalid"), "error");
      return;
    }
    const text = addShotText.trim();
    if (!text) {
      useAppStore.getState().pushToast(tRef.current("workspace_add_shot_text_required"), "error");
      return;
    }
    setAddingShot(true);
    // 一点确认即上锁，提交中与两阶段 loading 均不可关弹框
    addShotPipelineLockRef.current = true;
    try {
      const episodeNumber = selectedEpisode.episodeNumber;
      const result = await addWorkspaceV2Storyboard(projectId, episodeNumber, {
        index,
        text,
        duration_seconds: durationSeconds,
      });

      const { sceneId, contentTaskId, configTaskId } = resolveAddStoryboardResponse(result);
      if (!contentTaskId || !configTaskId) {
        addShotPipelineLockRef.current = false;
        useAppStore.getState().pushToast(
          tRef.current("workspace_add_shot_failed", {
            message:
              (result as { message?: string }).message?.trim() ||
              tRef.current("workspace_asset_extract_failed_fallback"),
          }),
          "error",
        );
        return;
      }

      handledAddShotTaskIdsRef.current.delete(`content:${contentTaskId}`);
      handledAddShotTaskIdsRef.current.delete(`config:${configTaskId}`);
      handledAddShotTaskIdsRef.current.delete(`finish:${configTaskId}:${contentTaskId}`);

      setAddShotPending({
        episodeNumber,
        sceneId,
        stage: "content",
        contentTaskId,
        configTaskId,
      });
      setAddShotOpen(true);
    } catch (err) {
      addShotPipelineLockRef.current = false;
      useAppStore
        .getState()
        .pushToast(tRef.current("workspace_add_shot_failed", { message: errMsg(err) }), "error");
    } finally {
      setAddingShot(false);
    }
  }, [
    addShotDuration,
    addShotIndex,
    addShotPending,
    addShotText,
    addingShot,
    projectId,
    refreshProduction,
    selectedEpisode,
  ]);

  const handleDeleteShot = useCallback(
    async (shot: StoryboardShot) => {
      if (!projectId || !selectedEpisode || deletingShot) return false;
      const sceneId = resolveStoryboardSegmentId(shot);
      if (!sceneId) return false;
      setDeletingShot(true);
      try {
        await deleteWorkspaceV2Storyboard(
          projectId,
          selectedEpisode.episodeNumber,
          sceneId,
        );
        await applyEpisodeConfig(selectedEpisode.episodeNumber);
        useAppStore.getState().pushToast(tRef.current("workspace_delete_shot_success"), "success");
        return true;
      } catch (err) {
        useAppStore
          .getState()
          .pushToast(
            tRef.current("workspace_delete_shot_failed", { message: errMsg(err) }),
            "error",
          );
        return false;
      } finally {
        setDeletingShot(false);
      }
    },
    [applyEpisodeConfig, deletingShot, projectId, selectedEpisode],
  );

  const handleUploadEpisodeStoryboardsBatch = useCallback(async () => {
    if (!projectId || !selectedEpisode || batchAuthorizing) return;
    const segmentIds = selectedEpisode.shots
      .filter((shot) => shot.storyboardImageUrl && !shot.authorized)
      .map((shot) => resolveStoryboardSegmentId(shot))
      .filter(Boolean);
    if (segmentIds.length === 0) return;

    setBatchAuthorizingCount(segmentIds.length);
    setBatchAuthorizing(true);
    try {
      const res = await uploadWorkspaceV2StoryboardsBatch(projectId, segmentIds);
      await applyEpisodeConfig(selectedEpisode.episodeNumber);
      const backendMessage = res.message?.trim();
      useAppStore.getState().pushToast(
        backendMessage ||
          tRef.current("storyboard_upload_batch_submitted_toast", {
            count: segmentIds.length,
          }),
        "success",
      );
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(tRef.current("upload_storyboard_failed", { message: errMsg(err) }), "error");
    } finally {
      setBatchAuthorizing(false);
      setBatchAuthorizingCount(0);
    }
  }, [applyEpisodeConfig, batchAuthorizing, projectId, selectedEpisode]);

  /** 批量生成分镜图 — POST .../generate/storyboard-batch */
  const handleGenerateEpisodeStoryboardsBatch = useCallback(async () => {
    if (!projectId || !selectedEpisode || batchGeneratingStoryboards) return;
    const episodeNumber = selectedEpisode.episodeNumber;
    const scriptFile = workspaceV2EpisodeScriptFile(episodeNumber);
    const segmentIds = selectedEpisode.shots
      .filter((shot) => {
        if (shot.storyboardImageUrl) return false;
        const segmentId = resolveStoryboardSegmentId(shot);
        if (!segmentId || isShotMediaGenerating("storyboard", segmentId)) return false;
        const prompt = resolveStoryboardImagePrompt(shot);
        if (typeof prompt === "string") return Boolean(prompt.trim());
        return Object.keys(prompt).length > 0;
      })
      .map((shot) => resolveStoryboardSegmentId(shot))
      .filter(Boolean);

    if (segmentIds.length === 0) {
      useAppStore.getState().pushToast(tRef.current("storyboard_batch_none_missing_toast"), "success");
      return;
    }

    setBatchGeneratingStoryboards(true);
    try {
      const res = await generateWorkspaceV2StoryboardBatch(projectId, {
        episode: episodeNumber,
        script_file: scriptFile,
        segment_ids: segmentIds,
      });
      const taskIds = resolveWorkspaceV2BatchGenerateTaskIds(res);
      for (let i = 0; i < taskIds.length; i++) {
        const taskId = taskIds[i]!;
        const resourceId = segmentIds[i] ?? segmentIds[0]!;
        submittedShotMediaTaskIdsRef.current.add(taskId);
        upsertOptimisticShotMediaTask({
          taskId,
          projectName: projectId,
          taskType: "storyboard",
          resourceId,
          scriptFile,
        });
      }
      useAppStore.getState().pushToast(
        tRef.current("storyboard_batch_submitted_toast", {
          count: taskIds.length || segmentIds.length,
        }),
        "success",
      );
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(
          tRef.current("generate_storyboard_failed", { message: errMsg(err) }),
          "error",
        );
    } finally {
      setBatchGeneratingStoryboards(false);
    }
  }, [
    batchGeneratingStoryboards,
    isShotMediaGenerating,
    projectId,
    selectedEpisode,
  ]);

  /** 批量生成视频 — POST .../generate/video-batch */
  const handleGenerateEpisodeVideosBatch = useCallback(async () => {
    if (!projectId || !selectedEpisode || batchGeneratingVideos) return;
    const episodeNumber = selectedEpisode.episodeNumber;
    const scriptFile = workspaceV2EpisodeScriptFile(episodeNumber);
    const targets = selectedEpisode.shots.filter((shot) => {
      if (!shot.storyboardImageUrl || !shot.authorized || shot.storyboardVideoUrl) {
        return false;
      }
      const segmentId = resolveStoryboardSegmentId(shot);
      if (!segmentId || isShotMediaGenerating("video", segmentId)) return false;
      const prompt = resolveStoryboardVideoPrompt(shot);
      if (typeof prompt === "string") return Boolean(prompt.trim());
      return Object.keys(prompt).length > 0;
    });
    const segmentIds = targets
      .map((shot) => resolveStoryboardSegmentId(shot))
      .filter(Boolean);

    if (segmentIds.length === 0) {
      useAppStore.getState().pushToast(tRef.current("video_batch_none_missing_toast"), "success");
      return;
    }

    setBatchGeneratingVideos(true);
    try {
      const res = await generateWorkspaceV2VideoBatch(projectId, {
        episode: episodeNumber,
        script_file: scriptFile,
        segment_ids: segmentIds,
      });
      const taskIds = resolveWorkspaceV2BatchGenerateTaskIds(res);
      for (let i = 0; i < taskIds.length; i++) {
        const taskId = taskIds[i]!;
        const resourceId = segmentIds[i] ?? segmentIds[0]!;
        submittedShotMediaTaskIdsRef.current.add(taskId);
        upsertOptimisticShotMediaTask({
          taskId,
          projectName: projectId,
          taskType: "video",
          resourceId,
          scriptFile,
        });
      }
      useAppStore.getState().pushToast(
        tRef.current("video_batch_submitted_toast", {
          count: taskIds.length || segmentIds.length,
        }),
        "success",
      );
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(tRef.current("generate_video_failed", { message: errMsg(err) }), "error");
    } finally {
      setBatchGeneratingVideos(false);
    }
  }, [batchGeneratingVideos, isShotMediaGenerating, projectId, selectedEpisode]);

  // 分镜图/视频任务成功后刷新 production（不依赖本面板是否记下了 task_id，避免批量返回 id 与轮询不一致）
  useEffect(() => {
    if (!projectId || loading) return;

    const prev = prevShotMediaStatusRef.current;
    const next = new Map<string, TaskStatus>();
    let shouldRefresh = false;
    let episodeHint: number | null = null;

    for (const task of tasks) {
      if (task.project_name !== projectId) continue;
      if (task.task_type !== "storyboard" && task.task_type !== "video") continue;

      const before = prev.get(task.task_id);
      next.set(task.task_id, task.status);

      if (!shotMediaStatusSeededRef.current) {
        // 首屏定基线：已有的 succeeded 不算跃迁，避免刷新页面误打第二次 production
        if (task.status === "succeeded") {
          handledShotMediaTaskIdsRef.current.add(task.task_id);
        }
        continue;
      }
      if (task.status !== "succeeded" || before === "succeeded") continue;
      if (handledShotMediaTaskIdsRef.current.has(task.task_id)) continue;

      handledShotMediaTaskIdsRef.current.add(task.task_id);
      shouldRefresh = true;
      const ep = episodeNumberFromShotMediaTask(task);
      if (ep != null) episodeHint = ep;
    }

    prevShotMediaStatusRef.current = next;

    if (!shotMediaStatusSeededRef.current) {
      shotMediaStatusSeededRef.current = true;
      return;
    }

    if (!shouldRefresh) return;

    const refresh =
      episodeHint != null ? applyEpisodeConfig(episodeHint) : refreshProduction();
    void refresh.catch((err: unknown) => {
      useAppStore.getState().pushToast(errMsg(err), "error");
    });
    void refreshCostEstimate();
  }, [applyEpisodeConfig, loading, projectId, refreshCostEstimate, refreshProduction, tasks]);

  // 暂时隐藏「生成全部分镜」入口，逻辑保留便于后续恢复
  const showGenerateAllStoryboards = false;
  const generateAllButton = showGenerateAllStoryboards ? (
    <Button
      type="button"
      size="sm"
      onClick={() => void handleGenerateAll()}
      disabled={loading || Boolean(error) || submittingEpisode != null}
      title={
        submittingEpisode != null
          ? t("workspace_generating_storyboards")
          : t("workspace_generate_all_storyboards")
      }
    >
      <Clapperboard
        className={cn("h-3.5 w-3.5", submittingEpisode != null && "animate-pulse")}
        strokeWidth={2.4}
      />
      {submittingEpisode != null
        ? t("workspace_generating_storyboards")
        : t("workspace_generate_all_storyboards")}
    </Button>
  ) : null;

  // 「生成分镜配置」改到内容区蒙版内；标题栏仅保留「生成全部分镜」（当前隐藏）
  const titleAction = generateAllButton ? (
    <div className="flex items-center gap-2">{generateAllButton}</div>
  ) : undefined;

  const addEpisodeSidebarButton = (
    <button
      type="button"
      onClick={openAddEpisodeModal}
      disabled={loading || addingEpisode || deletingEpisode || batchAuthorizing}
      title={t("workspace_add_episode")}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors",
        "hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      <Plus className="h-3 w-3" strokeWidth={2.4} />
      {t("workspace_add_episode")}
    </button>
  );

  const episodeCrudModals = (
    <>
      <ConfirmDialog
        open={deleteEpisodeTarget != null}
        title={t("workspace_delete_episode_confirm_title")}
        description={
          deleteEpisodeTarget
            ? t("workspace_delete_episode_confirm_desc", {
                name: `${formatStoryboardEpisodeCode(deleteEpisodeTarget.episodeNumber)} ${episodeDisplayName(deleteEpisodeTarget)}`,
              })
            : undefined
        }
        confirmLabel={t("workspace_delete_episode_confirm")}
        cancelLabel={t("common:cancel")}
        tone="danger"
        loading={deletingEpisode}
        onCancel={() => {
          if (deletingEpisode) return;
          setDeleteEpisodeTarget(null);
        }}
        onConfirm={() => {
          void handleDeleteEpisode();
        }}
      />

      <GlassModal
        open={addEpisodeOpen}
        onClose={() => {
          if (addingEpisode) return;
          setAddEpisodeOpen(false);
        }}
        labelledBy={addEpisodeTitleId}
        widthClassName="w-[480px]"
        panelClassName={cn(WS2_MODAL_PANEL_CLASS, "flex h-[500px] flex-col overflow-hidden")}
        closeOnBackdrop={!addingEpisode}
        closeOnEscape={!addingEpisode}
      >
        <div
          className={cn(
            WS2_SECTION_HEADER_CLASS,
            "flex shrink-0 items-center justify-between gap-3 px-5 py-3.5",
          )}
        >
          <h3 id={addEpisodeTitleId} className="text-[15px] font-semibold text-foreground">
            {t("workspace_add_episode_title")}
          </h3>
          <ModalCloseButton
            onClick={() => setAddEpisodeOpen(false)}
            disabled={addingEpisode}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
          <label className="flex shrink-0 flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("workspace_add_episode_index_label")}
            </span>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={addEpisodeIndex}
              disabled={addingEpisode}
              onChange={(e) => setAddEpisodeIndex(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/12 bg-black/35 px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
            />
          </label>

          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="flex shrink-0 items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("workspace_add_episode_content_label")}
              </span>
              <Tabs
                value={addEpisodeMode}
                onValueChange={(value) => {
                  if (addingEpisode) return;
                  if (value === "text" || value === "file") setAddEpisodeMode(value);
                }}
              >
                <TabsList
                  aria-label={t("workspace_add_episode_mode_label")}
                  className="h-auto gap-0.5 rounded-lg p-0.5"
                >
                  <TabsTrigger
                    value="text"
                    disabled={addingEpisode}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-[11px]",
                      WS2_ASSET_TAB_ACTIVE_BG_CLASS,
                    )}
                  >
                    {t("workspace_add_episode_mode_text")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="file"
                    disabled={addingEpisode}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-[11px]",
                      WS2_ASSET_TAB_ACTIVE_BG_CLASS,
                    )}
                  >
                    {t("workspace_add_episode_mode_file")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {addEpisodeMode === "text" ? (
              <textarea
                value={addEpisodeText}
                disabled={addingEpisode}
                onChange={(e) => setAddEpisodeText(e.target.value)}
                placeholder={t("workspace_add_episode_text_placeholder")}
                className="min-h-[180px] w-full flex-1 resize-none overflow-y-auto rounded-lg border border-white/12 bg-black/35 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
              />
            ) : (
              <>
                <input
                  ref={addEpisodeFileInputRef}
                  type="file"
                  accept={SOURCE_FILE_ACCEPT}
                  className="hidden"
                  disabled={addingEpisode}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setAddEpisodeFile(file);
                  }}
                />
                <button
                  type="button"
                  disabled={addingEpisode}
                  onClick={() => addEpisodeFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (addingEpisode) return;
                    const file = e.dataTransfer.files?.[0] ?? null;
                    if (file) setAddEpisodeFile(file);
                  }}
                  className={cn(
                    "flex min-h-[180px] flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/25 px-4 text-center transition-colors",
                    "hover:border-cyan-400/35 hover:bg-cyan-500/5",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={2.2} />
                  {addEpisodeFile ? (
                    <span className="max-w-full truncate text-sm text-foreground">
                      {t("workspace_add_episode_file_selected", { name: addEpisodeFile.name })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("workspace_add_episode_file_placeholder")}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground/70">
                    {t("workspace_add_episode_file_hint")}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-white/6 px-5 py-3.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={addingEpisode}
            onClick={() => setAddEpisodeOpen(false)}
            className="motion-safe:hover:translate-y-0"
          >
            {t("common:cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmitAddEpisode}
            onClick={() => void handleAddEpisode()}
            className="gap-1.5 motion-safe:hover:translate-y-0"
          >
            {addingEpisode ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
            ) : (
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            {t("workspace_add_episode_submit")}
          </Button>
        </div>
      </GlassModal>
    </>
  );

  if (loading) {
    return (
      <Ws2NodeContentLayout
        title={WORKSPACE_V2_PROGRESS_LABELS.production}
        titleAction={titleAction}
        plainBody
        scrollBody={false}
        bodyInnerClassName="p-0"
      >
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          加载分集中…
        </div>
      </Ws2NodeContentLayout>
    );
  }

  // production.episodes 为空 → showGenerateConfig=true，应出「生成分镜配置」蒙层，不能当成暂无数据
  if (error || (episodes.length === 0 && !showGenerateConfig)) {
    return (
      <>
        <Ws2NodeContentLayout
          title={WORKSPACE_V2_PROGRESS_LABELS.production}
          titleAction={titleAction}
          plainBody
          scrollBody={false}
          bodyInnerClassName="p-0"
        >
          <div className="flex h-full min-h-0 gap-2 overflow-hidden">
            <aside className="flex w-[240px] shrink-0 flex-col overflow-hidden border-r border-border/50 pl-0.5 pr-2.5">
              <div className="flex shrink-0 items-center justify-between gap-2 px-1.5 pb-1.5 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("workspace_episode_list_title")}
                </span>
                {addEpisodeSidebarButton}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-0.5" />
            </aside>
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <Ws2NoDataPlaceholder />
            </div>
          </div>
        </Ws2NodeContentLayout>
        {episodeCrudModals}
      </>
    );
  }

  return (
    <>
      <Ws2NodeContentLayout
        title={WORKSPACE_V2_PROGRESS_LABELS.production}
        titleAction={titleAction}
        plainBody
        scrollBody={false}
        bodyInnerClassName="p-0"
      >
        <div className="relative flex h-full min-h-0 gap-2 overflow-hidden">
          {showGenerateConfig && !selectedEpisodePipelineBusy ? (
            <StoryboardConfigRequiredOverlay
              title={t("workspace_storyboard_config_required_title")}
              hint={
                selectedEpisodeGenerating
                  ? t("workspace_storyboards_generating_hint")
                  : t("workspace_storyboard_config_required_hint")
              }
              actionLabel={t("workspace_generate_storyboard")}
              generatingLabel={t("workspace_generating_storyboards")}
              generating={selectedEpisodeGenerating}
              disabled={loading || Boolean(error)}
              reduceMotion={reduceMotion}
              onGenerate={() => {
                void handleGenerateAll();
              }}
            />
          ) : null}
          <aside className="flex w-[240px] shrink-0 flex-col overflow-hidden border-r border-border/50 pl-0.5 pr-2.5">
            <div className="flex shrink-0 items-center justify-between gap-2 px-1.5 pb-1.5 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("workspace_episode_list_title")}
              </span>
              {addEpisodeSidebarButton}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-0.5">
              {episodes.map((episode) => (
                <StoryboardEpisodeListItem
                  key={episode.id}
                  episode={episode}
                  selected={episode.id === selectedEpisode?.id}
                  deleting={
                    deletingEpisode && deleteEpisodeTarget?.id === episode.id
                  }
                  disabled={batchAuthorizing}
                  onSelect={() => {
                    if (batchAuthorizing) return;
                    setSelectedEpisodeId(episode.id);
                  }}
                  onDelete={() => {
                    if (batchAuthorizing) return;
                    setDeleteEpisodeTarget(episode);
                  }}
                />
              ))}
            </div>
          </aside>

          {/* 右侧分镜内容区；拉详情 / 生成本集 / 批量授权时叠 loading */}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
            {selectedEpisodePipelineBusy ? (
              <AddEpisodePipelineOverlay
                stage={selectedAddEpisodeStage ?? "script"}
                reduceMotion={reduceMotion}
                title={t("workspace_add_episode_pipeline_title")}
                scriptLabel={t("workspace_add_episode_step_script")}
                scriptHint={t("workspace_add_episode_step_script_hint")}
                configLabel={t("workspace_add_episode_step_config")}
                configHint={t("workspace_add_episode_step_config_hint")}
              />
            ) : selectedEpisodeNeedsConfig ? (
              <StoryboardConfigRequiredOverlay
                title={t("workspace_storyboard_config_required_title")}
                hint={
                  selectedEpisodeGenerating
                    ? t("workspace_storyboard_episode_generating_hint")
                    : t("workspace_storyboard_config_required_hint")
                }
                actionLabel={t("workspace_generate_storyboard")}
                generatingLabel={t("workspace_generating_storyboards")}
                generating={selectedEpisodeGenerating}
                disabled={!selectedEpisode || loading || Boolean(error)}
                reduceMotion={reduceMotion}
                onGenerate={() => {
                  if (!selectedEpisode) return;
                  void handleGenerateEpisode(selectedEpisode.episodeNumber);
                }}
              />
            ) : rightPaneBusy && !showGenerateConfig && !selectedEpisodePipelineBusy ? (
              <StoryboardGeneratingOverlay
                title={
                  batchAuthorizing
                    ? t("storyboard_upload_batch_loading", {
                        count: batchAuthorizingCount,
                      })
                    : selectedEpisodeGenerating
                      ? t("workspace_generating_storyboards")
                      : t("workspace_storyboard_config_loading")
                }
                message={
                  batchAuthorizing
                    ? t("storyboard_upload_batch_loading_hint")
                    : selectedEpisodeGenerating
                      ? t("workspace_storyboard_episode_generating_hint")
                      : t("workspace_storyboard_config_loading_hint")
                }
                icon={batchAuthorizing ? "shield" : "clapperboard"}
                reduceMotion={reduceMotion}
              />
            ) : null}

            <section className="shrink-0 border-b border-border/50 pb-1.5">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex min-w-0 items-end gap-2">
                  <h3 className="min-w-0 shrink truncate text-lg font-semibold leading-none text-foreground">
                    {selectedEpisode ? formatStoryboardEpisodeHeading(selectedEpisode) : null}
                  </h3>
                  {selectedEpisode ? (
                    <EpisodeCostSummary
                      estimate={selectedEpisodeCostTotals.estimate}
                      actual={selectedEpisodeCostTotals.actual}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1" aria-hidden />
                {selectedEpisode ? (
                  <>
                    {SHOW_STORYBOARD_SHOT_CRUD || selectedHasStoryboards ? (
                      <>
                        <Button
                          ref={moreActionsAnchorRef}
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-8 w-8 shrink-0 px-0 motion-safe:hover:translate-y-0",
                            moreActionsOpen && "border-cyan-400/40 ring-2 ring-cyan-400/15",
                          )}
                          aria-label={t("more_actions")}
                          aria-haspopup="menu"
                          aria-expanded={moreActionsOpen}
                          title={t("more_actions")}
                          disabled={loading || rightPaneBusy || Boolean(error)}
                          onClick={() => setMoreActionsOpen((prev) => !prev)}
                        >
                          <MoreVertical className="h-4 w-4" strokeWidth={2.4} />
                        </Button>
                        <Popover
                          open={moreActionsOpen}
                          onClose={() => setMoreActionsOpen(false)}
                          anchorRef={moreActionsAnchorRef}
                          align="end"
                          sideOffset={6}
                          width="min-w-0"
                          className={cn(WS2_HOME_SELECT_PANEL_CLASS, "w-auto min-w-[11.5rem]")}
                        >
                          <ul role="menu" aria-label={t("more_actions")} className="py-0.5">
                            {SHOW_STORYBOARD_SHOT_CRUD ? (
                              <li role="none">
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={addingShot}
                                  onClick={() => {
                                    setMoreActionsOpen(false);
                                    openAddShotModal();
                                  }}
                                  className={cn(
                                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                                    addingShot
                                      ? "cursor-not-allowed text-white/30"
                                      : "text-white/80 hover:bg-white/5",
                                  )}
                                >
                                  {addingShot ? (
                                    <Loader2
                                      className="h-3.5 w-3.5 shrink-0 animate-spin"
                                      strokeWidth={2.4}
                                    />
                                  ) : (
                                    <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                                  )}
                                  {t("workspace_add_shot")}
                                </button>
                              </li>
                            ) : null}
                            <li role="none">
                              <button
                                type="button"
                                role="menuitem"
                                disabled={
                                  batchGeneratingStoryboards ||
                                  batchStoryboardGeneratableCount === 0
                                }
                                onClick={() => {
                                  setMoreActionsOpen(false);
                                  void handleGenerateEpisodeStoryboardsBatch();
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                                  batchGeneratingStoryboards ||
                                    batchStoryboardGeneratableCount === 0
                                    ? "cursor-not-allowed text-white/30"
                                    : "text-white/80 hover:bg-white/5",
                                )}
                              >
                                {batchGeneratingStoryboards ? (
                                  <Loader2
                                    className="h-3.5 w-3.5 shrink-0 animate-spin"
                                    strokeWidth={2.4}
                                  />
                                ) : (
                                  <ImageIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                                )}
                                {t("batch_generate_storyboards")}
                              </button>
                            </li>
                            <li role="none">
                              <button
                                type="button"
                                role="menuitem"
                                disabled={batchUploadableCount === 0 || batchAuthorizing}
                                onClick={() => {
                                  setMoreActionsOpen(false);
                                  setBatchUploadConfirmOpen(true);
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                                  batchUploadableCount === 0 || batchAuthorizing
                                    ? "cursor-not-allowed text-white/30"
                                    : "text-white/80 hover:bg-white/5",
                                )}
                              >
                                {batchAuthorizing ? (
                                  <Loader2
                                    className="h-3.5 w-3.5 shrink-0 animate-spin"
                                    strokeWidth={2.4}
                                  />
                                ) : (
                                  <ShieldCheck
                                    className="h-3.5 w-3.5 shrink-0"
                                    strokeWidth={2.4}
                                  />
                                )}
                                {t("batch_upload_storyboards")}
                              </button>
                            </li>
                            <li role="none">
                              <button
                                type="button"
                                role="menuitem"
                                disabled={
                                  batchGeneratingVideos || batchVideoGeneratableCount === 0
                                }
                                onClick={() => {
                                  setMoreActionsOpen(false);
                                  void handleGenerateEpisodeVideosBatch();
                                }}
                                className={cn(
                                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                                  batchGeneratingVideos || batchVideoGeneratableCount === 0
                                    ? "cursor-not-allowed text-white/30"
                                    : "text-white/80 hover:bg-white/5",
                                )}
                              >
                                {batchGeneratingVideos ? (
                                  <Loader2
                                    className="h-3.5 w-3.5 shrink-0 animate-spin"
                                    strokeWidth={2.4}
                                  />
                                ) : (
                                  <Film className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />
                                )}
                                {t("batch_generate_videos")}
                              </button>
                            </li>
                          </ul>
                        </Popover>
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
              {selectedEpisode?.shots.length ? (
                <div
                  className="flex gap-2 overflow-x-auto pb-0.5 sm:gap-2.5"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {selectedEpisode.shots.map((shot, shotIndex) => (
                    <StoryboardShotCard
                      key={`${selectedEpisode.episodeNumber}-${shot.sceneId || shot.id}-${shotIndex}`}
                      episodeNumber={selectedEpisode.episodeNumber}
                      shot={shot}
                      selected={shot.id === selectedShot?.id}
                      configuring={
                        addShotPending != null &&
                        addShotPending.episodeNumber === selectedEpisode.episodeNumber &&
                        (resolveStoryboardSegmentId(shot) === addShotPending.sceneId ||
                          shot.id === addShotPending.sceneId ||
                          shot.sceneId === addShotPending.sceneId)
                      }
                      onSelect={() => {
                        if (rightPaneBusy) return;
                        setSelectedShotId(shot.id);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">该集暂无分镜</p>
              )}
            </section>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden pb-2 pt-1">
              {selectedShot && selectedEpisode ? (
                <StoryboardShotDetail
                  key={selectedShot.id}
                  episodeNumber={selectedEpisode.episodeNumber}
                  projectId={projectId}
                  shot={selectedShot}
                  segmentCost={selectedShotSegmentCost}
                  systemPromptTemplates={selectedShot.systemPromptTemplates}
                  generatingStoryboard={isShotMediaGenerating(
                    "storyboard",
                    resolveStoryboardSegmentId(selectedShot),
                  )}
                  generatingVideo={isShotMediaGenerating(
                    "video",
                    resolveStoryboardSegmentId(selectedShot),
                  )}
                  uploadingStoryboard={isShotMediaGenerating(
                    "storyboard_upload",
                    resolveStoryboardSegmentId(selectedShot),
                  )}
                  deletingStoryboard={deletingShot}
                  onGenerateStoryboard={() => {
                    void handleGenerateShotStoryboard(
                      selectedEpisode.episodeNumber,
                      selectedShot,
                    );
                  }}
                  onGenerateVideo={() => {
                    void handleGenerateShotVideo(selectedEpisode.episodeNumber, selectedShot);
                  }}
                  onUploadStoryboard={() => {
                    void handleUploadShotStoryboard(selectedShot);
                  }}
                  onDeleteStoryboard={
                    SHOW_STORYBOARD_SHOT_CRUD
                      ? () => handleDeleteShot(selectedShot)
                      : undefined
                  }
                  onPromptSaved={async () => {
                    await applyEpisodeConfig(selectedEpisode.episodeNumber);
                  }}
                  onSystemPromptTemplatesSaved={(next) => {
                    const episodeId = selectedEpisode.id;
                    const shotId = selectedShot.id;
                    setEpisodes((prev) =>
                      prev.map((ep) =>
                        ep.id !== episodeId
                          ? ep
                          : {
                              ...ep,
                              shots: ep.shots.map((shot) =>
                                shot.id === shotId
                                  ? { ...shot, systemPromptTemplates: next }
                                  : shot,
                              ),
                            },
                      ),
                    );
                  }}
                />
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <Ws2NoDataPlaceholder />
                </div>
              )}
            </section>
          </div>
        </div>
      </Ws2NodeContentLayout>

      <ConfirmDialog
        open={batchUploadConfirmOpen}
        title={t("batch_upload_storyboards_confirm_title")}
        description={t("upload_storyboards_confirm_description")}
        confirmLabel={t("upload_storyboards_confirm")}
        cancelLabel={t("common:cancel")}
        onCancel={() => setBatchUploadConfirmOpen(false)}
        onConfirm={() => {
          setBatchUploadConfirmOpen(false);
          void handleUploadEpisodeStoryboardsBatch();
        }}
      />

      {episodeCrudModals}

      <GlassModal
        open={addShotOpen}
        onClose={requestCloseAddShotModal}
        labelledBy={addShotTitleId}
        widthClassName="w-[480px]"
        panelClassName={cn(WS2_MODAL_PANEL_CLASS, "flex h-[460px] flex-col overflow-hidden")}
        closeOnBackdrop={!addingShot && !addShotPending}
        closeOnEscape={!addingShot && !addShotPending}
      >
        <div
          className={cn(
            WS2_SECTION_HEADER_CLASS,
            "flex shrink-0 items-center justify-between gap-3 px-5 py-3.5",
          )}
        >
          <h3 id={addShotTitleId} className="text-[15px] font-semibold text-foreground">
            {t("workspace_add_shot_title")}
          </h3>
          {addShotPending || addingShot ? (
            <span className="h-7 w-7" aria-hidden />
          ) : (
            <ModalCloseButton onClick={requestCloseAddShotModal} />
          )}
        </div>
        {addShotPending ? (
          <div className="flex min-h-0 flex-1 items-center justify-center px-5 py-4">
            <PipelineStepsCard
              stage={addShotPending.stage}
              reduceMotion={reduceMotion}
              title={t("workspace_add_shot_pipeline_title")}
              steps={[
                {
                  id: "content",
                  label: t("workspace_add_shot_step_content"),
                  hint: t("workspace_add_shot_step_content_hint"),
                },
                {
                  id: "config",
                  label: t("workspace_add_shot_step_config"),
                  hint: t("workspace_add_shot_step_config_hint"),
                },
              ]}
            />
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-1 flex-col gap-4 px-5 py-4">
              <div className="grid shrink-0 grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("workspace_add_shot_index_label")}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={addShotIndex}
                    disabled={addingShot}
                    onChange={(e) => setAddShotIndex(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/12 bg-black/35 px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("workspace_add_shot_duration_label")}
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={addShotDuration}
                    disabled={addingShot}
                    onChange={(e) => setAddShotDuration(e.target.value)}
                    className="h-9 w-full rounded-lg border border-white/12 bg-black/35 px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                  />
                </label>
              </div>
              <label className="flex min-h-0 flex-1 flex-col gap-1.5">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("workspace_add_shot_text_label")}
                </span>
                <textarea
                  value={addShotText}
                  disabled={addingShot}
                  onChange={(e) => setAddShotText(e.target.value)}
                  placeholder={t("workspace_add_shot_text_placeholder")}
                  className="h-[148px] w-full resize-none overflow-y-auto rounded-lg border border-white/12 bg-black/35 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                />
              </label>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-white/6 px-5 py-3.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={addingShot}
                onClick={requestCloseAddShotModal}
                className="motion-safe:hover:translate-y-0"
              >
                {t("common:cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={addingShot}
                onClick={() => void handleAddShot()}
                className="gap-1.5 motion-safe:hover:translate-y-0"
              >
                {addingShot ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
                ) : (
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                )}
                {t("workspace_add_shot_submit")}
              </Button>
            </div>
          </>
        )}
      </GlassModal>
    </>
  );
}
