import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Pencil, ScrollText } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  resolveWorkspaceV2EpisodeCharacters,
  resolveWorkspaceV2EpisodeName,
  resolveWorkspaceV2ScriptEpisodeMetadata,
  type WorkspaceV2ProcessedScene,
  type WorkspaceV2ScriptEpisode,
} from "@/api/workspace-v2";
import { Button } from "@/components/ui/button";
import { GlassModal } from "@/components/ui/GlassModal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover } from "@/components/ui/Popover";
import {
  WS2_CARD_CLASS,
  WS2_CARD_FOOTER_CLASS,
  WS2_MODAL_PANEL_CLASS,
  WS2_SECTION_HEADER_CLASS,
  WS2_SECTION_HEADER_TITLE_CLS,
} from "../workspace-v2-theme";
import {
  ProjectScriptSceneDetail,
  type ProjectScriptSceneDetailEditState,
  type ProjectScriptSceneDetailHandle,
  type ScriptDetailEditMode,
} from "./ProjectScriptSceneDetail";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/date-format";

interface ProjectScriptEpisodesSectionProps {
  episodes: WorkspaceV2ScriptEpisode[];
  projectId: string;
  loading?: boolean;
  /** loading 态主文案；缺省用「获取数据中...」 */
  loadingTitle?: string;
  /** loading 态提示 */
  loadingMessage?: string;
  /** 场景保存成功后刷新剧本列表 */
  onSceneSaved?: () => void | Promise<void>;
}

interface EpisodeDetailSnapshot {
  name: string;
  episodeNumber: number;
  episode: WorkspaceV2ScriptEpisode;
  scenes: WorkspaceV2ProcessedScene[];
}

/** 打开后短时忽略关闭，避免同一次点击穿透到 backdrop / floating dismiss 立刻关掉 */
const MODAL_CLOSE_GUARD_MS = 350;

const EPISODE_TABLE_ROW_HEIGHT = 56;

/** 集名称 + 人物 + metadata 字段 */
const EPISODE_TABLE_GRID =
  "grid grid-cols-[minmax(150px,1.3fr)_minmax(220px,1.8fr)_minmax(130px,1fr)_minmax(80px,0.6fr)_minmax(130px,1fr)_minmax(80px,0.6fr)_minmax(96px,0.7fr)]";

const EPISODE_TABLE_CELL = "px-4 py-3";

const EPISODE_TABLE_HEAD_CELL =
  "bg-card py-2.5 text-left text-[11px] font-semibold text-muted-foreground";

const EPISODE_TABLE_BODY_CELL =
  "flex items-center text-[13px] leading-relaxed text-muted-foreground";

const EMPTY_CELL = "—";
const COLUMN_COUNT = 7;

/** 人物名 → 稳定配色，同名跨行同色 */
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

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-sm bg-white/6", className)}>
      <div className="absolute inset-0 animate-shimmer" aria-hidden />
    </div>
  );
}

function formatEpisodeStatus(
  status: string | null,
  t: (key: string) => string,
): string {
  if (!status) return EMPTY_CELL;
  if (status === "draft") return t("workspace_script_episode_status_draft");
  return status;
}

function formatEstimatedDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return EMPTY_CELL;
  return `${seconds}s`;
}

/** 人物 tag：完整显示人名；过多时保留前 N 个并以 ... 收尾，悬停浮层看全量 */
const CHARACTER_TAG_VISIBLE_MAX = 3;

function CharacterTagChip({ name }: { name: string }) {
  const palette = characterTagPalette(name);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        palette.text,
        palette.bg,
        palette.border,
      )}
    >
      {name}
    </span>
  );
}

