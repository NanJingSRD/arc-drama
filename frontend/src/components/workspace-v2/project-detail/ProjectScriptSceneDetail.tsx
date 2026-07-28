import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Pencil, X } from "lucide-react";
import {
  parseWorkspaceV2DialogueEntries,
  resolveWorkspaceV2SceneVisualDescription,
  updateWorkspaceV2Script,
  type WorkspaceV2ProcessedScene,
  type WorkspaceV2ScriptEpisode,
} from "@/api/workspace-v2";
import { DropdownPill } from "@/components/ui/DropdownPill";
import { W3, w3KickerStyle } from "@/components/workspace";
import { useAppStore } from "@/stores/app-store";
import { errMsg } from "@/utils/async";
import { cn } from "@/lib/utils";
import { WS2_CARD_STYLE, WS2_SECTION_HEADER_STYLE } from "../workspace-v2-theme";

interface DialogueDraft {
  speaker: string;
  line: string;
}

interface SceneDraft {
  sceneId: string;
  durationSeconds: number | "";
  visual: string;
  action: string;
  narration: string;
  dialogue: DialogueDraft[];
  /** 只读展示，不参与提交 */
  characters: string[];
}

export type ScriptDetailEditMode =
  | { type: "view" }
  | { type: "all" }
  | { type: "scene"; sceneId: string };

export interface ProjectScriptSceneDetailHandle {
  save: () => Promise<void>;
  cancel: () => void;
}

export interface ProjectScriptSceneDetailEditState {
  canSave: boolean;
  saving: boolean;
}

interface ProjectScriptSceneDetailProps {
  scenes: WorkspaceV2ProcessedScene[];
  projectId: string;
  episodeNumber: number;
  /** 整集原始数据，供模式 1 整集保存 */
  episode?: WorkspaceV2ScriptEpisode | null;
  editMode: ScriptDetailEditMode;
  onEditModeChange: (mode: ScriptDetailEditMode) => void;
  /** 底部操作栏：可保存 / 保存中 */
  onEditStateChange?: (state: ProjectScriptSceneDetailEditState) => void;
  /** 保存成功后回调（刷新列表 / 同步弹框快照） */
  onSaved?: (scenes: WorkspaceV2ProcessedScene[]) => void;
}

function SceneField({
  label,
  children,
  variant = "default",
}: {
  label: string;
  children: ReactNode;
  variant?: "default" | "narration";
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={w3KickerStyle()}>
        {label}
      </div>
      <div
        className={
          variant === "narration"
            ? "text-[13px] italic leading-[1.7] text-text-3"
            : "text-[13px] leading-[1.7] text-text-2"
        }
      >
        {children}
      </div>
    </div>
  );
}

const FIELD_TEXTAREA_CLASS =
  "w-full resize-y rounded-md border border-white/12 bg-black/35 px-2.5 py-2 text-[13px] leading-[1.7] text-text-2 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40";

function sceneToDraft(scene: WorkspaceV2ProcessedScene, index: number): SceneDraft {
  const sceneId = scene.scene_id?.trim() || `S${String(index + 1).padStart(2, "0")}`;
  const duration =
    typeof scene.duration_seconds === "number" && Number.isFinite(scene.duration_seconds)
      ? Math.floor(scene.duration_seconds)
      : "";
  return {
    sceneId,
    durationSeconds: duration,
    visual: resolveWorkspaceV2SceneVisualDescription(scene),
    action: scene.action?.trim() ?? "",
    narration: scene.narration?.trim() ?? "",
    dialogue: parseWorkspaceV2DialogueEntries(scene.dialogue).map((entry) => ({
      speaker: entry.speaker,
      line: entry.line,
    })),
    characters: (scene.characters_in_scene ?? []).map((name) => name.trim()).filter(Boolean),
  };
}

function draftsEqual(a: SceneDraft, b: SceneDraft): boolean {
  return (
    a.sceneId === b.sceneId &&
    a.durationSeconds === b.durationSeconds &&
    a.visual === b.visual &&
    a.action === b.action &&
    a.narration === b.narration &&
    a.dialogue.length === b.dialogue.length &&
    a.dialogue.every(
      (entry, i) =>
        entry.speaker === b.dialogue[i]?.speaker && entry.line === b.dialogue[i]?.line,
    )
  );
}

function draftToScenePatch(draft: SceneDraft): Partial<WorkspaceV2ProcessedScene> {
  return {
    visual_description: draft.visual.trim(),
    action: draft.action.trim(),
    narration: draft.narration.trim(),
    dialogue: draft.dialogue.map((entry) => ({
      speaker: entry.speaker,
      line: entry.line,
    })),
    duration_seconds: draft.durationSeconds === "" ? undefined : draft.durationSeconds,
  };
}

