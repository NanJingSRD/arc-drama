import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Maximize2, Pencil } from "lucide-react";
import {
  deleteWorkspaceV2SourceFile,
  fetchWorkspaceV2ProjectOverview,
  generateWorkspaceV2Overview,
  mapWorkspaceV2ScriptImportOverview,
  updateWorkspaceV2Overview,
  uploadWorkspaceV2SourceFile,
  workspaceV2ScriptImportHasOverview,
  type WorkspaceV2ScriptImportOverviewResponse,
} from "@/api/workspace-v2";
import { WelcomeCanvas } from "@/components/canvas/WelcomeCanvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassModal } from "@/components/ui/GlassModal";
import { ModalCloseButton } from "@/components/ui/ModalCloseButton";
import {
  WS2_ACCENT_BTN_SM_CLS,
  WS2_CARD_CLASS,
  WS2_DETAIL_TEXT_MUTED,
  WS2_GHOST_BTN_CLS,
  WS2_MODAL_PANEL_CLASS,
  WS2_SECTION_HEADER_CLASS,
  WS2_SECTION_HEADER_TITLE_CLS,
} from "../workspace-v2-theme";
import { useAppStore } from "@/stores/app-store";
import type { WorkspaceV2ProjectDetail } from "@/types/workspace-v2";
import { WORKSPACE_V2_PROGRESS_LABELS } from "@/types/workspace-v2";
import { errMsg, voidCall } from "@/utils/async";
import { cn } from "@/lib/utils";
import { WorkspaceV2WelcomeTips } from "./WorkspaceV2WelcomeTips";
import { useWorkspaceV2ProjectDetail } from "./WorkspaceV2ProjectDetailContext";
import { Ws2NodeContentLayout } from "./Ws2NodeContentLayout";

interface ProjectOverviewPanelProps {
  detail: WorkspaceV2ProjectDetail;
}

type EditingSection = "description" | "worldview" | null;

const OVERVIEW_TAG_BASE_CLS = "gap-1.5 text-[11px] font-medium";
const OVERVIEW_FIELD_LABEL_CLS = "text-[11px] font-medium text-white/45";
const OVERVIEW_EDIT_FIELD_CLS = cn(
  "rounded-none border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80",
  "outline-none transition duration-200",
  "hover:border-white/16 hover:bg-white/8",
  "focus-visible:border-cyan-400/40 focus-visible:bg-white/8 focus-visible:ring-0",
);

function OverviewSection({
  title,
  headerAction,
  headerActionReveal = "hover-or-focus",
  children,
  fill = false,
  className,
}: {
  title: string;
  headerAction?: ReactNode;
  /** hover：仅悬停卡片时显示；hover-or-focus：悬停或内部聚焦时显示（编辑按钮默认） */
  headerActionReveal?: "hover" | "hover-or-focus" | "always";
  children: ReactNode;
  /** 占满剩余高度，内容区内部滚动 */
  fill?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        WS2_CARD_CLASS,
        "group/section",
        fill && "flex min-h-0 flex-1 flex-col",
        className,
      )}
    >
      <CardHeader
        className={cn(
          WS2_SECTION_HEADER_CLASS,
          "flex shrink-0 flex-row items-center justify-between gap-3 px-5 py-3",
        )}
      >
        <CardTitle className={WS2_SECTION_HEADER_TITLE_CLS}>{title}</CardTitle>
        {headerAction ? (
          <div
            className={cn(
              "shrink-0 transition-opacity duration-200",
              headerActionReveal === "always"
                ? "opacity-100"
                : cn(
                    "pointer-events-none opacity-0",
                    "group-hover/section:pointer-events-auto group-hover/section:opacity-100",
                    headerActionReveal === "hover-or-focus" &&
                      "group-focus-within/section:pointer-events-auto group-focus-within/section:opacity-100",
                  ),
            )}
          >
            {headerAction}
          </div>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          "px-5 py-4",
          fill && "flex min-h-0 flex-1 flex-col overflow-hidden",
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

function SectionEditButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        WS2_GHOST_BTN_CLS,
        "h-8 gap-1.5 px-2.5 text-xs font-medium text-white/55 hover:text-white/85",
      )}
    >
      <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
      {label}
    </Button>
  );
}