function EpisodeCharacterTags({ characters }: { characters: string[] }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  if (characters.length === 0) {
    return <span className="text-muted-foreground">{EMPTY_CELL}</span>;
  }

  const visible = characters.slice(0, CHARACTER_TAG_VISIBLE_MAX);
  const hasMore = characters.length > visible.length;

  return (
    <>
      <div
        ref={anchorRef}
        className="flex min-w-0 max-w-full flex-wrap content-center items-center gap-1.5"
        onMouseEnter={() => {
          if (hasMore) setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => {
          // 避免人物 tag / Popover dismiss 与行点击抢同一手势，导致弹框开完又被关
          e.stopPropagation();
        }}
      >
        {visible.map((name) => (
          <CharacterTagChip key={name} name={name} />
        ))}
        {hasMore ? (
          <span className="shrink-0 text-[11px] font-medium leading-none text-muted-foreground">
            ...
          </span>
        ) : null}
      </div>
      {hasMore ? (
        <Popover
          open={open}
          onClose={() => setOpen(false)}
          anchorRef={anchorRef}
          width="w-auto max-w-xs"
          align="start"
          placement="top-start"
          sideOffset={6}
          backgroundColor="oklch(0.28 0.02 270)"
          className="rounded-lg border border-white/18 px-2.5 py-2 shadow-[0_12px_40px_oklch(0_0_0/0.55),0_0_0_1px_oklch(1_0_0/0.06)]"
        >
          <div className="flex flex-wrap gap-1.5">
            {characters.map((name) => (
              <CharacterTagChip key={name} name={name} />
            ))}
          </div>
        </Popover>
      ) : null}
    </>
  );
}

function ScriptEpisodesGeneratingLoader({
  reduceMotion,
  title,
  message,
}: {
  reduceMotion: boolean | null;
  title: string;
  message: string;
}) {
  const skeletonRows = [0, 1, 2, 3, 4];
  const skeletonCols = Array.from({ length: COLUMN_COUNT }, (_, i) => i);

  return (
    <div
      className="relative min-h-[320px] overflow-hidden"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_40%,oklch(0.62_0.16_195/0.14),transparent)]"
      />

      {skeletonRows.map((index) => (
        <motion.div
          key={index}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: index * 0.07,
            duration: 0.32,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={cn(EPISODE_TABLE_GRID, "border-b border-white/6")}
          style={{ minHeight: EPISODE_TABLE_ROW_HEIGHT }}
        >
          {skeletonCols.map((col) => (
            <div key={col} className={cn(EPISODE_TABLE_CELL, "flex items-center")}>
              <ShimmerBar className={cn("h-3.5", col === 0 ? "w-[72%]" : "w-[55%]")} />
            </div>
          ))}
        </motion.div>
      ))}

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#0a0e14]/50 backdrop-blur-[2px]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4 rounded-2xl border border-cyan-400/25 bg-[#0a0e14]/92 px-8 py-6 shadow-[0_0_48px_oklch(0.62_0.16_195/0.28),inset_0_1px_0_oklch(1_0_0/0.06)]"
        >
          <div className="relative flex h-14 w-14 items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-cyan-400/20 motion-safe:animate-spin"
              style={{ animationDuration: "3s" }}
            />
            <span
              aria-hidden
              className="absolute inset-1 rounded-full border border-t-cyan-400/75 border-r-transparent border-b-indigo-400/45 border-l-transparent motion-safe:animate-spin"
              style={{ animationDuration: "1.15s" }}
            />
            <ScrollText
              className="relative h-6 w-6 text-cyan-300 motion-safe:animate-pulse"
              strokeWidth={2}
            />
          </div>
          <div className="text-center">
            <p className="bg-linear-to-r from-cyan-300 to-indigo-300 bg-clip-text text-sm font-semibold text-transparent">
              {title}
            </p>
            <p className="mt-1.5 max-w-[280px] text-xs leading-relaxed text-white/45">{message}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ProjectScriptEpisodesSection({
  episodes,
  projectId,
  loading = false,
  loadingTitle,
  loadingMessage,
  onSceneSaved,
}: ProjectScriptEpisodesSectionProps) {
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const reduceMotion = useReducedMotion();
  const detailTitleId = useId();
  /** 打开时快照详情，避免父级随 tasks 轮询重渲染时 index/rows 抖动导致弹框闪断 */
  const [selectedDetail, setSelectedDetail] = useState<EpisodeDetailSnapshot | null>(null);
  const [editMode, setEditMode] = useState<ScriptDetailEditMode>({ type: "view" });
  const [editState, setEditState] = useState<ProjectScriptSceneDetailEditState>({
    canSave: false,
    saving: false,
  });
  const sceneDetailRef = useRef<ProjectScriptSceneDetailHandle>(null);
  const ignoreCloseUntilRef = useRef(0);

  const handleEditStateChange = useCallback((state: ProjectScriptSceneDetailEditState) => {
    setEditState(state);
  }, []);

  const openEpisodeDetail = useCallback((detail: EpisodeDetailSnapshot) => {
    ignoreCloseUntilRef.current = performance.now() + MODAL_CLOSE_GUARD_MS;
    setEditMode({ type: "view" });
    setEditState({ canSave: false, saving: false });
    setSelectedDetail(detail);
  }, []);

  const closeEpisodeDetail = useCallback(() => {
    if (performance.now() < ignoreCloseUntilRef.current) return;
    setSelectedDetail(null);
    setEditMode({ type: "view" });
    setEditState({ canSave: false, saving: false });
  }, []);

  const columnHeaders = useMemo(
    () => [
      t("workspace_script_episode_name_column"),
      t("workspace_script_episode_characters_column"),
      t("workspace_script_episode_created_at_column"),
      t("workspace_script_episode_status_column"),
      t("workspace_script_episode_updated_at_column"),
      t("workspace_script_episode_total_scenes_column"),
      t("workspace_script_episode_duration_column"),
    ],
    [t],
  );

  const rows = useMemo(
    () =>
      episodes.map((episode, index) => {
        const meta = resolveWorkspaceV2ScriptEpisodeMetadata(episode);
        const episodeNumber =
          typeof episode.episode_number === "number" && episode.episode_number > 0
            ? episode.episode_number
            : typeof episode.episode === "number" && episode.episode > 0
              ? episode.episode
              : index + 1;
        return {
          index,
          episodeNumber,
          episode,
          name: resolveWorkspaceV2EpisodeName(episode, index),
          characters: resolveWorkspaceV2EpisodeCharacters(episode),
          createdAt: formatDateTime(meta.createdAt, i18n.language, EMPTY_CELL),
          status: formatEpisodeStatus(meta.status, t),
          updatedAt: formatDateTime(meta.updatedAt, i18n.language, EMPTY_CELL),
          totalScenes: meta.totalScenes != null ? String(meta.totalScenes) : EMPTY_CELL,
          estimatedDuration: formatEstimatedDuration(meta.estimatedDurationSeconds),
          scenes: episode.scenes ?? [],
        };
      }),
    [episodes, i18n.language, t],
  );

  return (
    <>
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0.12 : 0.34,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="flex min-h-0 flex-1 flex-col pb-2 pt-1"
      >
        <Card className={cn(WS2_CARD_CLASS, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
          <CardHeader className={cn(WS2_SECTION_HEADER_CLASS, "px-5 py-3")}>
            <CardTitle className={WS2_SECTION_HEADER_TITLE_CLS}>
              {t("workspace_script_episodes_label")}
            </CardTitle>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            {/* 纵向 / 横向均在此滚动；min-h-0 + flex-1 保证父级 flex 链下可出现滚动条 */}
            <div
              className="min-h-0 flex-1 overflow-auto overscroll-contain"
              style={{ scrollbarGutter: "stable" }}
              role="table"
              aria-label={t("workspace_script_episodes_label")}
            >
              <div className="min-w-[980px]">
                <div
                  role="rowgroup"
                  className={cn(
                    EPISODE_TABLE_GRID,
                    "sticky top-0 z-10 border-b border-border bg-card",
                  )}
                >
                  {columnHeaders.map((label) => (
                    <div
                      key={label}
                      role="columnheader"
                      className={cn(EPISODE_TABLE_HEAD_CELL, EPISODE_TABLE_CELL)}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div role="rowgroup">
                  {loading ? (
                    <ScriptEpisodesGeneratingLoader
                      reduceMotion={reduceMotion}
                      title={loadingTitle ?? t("workspace_script_fetching")}
                      message={loadingMessage ?? t("workspace_script_fetching_hint")}
                    />
                  ) : rows.length > 0 ? (
                    rows.map((row) => (
                      <div
                        key={row.index}
                        role="row"
                        tabIndex={0}
                        className={cn(
                          EPISODE_TABLE_GRID,
                          "cursor-pointer border-b border-border transition-colors duration-200 last:border-b-0 hover:bg-cyan-500/4",
                        )}
                        style={{ minHeight: EPISODE_TABLE_ROW_HEIGHT }}
                        onClick={() =>
                          openEpisodeDetail({
                            name: row.name,
                            episodeNumber: row.episodeNumber,
                            episode: row.episode,
                            scenes: row.scenes,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openEpisodeDetail({
                              name: row.name,
                              episodeNumber: row.episodeNumber,
                              episode: row.episode,
                              scenes: row.scenes,
                            });
                          }
                        }}
                      >
                        <div
                          role="cell"
                          className={cn(
                            EPISODE_TABLE_CELL,
                            "flex min-w-0 items-center text-[13px] font-medium text-foreground",
                          )}
                        >
                          <span className="line-clamp-2">{row.name}</span>
                        </div>
                        <div
                          role="cell"
                          className={cn(EPISODE_TABLE_CELL, "flex min-w-0 items-center")}
                        >
                          <EpisodeCharacterTags characters={row.characters} />
                        </div>
                        <div role="cell" className={cn(EPISODE_TABLE_CELL, EPISODE_TABLE_BODY_CELL)}>
                          {row.createdAt}
                        </div>
                        <div role="cell" className={cn(EPISODE_TABLE_CELL, EPISODE_TABLE_BODY_CELL)}>
                          {row.status}
                        </div>
                        <div role="cell" className={cn(EPISODE_TABLE_CELL, EPISODE_TABLE_BODY_CELL)}>
                          {row.updatedAt}
                        </div>
                        <div role="cell" className={cn(EPISODE_TABLE_CELL, EPISODE_TABLE_BODY_CELL)}>
                          {row.totalScenes}
                        </div>
                        <div role="cell" className={cn(EPISODE_TABLE_CELL, EPISODE_TABLE_BODY_CELL)}>
                          {row.estimatedDuration}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      role="row"
                      className={cn(EPISODE_TABLE_GRID, "border-b border-border last:border-b-0")}
                      style={{ minHeight: 160 }}
                    >
                      <div
                        role="cell"
                        className={cn(
                          EPISODE_TABLE_CELL,
                          "col-span-7 flex flex-col items-center justify-center gap-1.5 text-center",
                        )}
                      >
                        <p className="text-sm text-muted-foreground">
                          {t("workspace_script_episodes_empty_title")}
                        </p>
                        <p className="text-xs text-muted-foreground/70">
                          {t("workspace_script_episodes_empty_hint")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <GlassModal
        open={selectedDetail != null}
        onClose={closeEpisodeDetail}
        labelledBy={detailTitleId}
        widthClassName="w-full max-w-3xl"
        panelClassName={cn(WS2_MODAL_PANEL_CLASS, "flex max-h-[82vh] flex-col overflow-hidden")}
      >
        {selectedDetail ? (
          <>
            <div
              className={cn(
                WS2_SECTION_HEADER_CLASS,
                "flex shrink-0 items-start justify-between gap-4 px-6 py-4",
              )}
            >
              <div className="min-w-0 flex-1">
                <h3
                  id={detailTitleId}
                  className="truncate text-[15px] font-semibold text-foreground"
                >
                  {t("workspace_script_episode_detail_title", { name: selectedDetail.name })}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("workspace_script_episode_scene_count", {
                    count: selectedDetail.scenes.length,
                  })}
                </p>
              </div>
              <ModalCloseButton onClick={closeEpisodeDetail} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <ProjectScriptSceneDetail
                ref={sceneDetailRef}
                scenes={selectedDetail.scenes}
                projectId={projectId}
                episodeNumber={selectedDetail.episodeNumber}
                episode={selectedDetail.episode}
                editMode={editMode}
                onEditModeChange={setEditMode}
                onEditStateChange={handleEditStateChange}
                onSaved={(nextScenes) => {
                  setSelectedDetail((prev) =>
                    prev
                      ? {
                          ...prev,
                          scenes: nextScenes,
                          episode: { ...prev.episode, scenes: nextScenes },
                        }
                      : prev,
                  );
                  void onSceneSaved?.();
                }}
              />
            </div>
            <div
              className={cn(
                WS2_CARD_FOOTER_CLASS,
                "flex shrink-0 items-center justify-end gap-2 bg-white/2 px-6 py-3",
              )}
            >
              {editMode.type === "view" ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 gap-1.5 px-3 text-[12px]"
                  onClick={() => setEditMode({ type: "all" })}
                  disabled={!projectId || selectedDetail.scenes.length === 0}
                  title={t("common:edit")}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {t("common:edit")}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-[12px]"
                    disabled={editState.saving}
                    onClick={() => sceneDetailRef.current?.cancel()}
                  >
                    {t("common:cancel")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 px-3 text-[12px]"
                    disabled={editState.saving || !editState.canSave}
                    onClick={() => void sceneDetailRef.current?.save()}
                  >
                    {editState.saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
                    ) : null}
                    {t("common:save")}
                  </Button>
                </>
              )}
            </div>
          </>
        ) : null}
      </GlassModal>
    </>
  );
}
