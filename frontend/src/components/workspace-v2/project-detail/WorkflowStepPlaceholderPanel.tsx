import { useCallback, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Loader2, Sparkles, Video } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  createWorkspaceV2ExportToken,
  getWorkspaceV2MergedVideoDownloadUrl,
} from "@/api/workspace-v2";
import { Button } from "@/components/ui/button";
import { GlassModal } from "@/components/ui/GlassModal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import { useAppStore } from "@/stores/app-store";
import { errMsg } from "@/utils/async";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_V2_PROGRESS_LABELS,
  WORKSPACE_V2_PROGRESS_ORDER,
} from "@/types/workspace-v2";
import {
  WS2_MODAL_PANEL_CLASS,
  WS2_SECTION_HEADER_CLASS,
} from "../workspace-v2-theme";
import { useWorkspaceV2ProjectDetail } from "./WorkspaceV2ProjectDetailContext";
import { Ws2NodeContentLayout } from "./Ws2NodeContentLayout";

const COMPLETED_PIPELINE_STEPS = WORKSPACE_V2_PROGRESS_ORDER.filter(
  (step) => step !== "completed",
);

/** 通过隐藏 <a> 触发浏览器下载，避免 window.open 产生空白标签页 */
function triggerBrowserDownload(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** 工作流「已完成」节点 — 全屏级完成态展示 */
export function WorkflowStepPlaceholderPanel() {
  const { t } = useTranslation("dashboard");
  const { projectId, detail } = useWorkspaceV2ProjectDetail();
  const reduceMotion = useReducedMotion();
  const titleId = useId();
  const exportTitleId = useId();
  /** 制作分镜完成后进度落在本节点时，强化动效与阶段徽章 */
  const isWorkflowComplete = detail?.progress === "completed";

  const projectName = detail?.name?.trim() || projectId;

  const [exportOpen, setExportOpen] = useState(false);
  const [exportEpisode, setExportEpisode] = useState(1);
  const [exporting, setExporting] = useState(false);

  const sortedEpisodes = useMemo(
    () => [...(detail?.episodes ?? [])].sort((a, b) => a.episodeNumber - b.episodeNumber),
    [detail?.episodes],
  );

  const openExportModal = useCallback(() => {
    setExportEpisode(sortedEpisodes[0]?.episodeNumber ?? 1);
    setExportOpen(true);
  }, [sortedEpisodes]);

  /** 与老版一致：选中集 → token → merged-video 下载（单集内所有分镜合成） */
  const handleExportMergedVideo = useCallback(async () => {
    if (!projectId || exporting) return;
    setExporting(true);
    try {
      const { download_token } = await createWorkspaceV2ExportToken(
        projectId,
        projectName,
        "current",
      );
      const url = getWorkspaceV2MergedVideoDownloadUrl(
        projectId,
        projectName,
        exportEpisode,
        download_token,
      );
      triggerBrowserDownload(url);
      setExportOpen(false);
      useAppStore.getState().pushToast(t("merged_video_export_started"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(t("export_failed", { message: errMsg(err) }), "error");
    } finally {
      setExporting(false);
    }
  }, [exportEpisode, exporting, projectId, projectName, t]);

  return (
    <>
      <Ws2NodeContentLayout
        title={WORKSPACE_V2_PROGRESS_LABELS.completed}
        plainBody
        scrollBody={false}
        bodyInnerClassName="p-0"
      >
        <div
          className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
          role="status"
          aria-labelledby={titleId}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_42%,oklch(0.72_0.16_155/0.22),transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_70%,oklch(0.65_0.14_195/0.12),transparent_65%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(oklch(1 0 0 / 0.03) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.03) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 60% 50% at 50% 45%, black, transparent)",
            }}
          />

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-w-md flex-col items-center px-6 text-center"
          >
            <div className="relative mb-5 flex h-28 w-28 items-center justify-center">
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full border border-emerald-400/25",
                  !reduceMotion && "motion-safe:animate-spin",
                )}
                style={{ animationDuration: "12s" }}
              />
              <span
                aria-hidden
                className={cn(
                  "absolute inset-2 rounded-full border border-t-emerald-300/80 border-r-transparent border-b-cyan-400/45 border-l-transparent",
                  !reduceMotion && "motion-safe:animate-spin",
                )}
                style={{ animationDuration: "2.4s" }}
              />
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full bg-emerald-400/12 blur-xl",
                  !reduceMotion && "motion-safe:animate-pulse",
                )}
              />
              <motion.span
                aria-hidden
                initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-full",
                  "bg-linear-to-br from-emerald-400 via-emerald-500 to-teal-600",
                  "shadow-[0_0_28px_oklch(0.72_0.16_155/0.45),inset_0_1px_0_oklch(1_0_0/0.35)]",
                )}
              >
                <Check className="h-7 w-7 text-white" strokeWidth={3} />
              </motion.span>
            </div>

            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.16em] text-emerald-300/90 uppercase">
              <Sparkles className="h-3 w-3" strokeWidth={2.4} aria-hidden />
              {t("workspace_workflow_complete_eyebrow")}
            </p>

            <h3
              id={titleId}
              className={cn(
                "bg-linear-to-r from-emerald-200 via-cyan-200 to-teal-200 bg-clip-text",
                "text-xl font-semibold tracking-tight text-transparent sm:text-2xl",
              )}
            >
              {t("workspace_workflow_complete_title")}
            </h3>

            <p className="mt-2.5 max-w-sm text-xs leading-relaxed text-white/50 sm:text-sm">
              {t("workspace_workflow_complete_desc")}
            </p>

            <motion.div
              aria-hidden
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.35 }}
              className={cn(
                "mt-5 flex flex-wrap items-center justify-center gap-1.5",
                !isWorkflowComplete && "opacity-55",
              )}
            >
              {COMPLETED_PIPELINE_STEPS.map((step) => (
                <span
                  key={step}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-400/25 bg-emerald-400/8 px-2 py-0.5 text-[10px] font-medium text-emerald-300/85"
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  {WORKSPACE_V2_PROGRESS_LABELS[step]}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.35 }}
              className="mt-6"
            >
              <Button
                type="button"
                size="sm"
                onClick={openExportModal}
                disabled={!projectId}
                className="gap-1.5 motion-safe:hover:translate-y-0"
                title={t("export_merged_video")}
              >
                <Video className="h-3.5 w-3.5" strokeWidth={2.4} />
                {t("export_merged_video")}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </Ws2NodeContentLayout>

      <GlassModal
        open={exportOpen}
        onClose={() => {
          if (exporting) return;
          setExportOpen(false);
        }}
        labelledBy={exportTitleId}
        widthClassName="w-[400px]"
        panelClassName={cn(WS2_MODAL_PANEL_CLASS, "flex flex-col overflow-hidden")}
        closeOnBackdrop={!exporting}
        closeOnEscape={!exporting}
      >
        <div
          className={cn(
            WS2_SECTION_HEADER_CLASS,
            "flex shrink-0 items-center justify-between gap-3 px-5 py-3.5",
          )}
        >
          <h3 id={exportTitleId} className="text-[15px] font-semibold text-foreground">
            {t("export_merged_video")}
          </h3>
          <ModalCloseButton onClick={() => setExportOpen(false)} disabled={exporting} />
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("export_merged_video_hint")}
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t("select_episode")}
            </span>
            <select
              value={exportEpisode}
              disabled={exporting || sortedEpisodes.length === 0}
              onChange={(e) => setExportEpisode(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-white/12 bg-black/35 px-3 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
            >
              {sortedEpisodes.length > 0 ? (
                sortedEpisodes.map((ep) => (
                  <option key={ep.id} value={ep.episodeNumber}>
                    {t("episode_with_title", {
                      episode: ep.episodeNumber,
                      title: ep.title,
                    })}
                  </option>
                ))
              ) : (
                <option value={1}>{t("episode_with_title", { episode: 1, title: "" })}</option>
              )}
            </select>
          </label>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-white/6 px-5 py-3.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={exporting}
            onClick={() => setExportOpen(false)}
            className="motion-safe:hover:translate-y-0"
          >
            {t("common:cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={exporting}
            onClick={() => void handleExportMergedVideo()}
            className="gap-1.5 motion-safe:hover:translate-y-0"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.4} />
            ) : (
              <Video className="h-3.5 w-3.5" strokeWidth={2.4} />
            )}
            {exporting ? t("exporting") : t("export_video")}
          </Button>
        </div>
      </GlassModal>
    </>
  );
}
