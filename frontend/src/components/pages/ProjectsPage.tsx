import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { errMsg, voidCall, voidPromise } from "@/utils/async";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle,
  Library,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { API } from "@/api";
import { useProjectsStore } from "@/stores/projects-store";
import { useAppStore } from "@/stores/app-store";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { ArchiveDiagnosticsDialog } from "@/components/shared/ArchiveDiagnosticsDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GlassModal } from "@/components/ui/GlassModal";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { Typewriter, type TypewriterSegment } from "@/components/ui/Typewriter";
import { WARM_TONE } from "@/utils/severity-tone";
import { getProjectDisplayName } from "@/utils/project-display";
import { CreateProjectModal } from "./CreateProjectModal";
import { NowEditingPanelBackground } from "./lobby/NowEditingPanelBackground";
import { OpenClawModal } from "./OpenClawModal";
import { rememberAssetLibraryReturnTo } from "./AssetLibraryPage";
import { ICON_BTN_FILLED_CLS, posterGridStyle } from "@/components/ui/darkroom-tokens";
import {
  EmptyStatePanel,
  GradientFrame,
  W3,
  W3_ACCENT_BUTTON_STYLE,
  WorkspacePageShell,
} from "@/components/workspace";
import { resolveMediaUrl } from "@/utils/app-base";
import { APP_MODULE_PROJECT_GRID, APP_MODULE_SHELL } from "@/utils/site-layout";
import {
  PHASE_ORDER,
  type Phase,
  type ImportConflictPolicy,
  type ImportFailureDiagnostics,
  type ProjectStatus,
  type ProjectSummary,
} from "@/types";

// 项目大厅 · Web3 Workspace
// 数据：仅消费 ProjectSummary 真实字段；hue 由 project.name 哈希派生

const ACCENT_BUTTON_STYLE = W3_ACCENT_BUTTON_STYLE;

type PhaseFilter = Phase | "all";
type GreetingKey =
  | "lobby_hero_greeting_morning"
  | "lobby_hero_greeting_afternoon"
  | "lobby_hero_greeting_evening"
  | "lobby_hero_greeting_late";

interface PhaseTone {
  dot: string;
  text: string;
  glow: string;
}

const PHASE_TONE: Record<Phase, PhaseTone> = {
  setup: {
    dot: "#94A3B8",
    text: "#CBD5E1",
    glow: "transparent",
  },
  worldbuilding: {
    dot: W3.cyan,
    text: "#67E8F9",
    glow: "rgba(34, 211, 238, 0.55)",
  },
  scripting: {
    dot: W3.amber,
    text: "#FDE68A",
    glow: "rgba(251, 191, 36, 0.45)",
  },
  production: {
    dot: W3.blue,
    text: "#A5B4FC",
    glow: "rgba(99, 102, 241, 0.55)",
  },
  completed: {
    dot: W3.green,
    text: "#6EE7B7",
    glow: "rgba(52, 211, 153, 0.5)",
  },
};

const POSTER_FX_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(34,211,238,0.04) 0%, rgba(3,7,18,0.72) 100%)",
};

const POSTER_GRID_STYLE = posterGridStyle({ size: 32, opacity: 0.12 });

const STYLE_TAG_STYLE: CSSProperties = {
  background: "rgba(3, 7, 18, 0.65)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: `1px solid ${W3.border}`,
  boxShadow: "0 0 12px rgba(34, 211, 238, 0.2)",
  color: W3.cyan,
};

