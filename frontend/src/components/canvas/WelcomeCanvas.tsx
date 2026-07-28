
import { useState, useRef, useCallback, useEffect } from "react";
import { errMsg, voidCall, voidPromise } from "@/utils/async";
import { useTranslation } from "react-i18next";
import {
  Upload,
  FileText,
  Sparkles,
  ScanText,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";
import { API } from "@/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { W3_ACCENT_BTN_CLS, W3_ACCENT_BTN_SM_CLS, W3_ACCENT_BUTTON_STYLE } from "@/components/workspace";
import { WorkspaceV2Logo } from "@/components/workspace-v2/WorkspaceV2Logo";
import {
  WS2_WELCOME_DROPZONE_ACTIVE_CLASS,
  WS2_WELCOME_DROPZONE_CLASS,
} from "@/components/workspace-v2/workspace-v2-theme";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { getProjectDisplayName } from "@/utils/project-display";
import {
  SOURCE_FILE_ACCEPT,
  SOURCE_FILE_FORMATS_LABEL,
  isSupportedSourceFile,
} from "@/utils/source-files";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UploadPhase = "loading" | "idle" | "has_sources" | "uploading" | "analyzing" | "done";

interface WelcomeCanvasProps {
  projectName: string;
  projectTitle?: string;
  onUpload?: (file: File) => Promise<void>;
  onAnalyze?: () => Promise<void>;
  /** 自定义源文件列表拉取（工作空间 2.0 等独立后端） */
  fetchSourceFiles?: (projectName: string) => Promise<string[]>;
  /** 外部触发源文件列表刷新 */
  filesVersion?: number;
  /** 上传后刷新源文件列表（替代全局 app-store invalidate） */
  onFilesChanged?: () => void;
  /** 不拉取源文件列表，直接进入上传引导（工作空间 2.0） */
  skipSourceFilesFetch?: boolean;
  /** 工作空间 2.0 样式：单行欢迎文案、隐藏底部说明 */
  welcomeVariant?: "default" | "workspace-v2";
  /** 删除源文件；未传时默认走老版 API.deleteSourceFile */
  onDeleteSourceFile?: (filename: string) => Promise<void>;
}

const CARD_BG =
  "linear-gradient(180deg, oklch(0.22 0.012 265 / 0.55), oklch(0.19 0.010 265 / 0.40))";
const CARD_SHADOW =
  "inset 0 1px 0 oklch(1 0 0 / 0.04), 0 8px 24px -10px oklch(0 0 0 / 0.5)";

// ---------------------------------------------------------------------------
// WelcomeCanvas — shown when a project has no overview yet.
// Phases: loading → idle (no sources, drag-drop) → has_sources (file list +
// analyze CTA) → uploading → analyzing → done.
// ---------------------------------------------------------------------------

export function WelcomeCanvas({
  projectName,
  projectTitle,
  onUpload,
  onAnalyze,
  fetchSourceFiles,
  filesVersion = 0,
  onFilesChanged,
  skipSourceFilesFetch = false,
  welcomeVariant = "default",
  onDeleteSourceFile,
}: WelcomeCanvasProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>(skipSourceFilesFetch ? "idle" : "loading");
  const [sourceFiles, setSourceFiles] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);
  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceFilesVersion = useAppStore((s) => s.sourceFilesVersion);
  const displayProjectTitle = getProjectDisplayName(projectTitle, t("untitled_project"));

  // 拉取已有源文件，决定初始 phase
  useEffect(() => {
    if (skipSourceFilesFetch) return;

    let cancelled = false;
    voidCall((async () => {
      try {
        let sources: string[];
        if (fetchSourceFiles) {
          sources = await fetchSourceFiles(projectName);
        } else {
          const res = await API.listFiles(projectName);
          const sourceGroup = res.files?.source ?? [];
          sources = sourceGroup.map((f) => `source/${f.name}`);
        }
        if (!cancelled) {
          setSourceFiles(sources);
          setPhase((prev) => {
            if (prev === "loading" || prev === "idle" || prev === "has_sources") {
              return sources.length > 0 ? "has_sources" : "idle";
            }
            return prev;
          });
        }
      } catch {
        if (!cancelled) setPhase((prev) => (prev === "loading" ? "idle" : prev));
      }
    })());
    return () => {
      cancelled = true;
    };
  }, [projectName, sourceFilesVersion, filesVersion, fetchSourceFiles, skipSourceFilesFetch]);

  const processFile = useCallback(
    async (file: File) => {
      if (!onUpload) return;
      // 统一在汇聚点校验，让拖拽与文件选择器两个入口共用一条规则；
      // <input accept> 只是 picker 提示，不能挡未授权类型。
      if (!isSupportedSourceFile(file.name)) {
        setError(t("source_unsupported_extension", { filename: file.name }));
        return;
      }
      setFileName(file.name);
      setError(null);

      const wasIdle = sourceFiles.length === 0;

      setPhase("uploading");
      try {
        await onUpload(file);
      } catch (err) {
        setError(t("upload_failed", { message: errMsg(err) }));
        setPhase(sourceFiles.length > 0 ? "has_sources" : "idle");
        return;
      }

      // 后端会规范化 .docx/.epub/.pdf → .txt，可能改名；触发 invalidate 让
      // useEffect 用服务端真实列表回填。
      if (skipSourceFilesFetch) {
        setSourceFiles((prev) => {
          const path = `source/${file.name}`;
          return prev.includes(path) ? prev : [...prev, path];
        });
      } else if (onFilesChanged) {
        onFilesChanged();
      } else {
        useAppStore.getState().invalidateSourceFiles();
      }

      if (wasIdle && onAnalyze && welcomeVariant !== "workspace-v2") {
        setPhase("analyzing");
        try {
          await onAnalyze();
          setPhase("done");
        } catch (err) {
          setError(t("analysis_failed", { message: errMsg(err) }));
          setPhase("has_sources");
        }
        return;
      }

      setPhase("has_sources");
    },
    [onUpload, onAnalyze, onFilesChanged, skipSourceFilesFetch, sourceFiles.length, t, welcomeVariant],
  );

  const startAnalysis = useCallback(async () => {
    if (!onAnalyze) return;
    setError(null);
    setPhase("analyzing");
    try {
      await onAnalyze();
      setPhase("done");
    } catch (err) {
      setError(t("analysis_failed", { message: errMsg(err) }));
      setPhase("has_sources");
    }
  }, [onAnalyze, t]);

  const requestDeleteSourceFile = useCallback(
    (path: string) => {
      const filename = path.replace(/^source\//, "");
      if (!filename || deletingFilename) return;
      setPendingDeletePath(path);
    },
    [deletingFilename],
  );

  const handleConfirmDeleteSourceFile = useCallback(async () => {
    const path = pendingDeletePath;
    if (!path) return;
    const filename = path.replace(/^source\//, "");
    if (!filename) {
      setPendingDeletePath(null);
      return;
    }

    setDeletingFilename(filename);
    setError(null);
    try {
      if (onDeleteSourceFile) {
        await onDeleteSourceFile(filename);
      } else {
        await API.deleteSourceFile(projectName, filename);
      }

      const nextFiles = sourceFiles.filter((f) => f !== path);
      setSourceFiles(nextFiles);
      setPhase(nextFiles.length > 0 ? "has_sources" : "idle");
      setPendingDeletePath(null);

      if (!skipSourceFilesFetch) {
        if (onFilesChanged) {
          onFilesChanged();
        } else {
          useAppStore.getState().invalidateSourceFiles();
        }
      }
    } catch (err) {
      setError(t("delete_failed", { message: errMsg(err) }));
      useAppStore
        .getState()
        .pushToast(t("delete_failed", { message: errMsg(err) }), "error");
    } finally {
      setDeletingFilename(null);
    }
  }, [
    onDeleteSourceFile,
    onFilesChanged,
    pendingDeletePath,
    projectName,
    skipSourceFilesFetch,
    sourceFiles,
    t,
  ]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) voidCall(processFile(file));
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) voidCall(processFile(file));
      e.target.value = "";
    },
    [processFile],
  );

  const isWorkspaceV2Welcome = welcomeVariant === "workspace-v2";

  if (phase === "loading") {
    return (
      <div
        className="flex min-h-[400px] items-center justify-center"
        aria-busy="true"
      >
        <Loader2 className="h-6 w-6 animate-spin text-cyan-400/70" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Welcome heading — display-serif + accent flourish */}
      <header className="text-center">
        {isWorkspaceV2Welcome ? (
          <div className="mx-auto mb-5 flex justify-center">
            <WorkspaceV2Logo size={72} />
          </div>
        ) : (
          <span
            aria-hidden
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.85 0.08 295), oklch(0.70 0.12 280))",
              color: "oklch(0.14 0 0)",
              boxShadow:
                "0 10px 32px -10px var(--color-accent-glow), inset 0 1px 0 oklch(1 0 0 / 0.4)",
            }}
          >
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </span>
        )}
        {isWorkspaceV2Welcome ? (
          <p
            className="mb-3 text-[15px] font-semibold leading-relaxed sm:text-[16px]"
            style={{
              color: phase === "idle" ? "#F8FAFC" : "rgba(226, 232, 240, 0.92)",
              textShadow:
                phase === "idle" ? "0 0 24px rgba(34, 211, 238, 0.18)" : undefined,
            }}
          >
            {phase === "idle" && t("welcome_idle_desc")}
            {phase === "has_sources" && t("welcome_has_sources_desc")}
            {phase === "uploading" && t("uploading_file", { name: fileName })}
            {phase === "analyzing" && t("analyzing_content_desc")}
            {phase === "done" && t("analysis_complete_loading")}
          </p>
        ) : (
          <>
            <h1
              className="display-serif text-[28px] font-semibold leading-tight tracking-tight"
              style={{ color: "var(--color-text)" }}
            >
              {t("welcome_to_project", { title: displayProjectTitle })}
            </h1>
            <p
              className="mt-2 text-[13px] leading-relaxed"
              style={{ color: "var(--color-text-3)" }}
            >
              {phase === "idle" && t("welcome_idle_desc")}
              {phase === "has_sources" && t("welcome_has_sources_desc")}
              {phase === "uploading" && t("uploading_file", { name: fileName })}
              {phase === "analyzing" && t("analyzing_content_desc")}
              {phase === "done" && t("analysis_complete_loading")}
            </p>
          </>
        )}
      </header>

      {/* IDLE: drag-drop zone */}
      {phase === "idle" && (
        <>
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "group focus-ring relative w-full overflow-hidden px-8 py-14 text-center transition-all duration-200",
              isWorkspaceV2Welcome
                ? cn(WS2_WELCOME_DROPZONE_CLASS, isDragging && WS2_WELCOME_DROPZONE_ACTIVE_CLASS)
                : `rounded-2xl border border-dashed ${
                    isDragging
                      ? "border-cyan-400/55"
                      : "border-hairline hover:border-cyan-400/50 hover:shadow-[0_0_0_2px_rgba(34,211,238,0.14)]"
                  }`,
            )}
            style={
              isWorkspaceV2Welcome
                ? undefined
                : {
                    background: isDragging
                      ? "linear-gradient(180deg, oklch(0.76 0.09 295 / 0.12), oklch(0.76 0.09 295 / 0.04))"
                      : CARD_BG,
                    boxShadow: isDragging
                      ? "0 0 0 4px var(--color-accent-dim), inset 0 1px 0 oklch(1 0 0 / 0.04)"
                      : CARD_SHADOW,
                  }
            }
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px transition-opacity duration-200 group-hover:opacity-70"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--color-accent-soft), transparent)",
                opacity: isDragging ? 0.9 : 0.4,
              }}
            />
            <span
              aria-hidden
              className={cn(
                "mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl border transition-colors duration-200",
                isWorkspaceV2Welcome
                  ? cn(
                      "border-white/10 bg-white/5 text-white/45",
                      isDragging
                        ? "border-cyan-400/45 bg-cyan-400/15 text-cyan-300"
                        : "group-hover:border-cyan-400/40 group-hover:text-cyan-300",
                    )
                  : isDragging
                    ? ""
                    : "group-hover:border-cyan-400/40 group-hover:text-cyan-300",
              )}
              style={
                isWorkspaceV2Welcome
                  ? undefined
                  : {
                      background: isDragging
                        ? "var(--color-accent-dim)"
                        : "oklch(0.20 0.011 265 / 0.6)",
                      border: isDragging
                        ? "1px solid var(--color-accent-soft)"
                        : "1px solid var(--color-hairline-soft)",
                      color: isDragging ? "var(--color-accent-2)" : "var(--color-text-3)",
                    }
              }
            >
              <Upload className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className={cn("text-[11.5px]", isWorkspaceV2Welcome ? "text-white/45" : undefined)} style={isWorkspaceV2Welcome ? undefined : { color: "var(--color-text-4)" }}>
              {t("drop_files_here")} {t("click_to_select_files")}
            </p>
            <p
              className={cn(
                "num mt-1.5 text-[10.5px] uppercase tracking-[0.18em]",
                isWorkspaceV2Welcome && "text-white/35",
              )}
              style={isWorkspaceV2Welcome ? undefined : { color: "var(--color-text-4)" }}
            >
              {SOURCE_FILE_FORMATS_LABEL}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={SOURCE_FILE_ACCEPT}
              aria-label={t("upload_script_file_aria")}
              className="hidden"
              onChange={handleFileSelect}
            />
          </button>

          {/* What happens next — two info rows */}
          {!isWorkspaceV2Welcome ? (
          <div className="text-left">
            <div className="mb-2.5 flex items-center gap-2">
              <span
                aria-hidden
                className="h-3 w-[3px] rounded-full"
                style={{
                  background:
                    "linear-gradient(180deg, var(--color-accent-2), var(--color-accent))",
                }}
              />
              <span
                className="text-[10.5px] font-bold uppercase"
                style={{
                  color: "var(--color-text-4)",
                  letterSpacing: "1.0px",
                }}
              >
                {t("what_happens_next")}
              </span>
            </div>
            <div className="space-y-2">
              {[
                { id: "analyze", icon: FileText, textKey: "ai_will_analyze_desc" as const },
                { id: "overview", icon: Sparkles, textKey: "overview_gen_desc" as const },
              ].map(({ id, icon: Icon, textKey }) => (
                <div
                  key={id}
                  className="flex items-start gap-3 rounded-xl px-3.5 py-2.5"
                  style={{
                    border: "1px solid var(--color-hairline-soft)",
                    background:
                      "linear-gradient(180deg, oklch(0.21 0.011 265 / 0.5), oklch(0.18 0.010 265 / 0.35))",
                    boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.03)",
                  }}
                >
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-5 w-5 place-items-center rounded-md"
                    style={{
                      background: "var(--color-accent-dim)",
                      border: "1px solid var(--color-accent-soft)",
                      color: "var(--color-accent-2)",
                    }}
                  >
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  <span
                    className="text-[12px] leading-relaxed"
                    style={{ color: "var(--color-text-2)" }}
                  >
                    {t(textKey)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          ) : null}
        </>
      )}

      {/* HAS_SOURCES: file list + analyze CTA */}
      {phase === "has_sources" && (
        <div className="space-y-4">
          <section
            className="relative overflow-hidden rounded-2xl p-5 text-left"
            style={{
              border: "1px solid var(--color-hairline-soft)",
              background: CARD_BG,
              boxShadow: CARD_SHADOW,
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--color-accent-soft), transparent)",
              }}
            />
            <div className="mb-3 flex items-center gap-2.5">
              <FileText
                className="h-3.5 w-3.5"
                style={{ color: "var(--color-accent-2)" }}
              />
              <span
                className="text-[10.5px] font-bold uppercase"
                style={{
                  color: "var(--color-text-4)",
                  letterSpacing: "1.0px",
                }}
              >
                {t("uploaded_source_files")}
              </span>
              <div className="flex-1" />
              <span
                className="num text-[11px]"
                style={{ color: "var(--color-text-4)" }}
              >
                {sourceFiles.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {sourceFiles.map((f) => {
                const displayName = f.replace(/^source\//, "");
                const isDeleting = deletingFilename === displayName;
                return (
                  <div
                    key={f}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px]"
                    style={{
                      background: "oklch(0.18 0.010 265 / 0.45)",
                      border: "1px solid var(--color-hairline-soft)",
                      color: "var(--color-text-2)",
                    }}
                  >
                    <FileText
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: "var(--color-text-4)" }}
                    />
                    <span className="min-w-0 flex-1 truncate">{displayName}</span>
                    <button
                      type="button"
                      disabled={Boolean(deletingFilename)}
                      onClick={() => requestDeleteSourceFile(f)}
                      aria-label={t("delete_source_file_aria_label", {
                        filename: displayName,
                      })}
                      className="focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-50"
                      style={{ color: "var(--color-text-4)" }}
                      onMouseEnter={(e) => {
                        if (deletingFilename) return;
                        e.currentTarget.style.color =
                          "var(--color-danger, oklch(0.72 0.18 25))";
                        e.currentTarget.style.background = "oklch(0.30 0.10 25 / 0.18)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--color-text-4)";
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={
                  isWorkspaceV2Welcome
                    ? `${W3_ACCENT_BTN_SM_CLS} focus-ring`
                    : "focus-ring inline-flex items-center gap-1.5 rounded-[7px] border px-3.5 py-2 text-[12px] font-semibold transition-[color,background,border-color,transform] motion-safe:hover:-translate-y-px"
                }
                style={
                  isWorkspaceV2Welcome
                    ? W3_ACCENT_BUTTON_STYLE
                    : {
                        borderColor: "var(--color-accent-soft)",
                        background:
                          "linear-gradient(180deg, oklch(0.28 0.04 265 / 0.65), oklch(0.22 0.03 280 / 0.5))",
                        color: "var(--color-accent-2)",
                        boxShadow:
                          "0 0 0 1px oklch(0.76 0.09 295 / 0.12), 0 8px 20px -12px var(--color-accent-glow)",
                      }
                }
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
                {t("add_more_files")}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={SOURCE_FILE_ACCEPT}
              aria-label={t("upload_script_file_aria")}
              className="hidden"
              onChange={handleFileSelect}
            />
          </section>

          {/* Compact drop zone */}
          {!isWorkspaceV2Welcome ? (
          <button
            type="button"
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className="focus-ring w-full rounded-xl px-4 py-3 text-[11.5px] transition-all"
            style={{
              border: isDragging
                ? "1px dashed var(--color-accent-soft)"
                : "1px dashed var(--color-hairline-soft)",
              background: isDragging
                ? "var(--color-accent-dim)"
                : "transparent",
              color: isDragging
                ? "var(--color-accent-2)"
                : "var(--color-text-4)",
            }}
          >
            {t("drop_more_files_here")}
          </button>
          ) : null}

          {/* Primary CTA */}
          <button
            type="button"
            onClick={voidPromise(startAnalysis)}
            className={
              isWorkspaceV2Welcome
                ? `${W3_ACCENT_BTN_CLS} focus-ring w-full justify-center gap-2 rounded-xl px-6 py-3 text-[13px]`
                : "focus-ring relative w-full overflow-hidden rounded-xl px-6 py-3 text-[13px] font-semibold transition-transform hover:translate-y-[-1px] active:translate-y-0"
            }
            style={
              isWorkspaceV2Welcome
                ? W3_ACCENT_BUTTON_STYLE
                : {
                    background:
                      "linear-gradient(180deg, oklch(0.85 0.08 295), oklch(0.70 0.12 280))",
                    color: "oklch(0.14 0 0)",
                    boxShadow:
                      "0 12px 32px -10px var(--color-accent-glow), inset 0 1px 0 oklch(1 0 0 / 0.4)",
                  }
            }
          >
            <span className="relative inline-flex items-center gap-2">
              <ScanText className="h-4 w-4" strokeWidth={2.4} />
              {t("start_ai_analysis")}
            </span>
          </button>
        </div>
      )}

      {/* UPLOADING */}
      {phase === "uploading" && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl p-12 text-center"
          style={{
            border: "1px solid var(--color-hairline-soft)",
            background: CARD_BG,
            boxShadow: CARD_SHADOW,
          }}
        >
          <Loader2
            className="mx-auto h-7 w-7 animate-spin"
            style={{ color: "var(--color-accent-2)" }}
          />
          <p
            className="mt-3 text-[13px]"
            style={{ color: "var(--color-text-2)" }}
          >
            {t("uploading")}
          </p>
          <p
            className="num mt-1 text-[11px]"
            style={{ color: "var(--color-text-4)" }}
          >
            {fileName}
          </p>
        </div>
      )}

      {/* ANALYZING */}
      {phase === "analyzing" && (
        <div
          role="status"
          aria-live="polite"
          className="relative overflow-hidden rounded-2xl p-12 text-center"
          style={{
            border: "1px solid var(--color-accent-soft)",
            background:
              "linear-gradient(180deg, oklch(0.76 0.09 295 / 0.10), oklch(0.76 0.09 295 / 0.04))",
            boxShadow:
              "0 0 0 1px var(--color-accent-dim), inset 0 1px 0 oklch(1 0 0 / 0.05)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--color-accent-2), transparent)",
            }}
          />
          <ScanText
            className="mx-auto h-9 w-9 animate-pulse"
            style={{ color: "var(--color-accent-2)" }}
            strokeWidth={2.4}
          />
          <p
            className="display-serif mt-3 text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--color-text)" }}
          >
            {t("ai_analyzing")}
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: "var(--color-text-3)" }}
          >
            {t("extracting_metadata_desc")}
          </p>
          <div
            className="relative mx-auto mt-5 h-1 w-56 overflow-hidden rounded-full"
            style={{ background: "oklch(0.16 0.010 265 / 0.7)" }}
          >
            <div
              className="absolute inset-y-0 w-1/3 rounded-full animate-progress-pulse"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--color-accent-2), transparent)",
                boxShadow: "0 0 8px var(--color-accent-glow)",
              }}
            />
          </div>
        </div>
      )}

      {/* DONE */}
      {phase === "done" && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl p-12 text-center"
          style={{
            border: "1px solid oklch(0.78 0.10 155 / 0.35)",
            background:
              "linear-gradient(180deg, oklch(0.78 0.10 155 / 0.10), oklch(0.78 0.10 155 / 0.04))",
            boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.04)",
          }}
        >
          <CheckCircle2
            className="mx-auto h-8 w-8"
            style={{ color: "var(--color-good)" }}
            strokeWidth={2}
          />
          <p
            className="display-serif mt-3 text-[15px] font-semibold tracking-tight"
            style={{ color: "var(--color-good)" }}
          >
            {t("analysis_complete")}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="rounded-xl px-4 py-2.5 text-center text-[12px]"
          style={{
            border: "1px solid oklch(0.45 0.18 25 / 0.4)",
            background: "oklch(0.30 0.10 25 / 0.18)",
            color: "oklch(0.85 0.10 25)",
          }}
          role="alert"
        >
          {error}
        </p>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeletePath)}
        tone="danger"
        title={t("delete_source_file_aria_label", {
          filename: pendingDeletePath?.replace(/^source\//, "") ?? "",
        })}
        description={
          pendingDeletePath
            ? t("confirm_delete_source_file", {
                filename: pendingDeletePath.replace(/^source\//, ""),
              })
            : null
        }
        confirmLabel={t("common:delete")}
        loadingLabel={t("common:loading")}
        cancelLabel={t("common:cancel")}
        loading={Boolean(deletingFilename)}
        onCancel={() => {
          if (deletingFilename) return;
          setPendingDeletePath(null);
        }}
        onConfirm={handleConfirmDeleteSourceFile}
      />
    </div>
  );
}