function EditActions({
  saving,
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
  cancelLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <Button
        type="button"
        size="sm"
        disabled={saving}
        onClick={onSave}
        className={WS2_ACCENT_BTN_SM_CLS}
      >
        {saveLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={saving}
        onClick={onCancel}
        className={cn(WS2_GHOST_BTN_CLS, "h-8 px-3 text-xs text-white/55 hover:text-white/85")}
      >
        {cancelLabel}
      </Button>
    </div>
  );
}

export function ProjectOverviewPanel({ detail }: ProjectOverviewPanelProps) {
  const { t } = useTranslation(["dashboard", "common"]);
  const tRef = useRef(t);
  tRef.current = t;
  const { projectId, refresh } = useWorkspaceV2ProjectDetail();

  const synopsisFieldId = useId();
  const genreFieldId = useId();
  const themeFieldId = useId();
  const worldviewFieldId = useId();

  const [editingSection, setEditingSection] = useState<EditingSection>(null);
  const [saving, setSaving] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [scriptImportData, setScriptImportData] =
    useState<WorkspaceV2ScriptImportOverviewResponse | null>(null);
  const [filesVersion, setFilesVersion] = useState(0);
  const [descriptionDraft, setDescriptionDraft] = useState({
    synopsis: "",
    genre: "",
    theme: "",
  });
  const [worldviewDraft, setWorldviewDraft] = useState("");
  const [sourceTextOpen, setSourceTextOpen] = useState(false);
  const sourceTextTitleId = useId();
  const scriptImportDataRef = useRef<WorkspaceV2ScriptImportOverviewResponse | null>(null);

  const loadScriptImportOverview = useCallback(async () => {
    const data = await fetchWorkspaceV2ProjectOverview(projectId);
    scriptImportDataRef.current = data;
    setScriptImportData(data);
    return data;
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setOverviewLoading(true);
    voidCall((async () => {
      try {
        await loadScriptImportOverview();
      } catch (err) {
        if (!cancelled) {
          useAppStore
            .getState()
            .pushToast(
              tRef.current("dashboard:load_failed", { message: errMsg(err) }),
              "error",
            );
        }
      } finally {
        if (!cancelled) setOverviewLoading(false);
      }
    })());
    return () => {
      cancelled = true;
    };
  }, [loadScriptImportOverview]);

  const mapped = scriptImportData
    ? mapWorkspaceV2ScriptImportOverview(scriptImportData)
    : null;
  const showWelcome =
    !overviewLoading && !workspaceV2ScriptImportHasOverview(scriptImportData);

  // 复用面板已拉取的 overview，避免 WelcomeCanvas 挂载时再打一次 GET /overview
  const fetchSourceFiles = useCallback(async () => {
    const cached = scriptImportDataRef.current;
    if (cached) {
      return (cached.source_files ?? []).map((file) => `source/${file.name}`);
    }
    const data = await loadScriptImportOverview();
    return (data.source_files ?? []).map((file) => `source/${file.name}`);
  }, [loadScriptImportOverview]);

  const handleUpload = useCallback(
    async (file: File) => {
      const res = await uploadWorkspaceV2SourceFile(projectId, file);
      const filename = res.filename ?? file.name;
      useAppStore
        .getState()
        .pushToast(tRef.current("source_upload_success_toast", { filename }), "success");
      await loadScriptImportOverview();
    },
    [loadScriptImportOverview, projectId],
  );

  const handleDeleteSourceFile = useCallback(
    async (filename: string) => {
      await deleteWorkspaceV2SourceFile(projectId, filename);
      await loadScriptImportOverview();
    },
    [loadScriptImportOverview, projectId],
  );

  const handleFilesChanged = useCallback(() => {
    setFilesVersion((version) => version + 1);
  }, []);

  const handleAnalyze = useCallback(async () => {
    await generateWorkspaceV2Overview(projectId);
    await loadScriptImportOverview();
    // 刷新详情以更新进度/节点样式；不自动跳转，由用户点工作流节点进入
    await refresh();
  }, [loadScriptImportOverview, projectId, refresh]);

  const enterDescriptionEdit = useCallback(() => {
    setDescriptionDraft({
      synopsis: mapped?.description ?? "",
      genre: mapped?.genre ?? "",
      theme: mapped?.theme ?? "",
    });
    setEditingSection("description");
  }, [mapped?.description, mapped?.genre, mapped?.theme]);

  const enterWorldviewEdit = useCallback(() => {
    setWorldviewDraft(mapped?.worldviewSetting ?? "");
    setEditingSection("worldview");
  }, [mapped?.worldviewSetting]);

  const handleSaveDescription = useCallback(async () => {
    setSaving(true);
    try {
      await updateWorkspaceV2Overview(projectId, {
        synopsis: descriptionDraft.synopsis.trim(),
        genre: descriptionDraft.genre.trim(),
        theme: descriptionDraft.theme.trim(),
      });
      await loadScriptImportOverview();
      await refresh();
      setEditingSection(null);
      useAppStore.getState().pushToast(tRef.current("overview_updated"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(tRef.current("update_overview_failed", { message: errMsg(err) }), "error");
    } finally {
      setSaving(false);
    }
  }, [descriptionDraft, loadScriptImportOverview, projectId, refresh]);

  const handleSaveWorldview = useCallback(async () => {
    setSaving(true);
    try {
      await updateWorkspaceV2Overview(projectId, {
        world_setting: worldviewDraft.trim(),
      });
      await loadScriptImportOverview();
      await refresh();
      setEditingSection(null);
      useAppStore.getState().pushToast(tRef.current("overview_updated"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(tRef.current("update_overview_failed", { message: errMsg(err) }), "error");
    } finally {
      setSaving(false);
    }
  }, [loadScriptImportOverview, projectId, refresh, worldviewDraft]);

  const description = mapped?.description?.trim();
  const genre = mapped?.genre?.trim();
  const theme = mapped?.theme?.trim();
  const worldviewSetting = mapped?.worldviewSetting?.trim();
  const sourceText = mapped?.sourceText?.trim() ?? "";
  const hasTags = Boolean(genre || theme);
  const isEditingDescription = editingSection === "description";
  const isEditingWorldview = editingSection === "worldview";
  const projectTitle = mapped?.title || detail.name;
  const showOverviewContent = !overviewLoading && !showWelcome;

  const welcomeTips = showWelcome ? (
    <WorkspaceV2WelcomeTips
      line1={t("ai_will_analyze_desc")}
      line2={t("overview_gen_desc")}
    />
  ) : null;

  return (
    <Ws2NodeContentLayout
      title={WORKSPACE_V2_PROGRESS_LABELS.script_import}
      titleAside={welcomeTips}
      plainBody
      scrollBody={!showOverviewContent}
      bodyInnerClassName={
        showOverviewContent
          ? "flex min-h-0 flex-1 flex-col overflow-hidden px-0.5 pt-1 pb-3"
          : "px-0.5 py-1"
      }
    >
      {overviewLoading ? (
        <div
          className="flex min-h-[280px] items-center justify-center"
          aria-busy="true"
        >
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400/70" />
        </div>
      ) : showWelcome ? (
        <div className="flex flex-col gap-6 pb-1">
          <WelcomeCanvas
            projectName={projectId}
            projectTitle={projectTitle}
            onUpload={handleUpload}
            onAnalyze={handleAnalyze}
            onDeleteSourceFile={handleDeleteSourceFile}
            fetchSourceFiles={fetchSourceFiles}
            filesVersion={filesVersion}
            onFilesChanged={handleFilesChanged}
            welcomeVariant="workspace-v2"
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 flex-col gap-4">
            <OverviewSection
              title="项目描述"
              headerAction={
                !isEditingDescription ? (
                  <SectionEditButton
                    label={t("edit_overview")}
                    disabled={saving || isEditingWorldview}
                    onClick={enterDescriptionEdit}
                  />
                ) : null
              }
            >
              {isEditingDescription ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor={synopsisFieldId} className={OVERVIEW_FIELD_LABEL_CLS}>
                      {t("synopsis_label")}
                    </label>
                    <textarea
                      id={synopsisFieldId}
                      value={descriptionDraft.synopsis}
                      onChange={(event) =>
                        setDescriptionDraft((draft) => ({
                          ...draft,
                          synopsis: event.target.value,
                        }))
                      }
                      disabled={saving}
                      rows={5}
                      className={cn(OVERVIEW_EDIT_FIELD_CLS, "mt-1 w-full resize-y leading-relaxed")}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={genreFieldId} className={OVERVIEW_FIELD_LABEL_CLS}>
                        {t("genre_label")}
                      </label>
                      <input
                        id={genreFieldId}
                        type="text"
                        value={descriptionDraft.genre}
                        onChange={(event) =>
                          setDescriptionDraft((draft) => ({
                            ...draft,
                            genre: event.target.value,
                          }))
                        }
                        disabled={saving}
                        className={cn(OVERVIEW_EDIT_FIELD_CLS, "mt-1 w-full")}
                      />
                    </div>
                    <div>
                      <label htmlFor={themeFieldId} className={OVERVIEW_FIELD_LABEL_CLS}>
                        {t("theme_label")}
                      </label>
                      <input
                        id={themeFieldId}
                        type="text"
                        value={descriptionDraft.theme}
                        onChange={(event) =>
                          setDescriptionDraft((draft) => ({
                            ...draft,
                            theme: event.target.value,
                          }))
                        }
                        disabled={saving}
                        className={cn(OVERVIEW_EDIT_FIELD_CLS, "mt-1 w-full")}
                      />
                    </div>
                  </div>
                  <EditActions
                    saving={saving}
                    saveLabel={saving ? t("common:saving") : t("common:save")}
                    cancelLabel={t("common:cancel")}
                    onSave={() => void handleSaveDescription()}
                    onCancel={() => setEditingSection(null)}
                  />
                </div>
              ) : (
                <>
                  <p className={cn("text-sm leading-relaxed", WS2_DETAIL_TEXT_MUTED)}>
                    {description || "暂无项目描述"}
                  </p>
                  {hasTags ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {genre ? (
                        <Badge
                          variant="outline"
                          className={OVERVIEW_TAG_BASE_CLS + " border-indigo-400/40 bg-indigo-500/15"}
                        >
                          <span className={WS2_DETAIL_TEXT_MUTED}>{t("genre_prefix")}</span>
                          {genre}
                        </Badge>
                      ) : null}
                      {theme ? (
                        <Badge
                          variant="outline"
                          className={OVERVIEW_TAG_BASE_CLS + " border-cyan-400/40 bg-cyan-500/15"}
                        >
                          <span className={WS2_DETAIL_TEXT_MUTED}>{t("theme_prefix")}</span>
                          {theme}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </OverviewSection>

            <OverviewSection
              title={t("world_setting_label")}
              headerAction={
                !isEditingWorldview ? (
                  <SectionEditButton
                    label={t("edit_overview")}
                    disabled={saving || isEditingDescription}
                    onClick={enterWorldviewEdit}
                  />
                ) : null
              }
            >
              {isEditingWorldview ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor={worldviewFieldId} className={OVERVIEW_FIELD_LABEL_CLS}>
                      {t("world_setting_label")}
                    </label>
                    <textarea
                      id={worldviewFieldId}
                      value={worldviewDraft}
                      onChange={(event) => setWorldviewDraft(event.target.value)}
                      disabled={saving}
                      rows={5}
                      className={cn(OVERVIEW_EDIT_FIELD_CLS, "mt-1 w-full resize-y leading-relaxed")}
                    />
                  </div>
                  <EditActions
                    saving={saving}
                    saveLabel={saving ? t("common:saving") : t("common:save")}
                    cancelLabel={t("common:cancel")}
                    onSave={() => void handleSaveWorldview()}
                    onCancel={() => setEditingSection(null)}
                  />
                </div>
              ) : (
                <p className={cn("text-sm leading-relaxed", WS2_DETAIL_TEXT_MUTED)}>
                  {worldviewSetting || "暂无世界观设定"}
                </p>
              )}
            </OverviewSection>
          </div>

          <OverviewSection
            title={t("ws2_novel_original_text")}
            fill
            className="mt-1 mb-1"
            headerActionReveal="hover"
            headerAction={
              sourceText ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSourceTextOpen(true)}
                  aria-label={t("ws2_view_full_original_text")}
                  className={cn(
                    WS2_GHOST_BTN_CLS,
                    "h-8 gap-1.5 px-2.5 text-xs font-medium text-white/55 hover:text-white/85",
                  )}
                >
                  <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {t("ws2_view_full_original_text")}
                </Button>
              ) : null
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto">
              <pre
                className={cn(
                  "whitespace-pre-wrap wrap-break-word font-sans text-sm leading-relaxed",
                  WS2_DETAIL_TEXT_MUTED,
                )}
              >
                {sourceText || t("no_original_text")}
              </pre>
            </div>
          </OverviewSection>
        </div>
      )}

      <GlassModal
        open={sourceTextOpen}
        onClose={() => setSourceTextOpen(false)}
        labelledBy={sourceTextTitleId}
        widthClassName="w-full max-w-3xl"
        panelClassName={cn(WS2_MODAL_PANEL_CLASS, "flex max-h-[85vh] flex-col overflow-hidden")}
      >
        <div
          className={cn(
            WS2_SECTION_HEADER_CLASS,
            "relative flex shrink-0 items-center justify-between gap-3 px-5 py-3.5",
          )}
        >
          <h3
            id={sourceTextTitleId}
            className="pr-10 text-[15px] font-semibold text-foreground"
          >
            {t("ws2_novel_original_text")}
          </h3>
          <ModalCloseButton
            onClick={() => setSourceTextOpen(false)}
            className="absolute right-4 top-3.5"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <pre
            className={cn(
              "whitespace-pre-wrap wrap-break-word font-sans text-sm leading-relaxed",
              WS2_DETAIL_TEXT_MUTED,
            )}
          >
            {sourceText || t("no_original_text")}
          </pre>
        </div>
      </GlassModal>
    </Ws2NodeContentLayout>
  );
}