function hashHue(name: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

function asProjectStatus(s: ProjectSummary["status"]): ProjectStatus | null {
  return s && "current_phase" in s ? (s as ProjectStatus) : null;
}

function projectActivityScore(p: ProjectSummary): number {
  const status = asProjectStatus(p.status);
  if (!status) return -1;
  if (status.current_phase === "production" && status.phase_progress < 1) {
    return 100 + status.phase_progress * 10;
  }
  if (status.current_phase === "completed") return -10;
  return PHASE_ORDER.indexOf(status.current_phase) * 10 + status.phase_progress;
}

function pickFeaturedProject(projects: ProjectSummary[]): ProjectSummary | null {
  let best: ProjectSummary | null = null;
  let bestScore = -Infinity;
  for (const p of projects) {
    const score = projectActivityScore(p);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function styleLabelOf(p: ProjectSummary, t: TFunction): string {
  if (p.style_template_id) return t(`templates:name.${p.style_template_id}`);
  if (p.style_image) return t("dashboard:style_custom");
  return t("dashboard:style_not_set");
}

function getGreetingKey(d = new Date()): GreetingKey {
  const h = d.getHours();
  if (h >= 5 && h < 11) return "lobby_hero_greeting_morning";
  if (h >= 11 && h < 14) return "lobby_hero_greeting_afternoon";
  if (h >= 14 && h < 22) return "lobby_hero_greeting_evening";
  return "lobby_hero_greeting_late";
}

// -- Poster -------------------------------------------------------------------

interface PosterProps {
  project: ProjectSummary;
  styleLabel: string;
  large?: boolean;
}

function Poster({ project, styleLabel, large = false }: PosterProps) {
  const { t } = useTranslation("dashboard");
  const hue1 = useMemo(() => hashHue(project.name, 17), [project.name]);
  const thumbUrl = resolveMediaUrl(project.thumbnail);
  const aspect = large ? "2.35 / 1" : "16 / 10";
  const radius = large ? 10 : 8;
  const displayName = getProjectDisplayName(project.title, t("untitled_project"));
  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: "100%",
        aspectRatio: aspect,
        borderRadius: radius,
        background: `radial-gradient(120% 80% at 30% 30%, oklch(0.55 0.15 ${hue1}) 0%, oklch(0.28 0.08 ${(hue1 + 10) % 360}) 45%, oklch(0.14 0.02 265) 100%)`,
        boxShadow: `inset 0 0 0 1px ${W3.borderSoft}, 0 0 20px -8px rgba(99,102,241,0.35)`,
      }}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={POSTER_FX_STYLE} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={POSTER_GRID_STYLE}
      />
      <div
        className="absolute left-3 top-3 rounded-md px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em]"
        style={STYLE_TAG_STYLE}
      >
        {styleLabel}
      </div>
      <div className="absolute inset-x-4 bottom-4">
        <div
          className="font-editorial"
          style={{
            fontWeight: 400,
            fontSize: large ? 48 : 22,
            lineHeight: 1.05,
            color: "oklch(0.99 0.005 0)",
            letterSpacing: "-0.02em",
            textShadow: "0 2px 24px oklch(0 0 0 / 0.65)",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {displayName}
        </div>
      </div>
    </div>
  );
}

// -- PhasePill ----------------------------------------------------------------

function PhasePill({ phase, label }: { phase: Phase | null; label: string }) {
  const tone = phase ? PHASE_TONE[phase] : PHASE_TONE.setup;
  const isProduction = phase === "production";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]"
      style={{
        color: tone.text,
        background: "rgba(34, 211, 238, 0.08)",
        border: `1px solid ${W3.border}`,
        boxShadow: isProduction ? W3.glowCyan : undefined,
      }}
    >
      <span
        aria-hidden
        className={isProduction ? "motion-safe:animate-pulse" : undefined}
        style={{
          width: 5,
          height: 5,
          borderRadius: 3,
          background: tone.dot,
          boxShadow: `0 0 6px ${tone.glow}`,
        }}
      />
      {label}
    </span>
  );
}

// -- 渐变进度条 — 复用 ui/ProgressBar，仅注入 Darkroom 视觉 ------------------

function gradientProgressStyles(
  variant: "accent" | "good",
  options?: { soft?: boolean },
): {
  trackStyle: CSSProperties;
  barStyle: CSSProperties;
} {
  const trackStyle: CSSProperties = {
    background: options?.soft ? "rgba(148, 163, 184, 0.12)" : "rgba(99, 102, 241, 0.15)",
  };
  if (variant === "good") {
    return {
      trackStyle,
      barStyle: {
        background: `linear-gradient(90deg, ${W3.green}, #6EE7B7)`,
        boxShadow: options?.soft
          ? "none"
          : "0 0 10px rgba(52, 211, 153, 0.65)",
      },
    };
  }
  return {
    trackStyle,
    barStyle: {
      background: options?.soft
        ? "linear-gradient(90deg, rgba(34,211,238,0.75), rgba(99,102,241,0.65))"
        : W3.gradientProgress,
      boxShadow: options?.soft ? "none" : W3.glowCyan,
    },
  };
}

// -- ProjectCard --------------------------------------------------------------

interface ProjectCardProps {
  project: ProjectSummary;
  styleLabel: string;
  phaseLabels: Record<Phase, string>;
  t: TFunction;
  onDelete: () => void;
}