function mergeSceneWithDraft(
  scene: WorkspaceV2ProcessedScene,
  draft: SceneDraft,
): WorkspaceV2ProcessedScene {
  return {
    ...scene,
    ...draftToScenePatch(draft),
    scene_id: draft.sceneId,
  };
}

function buildEpisodeScriptPayload(
  episode: WorkspaceV2ScriptEpisode | null | undefined,
  episodeNumber: number,
  scenes: WorkspaceV2ProcessedScene[],
  drafts: SceneDraft[],
): Record<string, unknown> {
  const nextScenes = scenes.map((scene, index) => {
    const draft = drafts[index];
    return draft ? mergeSceneWithDraft(scene, draft) : scene;
  });
  const base =
    episode && typeof episode === "object"
      ? ({ ...episode } as Record<string, unknown>)
      : {};
  delete base.metadata;
  return {
    ...base,
    episode: episodeNumber,
    episode_number: episodeNumber,
    scenes: nextScenes,
  };
}

export const ProjectScriptSceneDetail = forwardRef<
  ProjectScriptSceneDetailHandle,
  ProjectScriptSceneDetailProps
>(function ProjectScriptSceneDetail(
  {
    scenes,
    projectId,
    episodeNumber,
    episode,
    editMode,
    onEditModeChange,
    onEditStateChange,
    onSaved,
  },
  ref,
) {
  const { t } = useTranslation(["dashboard", "common"]);
  const baseline = useMemo(
    () => scenes.map((scene, index) => sceneToDraft(scene, index)),
    [scenes],
  );
  const [drafts, setDrafts] = useState<SceneDraft[]>(baseline);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts(baseline);
  }, [baseline]);

  const editingAll = editMode.type === "all";
  const editingSceneId = editMode.type === "scene" ? editMode.sceneId : null;
  const anyEditing = editMode.type !== "view";

  const dirtyIndexes = useMemo(() => {
    const indexes: number[] = [];
    for (let i = 0; i < drafts.length; i++) {
      const draft = drafts[i];
      const original = baseline[i];
      if (draft && original && !draftsEqual(draft, original)) indexes.push(i);
    }
    return indexes;
  }, [drafts, baseline]);

  const canSave = useMemo(() => {
    if (!projectId || dirtyIndexes.length === 0) return false;
    if (editingAll) return true;
    if (!editingSceneId) return false;
    return dirtyIndexes.some((i) => drafts[i]?.sceneId === editingSceneId);
  }, [projectId, dirtyIndexes, editingAll, editingSceneId, drafts]);

  useEffect(() => {
    onEditStateChange?.({ canSave, saving });
  }, [canSave, saving, onEditStateChange]);

  const cancelEditing = () => {
    setDrafts(baseline);
    onEditModeChange({ type: "view" });
  };

  const handleSave = async () => {
    if (saving || !canSave) return;
    setSaving(true);
    try {
      if (editingAll) {
        // 模式 1：整集更新
        await updateWorkspaceV2Script(projectId, episodeNumber, {
          script: buildEpisodeScriptPayload(episode, episodeNumber, scenes, drafts),
        });
      } else if (editingSceneId) {
        // 模式 2：单场景整对象替换（确保 visual/action/narration/dialogue 等剧本字段都写入）
        const index = drafts.findIndex((d) => d.sceneId === editingSceneId);
        const draft = index >= 0 ? drafts[index] : undefined;
        const original = index >= 0 ? scenes[index] : undefined;
        if (!draft || !original) throw new Error("场景不存在");
        await updateWorkspaceV2Script(projectId, episodeNumber, {
          scene_id: draft.sceneId,
          scene: mergeSceneWithDraft(original, draft) as Record<string, unknown>,
        });
      } else {
        return;
      }

      const nextScenes = scenes.map((scene, index) => {
        const draft = drafts[index];
        if (!draft) return scene;
        if (editingAll || draft.sceneId === editingSceneId) {
          return mergeSceneWithDraft(scene, draft);
        }
        return scene;
      });
      onSaved?.(nextScenes);
      onEditModeChange({ type: "view" });
      useAppStore.getState().pushToast(t("saved"), "success");
    } catch (err) {
      useAppStore
        .getState()
        .pushToast(t("save_failed", { message: errMsg(err) }), "error");
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      save: handleSave,
      cancel: cancelEditing,
    }),
    // handleSave / cancelEditing close over latest drafts & mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseline, canSave, drafts, editingAll, editingSceneId, episode, episodeNumber, projectId, scenes, saving],
  );

  if (scenes.length === 0) {
    return (
      <p className="text-[13px] text-text-3">{t("workspace_script_episode_empty_preview")}</p>
    );
  }

  const updateDraft = (index: number, patch: Partial<SceneDraft>) => {
    setDrafts((prev) =>
      prev.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    );
  };

  const updateDialogueLine = (sceneIndex: number, dialogueIndex: number, line: string) => {
    setDrafts((prev) =>
      prev.map((draft, i) => {
        if (i !== sceneIndex) return draft;
        return {
          ...draft,
          dialogue: draft.dialogue.map((entry, j) =>
            j === dialogueIndex ? { ...entry, line } : entry,
          ),
        };
      }),
    );
  };

  const updateDialogueSpeaker = (
    sceneIndex: number,
    dialogueIndex: number,
    speaker: string,
  ) => {
    setDrafts((prev) =>
      prev.map((draft, i) => {
        if (i !== sceneIndex) return draft;
        return {
          ...draft,
          dialogue: draft.dialogue.map((entry, j) =>
            j === dialogueIndex ? { ...entry, speaker } : entry,
          ),
        };
      }),
    );
  };

  const removeDialogueEntry = (sceneIndex: number, dialogueIndex: number) => {
    setDrafts((prev) =>
      prev.map((draft, i) => {
        if (i !== sceneIndex) return draft;
        return {
          ...draft,
          dialogue: draft.dialogue.filter((_, j) => j !== dialogueIndex),
        };
      }),
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft, index) => {
        const isEditing =
          editingAll || (editingSceneId != null && editingSceneId === draft.sceneId);
        const showViewDuration =
          !isEditing &&
          draft.durationSeconds !== "" &&
          typeof draft.durationSeconds === "number";

        return (
          <article
            key={`${draft.sceneId}-${index}`}
            className={cn(
              "group relative overflow-hidden rounded-[10px] border border-transparent transition-[border-color,box-shadow] duration-200",
              "hover:border-cyan-400/40 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.12)]",
              isEditing && "border-cyan-400/45 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]",
            )}
            style={WS2_CARD_STYLE}
          >
            <header
              className="flex items-center justify-between gap-3 px-4 py-2.5"
              style={WS2_SECTION_HEADER_STYLE}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="font-mono text-[11px] font-bold tracking-[0.14em]"
                  style={w3KickerStyle()}
                >
                  {draft.sceneId}
                </span>
                {isEditing ? (
                  <label className="flex items-center gap-1 text-[10px] text-text-3">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={draft.durationSeconds}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          updateDraft(index, { durationSeconds: "" });
                          return;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n) || n <= 0) return;
                        updateDraft(index, { durationSeconds: Math.floor(n) });
                      }}
                      className="h-6 w-14 rounded-md border border-white/12 bg-black/35 px-1.5 text-right font-mono text-[11px] text-text-2 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                      aria-label="时长（秒）"
                    />
                    <span>s</span>
                  </label>
                ) : showViewDuration ? (
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] text-text-3"
                    style={{
                      border: `1px solid ${W3.borderSoft}`,
                      background: "rgba(8, 14, 32, 0.55)",
                    }}
                  >
                    {draft.durationSeconds}s
                  </span>
                ) : null}
              </div>
              {!anyEditing ? (
                <button
                  type="button"
                  onClick={() =>
                    onEditModeChange({ type: "scene", sceneId: draft.sceneId })
                  }
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-all",
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                    "hover:bg-white/8 hover:text-cyan-200/90",
                  )}
                  title={t("common:edit")}
                  aria-label={t("common:edit")}
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              ) : null}
            </header>

            <div className="space-y-3.5 px-4 py-3.5">
              {draft.characters.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {draft.characters.map((name) => (
                    <span
                      key={name}
                      className="inline-flex rounded-md px-2 py-0.5 text-[11px] text-text-2"
                      style={{
                        border: `1px solid ${W3.borderSoft}`,
                        background: "rgba(99, 102, 241, 0.1)",
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : null}

              {isEditing ? (
                <>
                  <SceneField label={t("workspace_script_scene_visual")}>
                    <textarea
                      value={draft.visual}
                      onChange={(e) => updateDraft(index, { visual: e.target.value })}
                      rows={3}
                      className={FIELD_TEXTAREA_CLASS}
                    />
                  </SceneField>
                  <SceneField label={t("workspace_script_scene_action")}>
                    <textarea
                      value={draft.action}
                      onChange={(e) => updateDraft(index, { action: e.target.value })}
                      rows={2}
                      className={FIELD_TEXTAREA_CLASS}
                    />
                  </SceneField>
                  <SceneField label={t("workspace_script_scene_narration")}>
                    <textarea
                      value={draft.narration}
                      onChange={(e) => updateDraft(index, { narration: e.target.value })}
                      rows={2}
                      placeholder="旁白内容"
                      className={FIELD_TEXTAREA_CLASS}
                    />
                  </SceneField>
                  <div className="space-y-2">
                    <div
                      className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={w3KickerStyle()}
                    >
                      {t("workspace_script_scene_dialogue")}
                    </div>
                    {draft.dialogue.length > 0 ? (
                      <div className="space-y-2">
                        {draft.dialogue.map((entry, dialogueIndex) => {
                          const speakerOptions = [
                            ...new Set(draft.characters.filter(Boolean)),
                          ];
                          // 已有说话人不在本镜角色里时，仍放进选项以免丢失
                          if (
                            entry.speaker.trim() &&
                            !speakerOptions.includes(entry.speaker.trim())
                          ) {
                            speakerOptions.unshift(entry.speaker.trim());
                          }
                          return (
                            <div
                              key={`dlg-${dialogueIndex}`}
                              className="flex items-start gap-1.5 rounded-[8px] px-2.5 py-2"
                              style={{
                                border: `1px solid ${W3.borderSoft}`,
                                background: "rgba(6, 10, 24, 0.72)",
                                boxShadow: "inset 0 1px 0 rgba(34,211,238,0.05)",
                              }}
                            >
                              {speakerOptions.length > 0 ? (
                                <DropdownPill
                                  value={entry.speaker}
                                  options={speakerOptions}
                                  onChange={(speaker) =>
                                    updateDialogueSpeaker(index, dialogueIndex, speaker)
                                  }
                                  renderOption={(v) =>
                                    v.trim() ? v : t("speaker_placeholder")
                                  }
                                  matchTriggerWidth
                                  className="h-8 w-[6.5rem] shrink-0 [&_button]:h-8 [&_button]:w-full [&_button]:justify-between [&_button]:rounded-md [&_button]:px-2 [&_button]:py-0 [&_button]:text-[12px]"
                                />
                              ) : (
                                <span className="inline-flex h-8 w-[6.5rem] shrink-0 items-center rounded-md border border-white/10 px-2 text-[12px] text-text-3">
                                  {entry.speaker.trim() || t("speaker_placeholder")}
                                </span>
                              )}
                              <textarea
                                value={entry.line}
                                onChange={(e) =>
                                  updateDialogueLine(index, dialogueIndex, e.target.value)
                                }
                                placeholder={t("line_placeholder")}
                                rows={2}
                                className="min-h-[2.75rem] min-w-0 flex-1 resize-y rounded-md border border-white/10 bg-black/25 px-2 py-1.5 text-[13px] leading-[1.65] text-text-2 outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                              />
                              <button
                                type="button"
                                onClick={() => removeDialogueEntry(index, dialogueIndex)}
                                aria-label={t("dialogue_remove")}
                                title={t("dialogue_remove")}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground/85"
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[12px] text-text-3">—</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {draft.visual ? (
                    <SceneField label={t("workspace_script_scene_visual")}>
                      {draft.visual}
                    </SceneField>
                  ) : null}
                  {draft.action ? (
                    <SceneField label={t("workspace_script_scene_action")}>
                      {draft.action}
                    </SceneField>
                  ) : null}
                  {draft.narration ? (
                    <SceneField label={t("workspace_script_scene_narration")} variant="narration">
                      {draft.narration}
                    </SceneField>
                  ) : null}
                  {draft.dialogue.length > 0 ? (
                    <div className="space-y-2">
                      <div
                        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                        style={w3KickerStyle()}
                      >
                        {t("workspace_script_scene_dialogue")}
                      </div>
                      <div className="space-y-2">
                        {draft.dialogue.map((entry, dialogueIndex) => (
                          <div
                            key={`${entry.speaker}-${dialogueIndex}`}
                            className="rounded-[8px] px-3 py-2.5"
                            style={{
                              border: `1px solid ${W3.borderSoft}`,
                              background: "rgba(6, 10, 24, 0.72)",
                              boxShadow: "inset 0 1px 0 rgba(34,211,238,0.05)",
                            }}
                          >
                            <div className="text-[12px] font-semibold text-text">
                              {entry.speaker}
                            </div>
                            <p className="mt-1 text-[13px] leading-[1.65] text-text-2">
                              {entry.line}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
});