function ProjectCard({ project, styleLabel, phaseLabels, t, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const status = asProjectStatus(project.status);
  const phase: Phase | null = status?.current_phase ?? null;
  const phaseLabel = phase ? phaseLabels[phase] : "";
  const progressPct = status ? Math.round(status.phase_progress * 100) : 0;
  const projectDisplayName = getProjectDisplayName(project.title, t("dashboard:untitled_project"));

  const { trackStyle, barStyle } = gradientProgressStyles(
    phase === "completed" ? "good" : "accent",
  );

  return (
    <article
      className={
        "group relative rounded-[11px] transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-1 focus-within:shadow-[0_0_0_2px_rgba(34,211,238,0.45)] " +
        (menuOpen ? "z-40" : "z-0")
      }
      style={{
        padding: 1,
        background: W3.gradient,
        boxShadow: "0 0 0 1px rgba(34,211,238,0.08)",
      }}
    >
      <div
        className="relative rounded-[10px]"
        style={{ background: W3.surfaceSolid }}
      >
      <Link
        href={`/app/projects/${project.name}`}
        className="relative block w-full overflow-hidden rounded-[10px] text-left text-text no-underline outline-none"
        aria-label={`${projectDisplayName} · ${styleLabel}${phaseLabel ? ` · ${phaseLabel}` : ""}`}
      >
        <Poster project={project} styleLabel={styleLabel} />

        <div
          className="absolute inset-x-0 bottom-0 translate-y-full px-3 pb-3 pt-8 transition-transform duration-200 group-hover:translate-y-0 group-focus-within:translate-y-0"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(3,7,18,0.88) 40%, rgba(3,7,18,0.96) 100%)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <PhasePill phase={phase} label={phaseLabel} />
            <span
              className="font-mono text-[11px] font-semibold tabular-nums"
              style={{
                color: phase === "completed" ? W3.green : W3.cyan,
                textShadow: phase === "completed" ? "0 0 12px rgba(52,211,153,0.6)" : W3.glowCyan,
              }}
            >
              {progressPct}%
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <ProgressBar
              value={progressPct}
              label={t("dashboard:lobby_now_editing_progress_label")}
              className="h-[2px] flex-1 rounded-full bg-transparent"
              style={trackStyle}
              barClassName="rounded-full"
              barStyle={barStyle}
            />
          </div>
        </div>
      </Link>

      <div className="absolute right-2.5 top-2.5 z-20">
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${t("dashboard:lobby_card_actions")} — ${projectDisplayName}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          className={
            "grid h-8 w-8 place-items-center rounded-md border backdrop-blur transition-[opacity,color,background] hover:text-text-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 " +
            (menuOpen
              ? "border-cyan-400/40 bg-slate-900/90 text-slate-100 opacity-100"
              : "border-white/10 bg-slate-900/70 text-slate-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100")
          }
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        {menuOpen ? (
          <div
            ref={menuRef}
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[148px] overflow-hidden rounded-md border border-cyan-500/25 bg-slate-900/95 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85)] backdrop-blur"
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen(false);
                onDelete();
              }}
              aria-label={`${t("dashboard:delete_project")} — ${projectDisplayName}`}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] text-danger-2 transition-colors hover:bg-danger-soft focus-visible:bg-danger-soft focus-visible:outline-none"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("dashboard:delete_project")}
            </button>
          </div>
        ) : null}
      </div>
      </div>
    </article>
  );
}

// -- NowEditingCard -----------------------------------------------------------

interface NowEditingCardProps {
  project: ProjectSummary;
  styleLabel: string;
  phaseLabels: Record<Phase, string>;
  t: TFunction;
}

function NowEditingCard({ project, styleLabel, phaseLabels, t }: NowEditingCardProps) {
  const status = asProjectStatus(project.status);
  const phase: Phase | null = status?.current_phase ?? null;
  const phaseLabel = phase ? phaseLabels[phase] : "";
  const progressPct = status ? Math.round(status.phase_progress * 100) : 0;
  const episodes =
    status?.episodes_summary ?? { total: 0, scripted: 0, in_production: 0, completed: 0 };
  const characters = status?.characters ?? { completed: 0, total: 0 };
  const scenes = status?.scenes ?? { completed: 0, total: 0 };
  const propsStat = status?.props ?? { completed: 0, total: 0 };

  const { trackStyle, barStyle } = gradientProgressStyles(
    phase === "completed" ? "good" : "accent",
    { soft: true },
  );

  return (
    <GradientFrame tone="subtle" glow radius={14}>
      <article
        className="grid"
        style={{
          gridTemplateColumns: "minmax(0, 1.55fr) minmax(0, 1fr)",
        }}
      >
      <div className="p-1.5">
        <Poster project={project} styleLabel={styleLabel} large />
      </div>
      <div className="relative flex min-h-0 flex-col overflow-hidden px-6 pb-5 pt-5">
        <NowEditingPanelBackground />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="motion-safe:animate-pulse"
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: "rgba(34, 211, 238, 0.65)",
            }}
          />
          <span
            className="font-mono text-[10px] font-bold tracking-[0.14em]"
            style={{ color: "rgba(148, 163, 184, 0.95)" }}
          >
            {t("dashboard:lobby_continue_editing_chip")}
          </span>
        </div>
        <h3
          className="font-editorial m-0 mt-3"
          style={{
            fontWeight: 400,
            fontSize: 32,
            lineHeight: 1.05,
            letterSpacing: "-0.015em",
            color: "#F8FAFC",
          }}
        >
          {getProjectDisplayName(project.title, t("dashboard:untitled_project"))}
        </h3>
        <div className="mt-1 font-mono text-[11px] tracking-[0.06em]" style={{ color: W3.textMuted }}>
          {styleLabel}
        </div>

        <div className="my-5 flex items-center gap-3">
          <span
            className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "rgba(148, 163, 184, 0.9)" }}
          >
            {phaseLabel}
          </span>
          <ProgressBar
            value={progressPct}
            label={t("dashboard:lobby_now_editing_progress_label")}
            className="h-[3px] flex-1 rounded-full bg-transparent"
            style={trackStyle}
            barClassName="rounded-full"
            barStyle={barStyle}
          />
          <span
            className="shrink-0 font-mono text-[12px] font-semibold tabular-nums"
            style={{ color: "rgba(186, 230, 253, 0.88)" }}
          >
            {progressPct}%
          </span>
        </div>

        <div
          className="grid overflow-hidden rounded-[8px]"
          style={{
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 1,
            background: "rgba(148, 163, 184, 0.08)",
          }}
        >
          {[
            {
              k: t("dashboard:lobby_now_editing_phase_label"),
              v: phaseLabel || "—",
              sub: t("dashboard:lobby_now_editing_episodes_value", {
                completed: episodes.completed,
                total: episodes.total,
              }),
            },
            {
              k: t("dashboard:characters"),
              v: `${characters.completed} / ${characters.total || "—"}`,
              sub: `${t("dashboard:scenes")} ${scenes.completed}/${scenes.total || "—"}`,
            },
            {
              k: t("dashboard:props"),
              v: `${propsStat.completed} / ${propsStat.total || "—"}`,
              sub: `${t("dashboard:lobby_now_editing_progress_label")} ${progressPct}%`,
            },
          ].map((cell) => (
            <div
              key={cell.k}
              className="px-3 py-2.5"
              style={{ background: "rgba(8, 12, 28, 0.55)" }}
            >
              <div
                className="font-mono text-[9px] font-bold uppercase tracking-[0.1em]"
                style={{ color: W3.textMuted }}
              >
                {cell.k}
              </div>
              <div className="mt-1 text-[13px] font-semibold tracking-tight text-slate-100">
                {cell.v}
              </div>
              <div className="mt-0.5 font-mono text-[9.5px] text-slate-500">{cell.sub}</div>
            </div>
          ))}
        </div>

        <div className="flex-1" />
        <div className="mt-5 flex justify-end">
          <Link
            href={`/app/projects/${project.name}`}
            className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2.5 text-[12px] font-semibold no-underline transition-[transform,box-shadow] motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            style={ACCENT_BUTTON_STYLE}
          >
            {phase === "completed"
              ? t("dashboard:lobby_open_workspace_completed")
              : t("dashboard:lobby_open_workspace")}
            <span aria-hidden>→</span>
          </Link>
        </div>
        </div>
      </div>
    </article>
    </GradientFrame>
  );
}

// -- TopBar -------------------------------------------------------------------

interface TopBarProps {
  onImport: () => void;
  onCreate: () => void;
  onSettings: () => void;
  onAssets: () => void;
  onOpenClaw: () => void;
  importing: boolean;
  configIncomplete: boolean;
}

function TopBar({
  onImport,
  onCreate,
  onSettings,
  onAssets,
  onOpenClaw,
  importing,
  configIncomplete,
}: TopBarProps) {
  const { t } = useTranslation(["common", "dashboard", "assets"]);
  return (
    <div
      className="sticky top-0 z-30"
      style={{
        background:
          "linear-gradient(180deg, oklch(0.20 0.011 265 / 0.55), oklch(0.15 0.010 265 / 0.45))",
        backdropFilter: "blur(28px) saturate(1.5)",
        WebkitBackdropFilter: "blur(28px) saturate(1.5)",
        borderBottom: "1px solid oklch(1 0 0 / 0.06)",
        boxShadow:
          "inset 0 1px 0 oklch(1 0 0 / 0.05), 0 6px 24px -12px oklch(0 0 0 / 0.45)",
      }}
    >
      <div className={`${APP_MODULE_SHELL} flex items-center justify-end gap-1.5 py-3`}>
          <button
            type="button"
            onClick={onAssets}
            className="inline-flex items-center gap-1.5 rounded-[7px] border border-accent/25 bg-accent-dim px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:border-accent/50 hover:bg-accent-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title={t("assets:library_title")}
          >
            <Library className="h-3.5 w-3.5" />
            {t("assets:library_title")}
          </button>
          <span aria-hidden className="mx-1 h-5 w-px bg-hairline-soft" />
          <button
            type="button"
            onClick={onImport}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-[7px] border border-hairline bg-bg-grad-a/50 px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:border-hairline-strong hover:bg-bg-grad-a focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {importing ? (
              <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {importing ? t("dashboard:importing") : t("dashboard:import_zip")}
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[12px] font-semibold transition-transform motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            style={ACCENT_BUTTON_STYLE}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("dashboard:create_project")}
          </button>
          <button
            type="button"
            onClick={onSettings}
            className={`relative ${ICON_BTN_FILLED_CLS}`}
            title={t("settings")}
            aria-label={t("settings")}
          >
            <Settings className="h-4 w-4" aria-hidden />
            {configIncomplete ? (
              <span
                aria-label={t("config_incomplete")}
                className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-warm-bright"
              />
            ) : null}
          </button>
      </div>
    </div>
  );
}

// -- HeroStrip ----------------------------------------------------------------

interface HeroStripProps {
  totals: {
    total: number;
    production: number;
    completed: number;
    drafts: number;
  };
  t: TFunction;
}

function HeroStrip({ totals, t }: HeroStripProps) {
  const greetingKey = useMemo<GreetingKey>(() => getGreetingKey(), []);

  let subtitle: string;
  if (totals.production > 0) {
    subtitle = t("dashboard:lobby_hero_subtitle_active", { count: totals.production });
  } else if (totals.total > 0) {
    subtitle = t("dashboard:lobby_hero_subtitle_quiet");
  } else {
    subtitle = t("dashboard:lobby_hero_subtitle_idle");
  }

  const stats: Array<{ key: string; label: string; value: number; tone: CSSProperties }> = [
    {
      key: "total",
      label: t("dashboard:lobby_stat_total"),
      value: totals.total,
      tone: { color: "#F8FAFC" },
    },
    {
      key: "prod",
      label: t("dashboard:lobby_stat_production"),
      value: totals.production,
      tone: { color: W3.cyan, textShadow: W3.glowCyan },
    },
    {
      key: "draft",
      label: t("dashboard:lobby_stat_drafts"),
      value: totals.drafts,
      tone: { color: W3.amber, textShadow: "0 0 16px rgba(251,191,36,0.45)" },
    },
    {
      key: "done",
      label: t("dashboard:lobby_stat_completed"),
      value: totals.completed,
      tone: { color: W3.green, textShadow: "0 0 16px rgba(52,211,153,0.45)" },
    },
  ];

  return (
    <div className={`${APP_MODULE_SHELL} flex items-center justify-between gap-8 pb-4 pt-7`}>
      <div className="min-w-0 flex-1">
        <h1
          className="font-editorial m-0 whitespace-nowrap leading-none"
          style={{
            fontSize: 42,
            fontWeight: 400,
            letterSpacing: "-0.015em",
            color: "#F8FAFC",
          }}
        >
          <Typewriter
            once="lobby-hero"
            segments={
              [
                { text: t(`dashboard:${greetingKey}`), after: " " },
                {
                  text: subtitle,
                  style: {
                    fontStyle: "italic",
                    background: W3.gradient,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  } as CSSProperties,
                },
              ] satisfies TypewriterSegment[]
            }
          />
        </h1>
      </div>
      <div className="shrink-0">
        <GradientFrame radius={10}>
          <div className="flex items-stretch">
          {stats.map((s, i) => (
            <div
              key={s.key}
              className={
                "min-w-[72px] px-4 py-2.5 text-center" +
                (i < stats.length - 1 ? " border-r border-cyan-500/15" : "")
              }
            >
              <div
                className="font-mono text-[9px] font-bold tracking-[0.12em]"
                style={{ color: W3.textMuted }}
              >
                {s.label}
              </div>
              <div
                className="font-editorial mt-1 tabular-nums"
                style={{
                  fontSize: 28,
                  fontWeight: 400,
                  lineHeight: 1,
                  letterSpacing: "-0.012em",
                  ...s.tone,
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
          </div>
        </GradientFrame>
      </div>
    </div>
  );
}

// -- FilterPills --------------------------------------------------------------

interface FilterPillsProps {
  active: PhaseFilter;
  onChange: (next: PhaseFilter) => void;
  counts: Record<Phase, number> & { all: number };
  phaseLabels: Record<Phase, string>;
  searchValue: string;
  onSearch: (v: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  t: TFunction;
}

function FilterPills({
  active,
  onChange,
  counts,
  phaseLabels,
  searchValue,
  onSearch,
  searchInputRef,
  t,
}: FilterPillsProps) {
  const pills: Array<{ key: PhaseFilter; label: string; n: number }> = [
    { key: "all", label: t("dashboard:lobby_filter_all"), n: counts.all },
    { key: "production", label: phaseLabels.production, n: counts.production },
    { key: "scripting", label: phaseLabels.scripting, n: counts.scripting },
    { key: "worldbuilding", label: phaseLabels.worldbuilding, n: counts.worldbuilding },
    { key: "completed", label: phaseLabels.completed, n: counts.completed },
    { key: "setup", label: phaseLabels.setup, n: counts.setup },
  ];

  return (
    <div
      className="sticky z-20 backdrop-blur-md backdrop-saturate-150"
      style={{
        top: "var(--lobby-topbar-h, 57px)",
        background: W3.filterBarBg,
        borderBottom: "1px solid rgba(34, 211, 238, 0.06)",
        boxShadow: "inset 0 1px 0 rgba(34,211,238,0.04)",
      }}
    >
      <div className={`${APP_MODULE_SHELL} flex items-center gap-2 py-3`}>
        {pills.map((c) => {
          const isActive = active === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(c.key)}
              aria-pressed={isActive}
              className={
                "inline-flex items-center rounded-[7px] px-3 py-1.5 text-[12px] transition-[color,box-shadow,background,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 motion-safe:hover:-translate-y-px " +
                (isActive
                  ? "font-semibold text-slate-50"
                  : "border border-hairline bg-bg-grad-a/50 font-medium text-text-2 hover:border-hairline-strong hover:bg-bg-grad-a hover:text-text")
              }
              style={isActive ? ACCENT_BUTTON_STYLE : undefined}
            >
              {c.label}
              <span
                className={
                  "ml-1.5 font-mono tabular-nums " +
                  (isActive ? "text-slate-100/85" : "text-text-3")
                }
              >
                {c.n}
              </span>
            </button>
          );
        })}
        <div className="flex-1" />
        <label className="flex w-[min(280px,100%)] shrink-0 items-center gap-2 rounded-[7px] border border-hairline bg-bg-grad-a/50 px-3 py-1.5 transition-colors focus-within:border-cyan-400/50">
          <Search className="h-3.5 w-3.5 text-text-3" />
          <input
            ref={searchInputRef}
            type="search"
            name="q"
            aria-label={t("dashboard:search_projects")}
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
            aria-keyshortcuts="Meta+K Control+K"
            placeholder={t("dashboard:lobby_search_placeholder")}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-text placeholder:text-text-3 outline-none"
          />
          <kbd
            aria-hidden
            className="rounded border border-hairline-soft px-1.5 py-px font-mono text-[9.5px] text-text-3"
          >
            {t("dashboard:lobby_search_kbd")}
          </kbd>
        </label>
      </div>
    </div>
  );
}

function FilteredLobbyContent({
  contentKey,
  children,
}: {
  contentKey: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={contentKey}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{
          duration: reduceMotion ? 0.12 : 0.26,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// -- ProjectsPage -------------------------------------------------------------

export function ProjectsPage() {
  const { t, i18n } = useTranslation(["common", "dashboard", "assets"]);
  const [, navigate] = useLocation();
  const {
    projects,
    projectsLoading,
    showCreateModal,
    setProjects,
    setProjectsLoading,
    setShowCreateModal,
  } = useProjectsStore();

  const [importingProject, setImportingProject] = useState(false);
  const [conflictProject, setConflictProject] = useState<string | null>(null);
  const [conflictFile, setConflictFile] = useState<File | null>(null);
  type ImportDiagnosticsState =
    | { source: "success"; diagnostics: ImportFailureDiagnostics; navigateTo: string }
    | { source: "failure"; diagnostics: ImportFailureDiagnostics };
  const [importDiagnostics, setImportDiagnostics] =
    useState<ImportDiagnosticsState | null>(null);
  const [showOpenClaw, setShowOpenClaw] = useState(false);
  const [deletingProject, setDeletingProject] = useState<ProjectSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isConfigComplete = useConfigStatusStore((s) => s.isComplete);

  const phaseLabels = useMemo<Record<Phase, string>>(
    () => ({
      setup: t("dashboard:phase_setup"),
      worldbuilding: t("dashboard:phase_worldbuilding"),
      scripting: t("dashboard:phase_scripting"),
      production: t("dashboard:phase_production"),
      completed: t("dashboard:phase_completed"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t reference rotates with i18n.language
    [i18n.language],
  );

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const res = await API.listProjects();
      setProjects(res.projects);
    } finally {
      setProjectsLoading(false);
    }
  }, [setProjects, setProjectsLoading]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await doImport(file);
    e.target.value = "";
  };

  const doImport = async (file: File, policy: ImportConflictPolicy = "prompt") => {
    setImportingProject(true);
    try {
      const result = await API.importProject(file, policy);
      setConflictProject(null);
      setConflictFile(null);
      setImportDiagnostics(null);
      await fetchProjects();

      const autoFixedCount = result.diagnostics.auto_fixed.length;
      const warningCount = result.diagnostics.warnings.length;
      const navigateTo = `/app/projects/${result.project_name}`;
      if (warningCount > 0 || autoFixedCount > 0) {
        useAppStore
          .getState()
          .pushToast(
            autoFixedCount > 0
              ? t("dashboard:import_auto_fixed", {
                  title: getProjectDisplayName(
                    result.project.title,
                    t("dashboard:untitled_project"),
                  ),
                  count: autoFixedCount,
                })
              : t("dashboard:import_success", {
                  title: getProjectDisplayName(
                    result.project.title,
                    t("dashboard:untitled_project"),
                  ),
                }),
            "success",
          );
        setImportDiagnostics({
          source: "success",
          diagnostics: {
            blocking: [],
            auto_fixable: result.diagnostics.auto_fixed,
            warnings: result.diagnostics.warnings,
          },
          navigateTo,
        });
        return;
      }
      navigate(navigateTo);
    } catch (err) {
      const error = err as Error & {
        status?: number;
        conflict_project_name?: string;
        diagnostics?: ImportFailureDiagnostics;
      };

      if (
        error.status === 409 &&
        error.conflict_project_name &&
        policy === "prompt"
      ) {
        setConflictFile(file);
        setConflictProject(error.conflict_project_name);
        return;
      }

      if (error.diagnostics) {
        setImportDiagnostics({ source: "failure", diagnostics: error.diagnostics });
      } else {
        useAppStore
          .getState()
          .pushToast(`${t("dashboard:import_failed")}: ${error.message}`, "warning");
      }
    } finally {
      setImportingProject(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    const projectDisplayName = deletingProject.title || deletingProject.name;
    setDeleteLoading(true);
    try {
      await API.deleteProject(deletingProject.name);
      await fetchProjects();
      useAppStore.getState().pushToast(t("common:deleted"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(
          `${t("dashboard:delete_failed")}[${projectDisplayName}] ${errMsg(err)}`,
          "warning",
        );
    } finally {
      setDeleteLoading(false);
      setDeletingProject(null);
    }
  };

  const phaseCounts = useMemo(() => {
    const out: Record<Phase, number> & { all: number } = {
      all: 0,
      setup: 0,
      worldbuilding: 0,
      scripting: 0,
      production: 0,
      completed: 0,
    };
    for (const p of projects) {
      out.all += 1;
      const status = asProjectStatus(p.status);
      if (status) out[status.current_phase] += 1;
    }
    return out;
  }, [projects]);

  const totals = useMemo(() => {
    let production = 0;
    let completed = 0;
    let drafts = 0;
    for (const p of projects) {
      const s = asProjectStatus(p.status);
      if (!s) continue;
      if (s.current_phase === "production") production += 1;
      else if (s.current_phase === "completed") completed += 1;
      else drafts += 1;
    }
    return {
      total: projects.length,
      production,
      completed,
      drafts,
    };
  }, [projects]);

  const styleLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) map[p.name] = styleLabelOf(p, t);
    return map;
  }, [projects, t]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const s = asProjectStatus(p.status);
      if (phaseFilter !== "all") {
        if (!s || s.current_phase !== phaseFilter) return false;
      }
      if (!q) return true;
      const phaseLabel = s ? phaseLabels[s.current_phase] : "";
      return `${p.title || ""} ${p.name} ${phaseLabel}`.toLowerCase().includes(q);
    });
  }, [projects, phaseFilter, searchQuery, phaseLabels]);

  const featuredCandidate = useMemo(() => pickFeaturedProject(projects), [projects]);
  const featured =
    phaseFilter === "all" && !searchQuery.trim() ? featuredCandidate : null;

  const restProjects = useMemo(
    () =>
      featured
        ? filteredProjects.filter((p) => p.name !== featured.name)
        : filteredProjects,
    [featured, filteredProjects],
  );

  const lobbyContentKey = `${phaseFilter}|${searchQuery.trim().toLowerCase()}`;

  return (
    <WorkspacePageShell
      style={
        {
          "--lobby-topbar-h": "57px",
        } as CSSProperties
      }
    >

      <TopBar
        onImport={() => importInputRef.current?.click()}
        onCreate={() => setShowCreateModal(true)}
        onSettings={() => navigate("/app/settings")}
        onAssets={() => {
          rememberAssetLibraryReturnTo(window.location.pathname);
          navigate("/app/assets");
        }}
        onOpenClaw={() => setShowOpenClaw(true)}
        importing={importingProject}
        configIncomplete={!isConfigComplete}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,application/zip"
        aria-label={t("dashboard:import_project_file_aria")}
        onChange={voidPromise(handleImport)}
        className="hidden"
      />

      <HeroStrip totals={totals} t={t} />

      {projects.length > 0 ? (
        <FilterPills
          active={phaseFilter}
          onChange={setPhaseFilter}
          counts={phaseCounts}
          phaseLabels={phaseLabels}
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          searchInputRef={searchInputRef}
          t={t}
        />
      ) : null}

      <main className={`${APP_MODULE_SHELL} pt-5 pb-16`}>
        {projectsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 motion-safe:animate-spin text-accent" />
            <span className="ml-2 text-text-3">{t("dashboard:loading_projects")}</span>
          </div>
        ) : projects.length === 0 ? (
          <EmptyStatePanel>
            <p className="text-lg text-slate-100">{t("dashboard:no_projects")}</p>
            <p className="mt-2 text-sm" style={{ color: W3.textMuted }}>
              {t("dashboard:start_creating_hint")}
            </p>
          </EmptyStatePanel>
        ) : (
          <FilteredLobbyContent contentKey={lobbyContentKey}>
            {featured ? (
              <section className="mb-8" aria-labelledby="lobby-now-editing-heading">
                <div className="mb-3">
                  <h2
                    id="lobby-now-editing-heading"
                    className="m-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: "rgba(148, 163, 184, 0.85)" }}
                  >
                    {t("dashboard:lobby_now_editing_eyebrow")}
                  </h2>
                </div>
                <NowEditingCard
                  project={featured}
                  styleLabel={styleLabels[featured.name] ?? ""}
                  phaseLabels={phaseLabels}
                  t={t}
                />
              </section>
            ) : null}

            {filteredProjects.length === 0 ? (
              <EmptyStatePanel>
                <p className="text-lg text-slate-100">{t("dashboard:lobby_no_filter_match")}</p>
                <p className="mt-2 text-sm" style={{ color: W3.textMuted }}>
                  {t("dashboard:lobby_no_filter_match_hint")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPhaseFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-5 inline-flex items-center rounded-[8px] px-4 py-2 text-[12px] font-medium text-slate-100 transition-[transform,box-shadow] motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  style={{
                    background: "rgba(99, 102, 241, 0.15)",
                    border: `1px solid ${W3.border}`,
                    boxShadow: "0 0 20px -8px rgba(34,211,238,0.35)",
                  }}
                >
                  {t("dashboard:lobby_clear_filters")}
                </button>
              </EmptyStatePanel>
            ) : (
              <section aria-labelledby="lobby-library-heading">
                <div className="mb-4 flex items-baseline justify-between">
                  <h2
                    id="lobby-library-heading"
                    className="m-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: W3.blue }}
                  >
                    {t("dashboard:lobby_library_eyebrow")}
                  </h2>
                  <span className="font-mono text-[10px] tabular-nums text-slate-500">
                    {t("dashboard:lobby_library_count", { count: restProjects.length })}
                  </span>
                </div>
                <div className={APP_MODULE_PROJECT_GRID}>
                  {restProjects.map((project) => (
                    <ProjectCard
                      key={project.name}
                      project={project}
                      styleLabel={styleLabels[project.name] ?? ""}
                      phaseLabels={phaseLabels}
                      t={t}
                      onDelete={() => setDeletingProject(project)}
                    />
                  ))}
                </div>
              </section>
            )}
          </FilteredLobbyContent>
        )}
      </main>

      {conflictProject && conflictFile && (
        <ConflictDialog
          projectName={conflictProject}
          importing={importingProject}
          onConfirm={(policy) => voidCall(doImport(conflictFile, policy))}
          onCancel={() => {
            setConflictProject(null);
            setConflictFile(null);
          }}
        />
      )}

      {importDiagnostics && (
        <ArchiveDiagnosticsDialog
          title={t(
            importDiagnostics.source === "failure"
              ? "dashboard:import_failure_diagnostics"
              : "dashboard:import_diagnostics",
          )}
          description={t(
            importDiagnostics.source === "failure"
              ? "dashboard:import_failure_with_diagnostics"
              : "dashboard:import_success_with_diagnostics",
          )}
          sections={[
            {
              key: "blocking",
              title: t("dashboard:blocking_issues"),
              severity: "blocking",
              items: importDiagnostics.diagnostics.blocking,
            },
            {
              key: "auto_fixed",
              title: t("dashboard:auto_fixed_issues"),
              severity: "auto_fixed",
              items: importDiagnostics.diagnostics.auto_fixable,
            },
            {
              key: "warnings",
              title: t("dashboard:diagnostics_warnings"),
              severity: "warnings",
              items: importDiagnostics.diagnostics.warnings,
            },
          ]}
          onClose={() => {
            const target =
              importDiagnostics.source === "success" ? importDiagnostics.navigateTo : null;
            setImportDiagnostics(null);
            if (target) navigate(target);
          }}
        />
      )}

      {showOpenClaw && <OpenClawModal onClose={() => setShowOpenClaw(false)} />}
      {showCreateModal && <CreateProjectModal />}

      <ConfirmDialog
        open={!!deletingProject}
        tone="danger"
        title={t("dashboard:delete_project")}
        description={
          deletingProject
            ? t("dashboard:confirm_delete_project", {
                title: deletingProject.title || deletingProject.name,
              })
            : null
        }
        confirmLabel={t("dashboard:delete_project")}
        loadingLabel={t("dashboard:deleting_project")}
        cancelLabel={t("common:cancel")}
        loading={deleteLoading}
        onCancel={() => {
          if (!deleteLoading) setDeletingProject(null);
        }}
        onConfirm={handleDeleteProject}
      />
    </WorkspacePageShell>
  );
}

// -- ConflictDialog -----------------------------------------------------------

function ConflictDialog({
  projectName,
  importing,
  onConfirm,
  onCancel,
}: {
  projectName: string;
  importing: boolean;
  onConfirm: (policy: "overwrite" | "rename") => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation(["common", "dashboard"]);
  return (
    <GlassModal
      open
      onClose={onCancel}
      labelledBy="lobby-conflict-title"
      widthClassName="w-full max-w-lg"
      hairlineTone="warm"
      closeOnBackdrop={!importing}
      closeOnEscape={!importing}
    >
      <div className="px-6 pb-6 pt-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
            style={{
              background:
                "linear-gradient(135deg, var(--color-warm-tint), var(--color-warm-tint-faint))",
              border: `1px solid ${WARM_TONE.ring}`,
              color: WARM_TONE.color,
              boxShadow: `0 8px 18px -8px ${WARM_TONE.glow}`,
            }}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2
              id="lobby-conflict-title"
              className="display-serif text-[17px] font-semibold tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              {t("dashboard:duplicate_project_id")}
            </h2>
            <p
              className="text-[12.5px] leading-relaxed"
              style={{ color: "var(--color-text-3)" }}
            >
              {t("dashboard:id_intended_hint")}
              <span className="mx-1 rounded bg-bg/70 px-1.5 py-0.5 font-mono text-text">
                {projectName}
              </span>
              {t("dashboard:already_exists_conflict_hint")}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => onConfirm("overwrite")}
            disabled={importing}
            aria-label={t("dashboard:overwrite_existing")}
            className="flex w-full items-center justify-between rounded-xl border border-warm-ring bg-warm-tint px-4 py-3 text-left text-sm text-warm-bright transition-colors hover:border-warm-bright/60 hover:bg-warm-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block font-medium">{t("dashboard:overwrite_existing")}</span>
              <span className="mt-1 block text-xs text-warm-fade">
                {t("dashboard:overwrite_hint")}
              </span>
            </span>
            {importing && <Loader2 className="h-4 w-4 motion-safe:animate-spin" />}
          </button>

          <button
            type="button"
            onClick={() => onConfirm("rename")}
            disabled={importing}
            aria-label={t("dashboard:auto_rename_import")}
            className="flex w-full items-center justify-between rounded-xl border border-accent/25 bg-accent-dim px-4 py-3 text-left text-sm text-text transition-colors hover:border-accent/40 hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block font-medium">{t("dashboard:auto_rename_import")}</span>
              <span className="mt-1 block text-xs text-text-3">
                {t("dashboard:rename_hint")}
              </span>
            </span>
            {importing && <Loader2 className="h-4 w-4 motion-safe:animate-spin" />}
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <SecondaryButton size="sm" onClick={onCancel} disabled={importing}>
            {t("cancel")}
          </SecondaryButton>
        </div>
      </div>
    </GlassModal>
  );
}
