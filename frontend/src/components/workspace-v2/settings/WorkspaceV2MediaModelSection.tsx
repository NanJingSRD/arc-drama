
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useWarnUnsaved } from "@/hooks/useWarnUnsaved";
import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import type { SystemConfigSettings, SystemConfigOptions, SystemConfigPatch } from "@/types/system";
import { ProviderModelSelect } from "@/components/ui/ProviderModelSelect";
import { PROVIDER_NAMES } from "@/components/ui/ProviderIcon";
import { useAppStore } from "@/stores/app-store";
import { useWorkspaceV2ConfigStatusStore } from "@/stores/workspace-v2-config-status-store";
import { errMsg } from "@/utils/async";
import { ACCENT_BTN_CLS, ACCENT_BUTTON_STYLE, CARD_STYLE } from "@/components/ui/darkroom-tokens";

interface CardProps {
  kicker: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

function SectionCard({
  kicker,
  title,
  description,
  children,
  embedded = false,
}: CardProps & { embedded?: boolean }) {
  return (
    <div
      className="rounded-[10px] border border-hairline p-5"
      style={CARD_STYLE}
    >
      <div className={embedded ? "mb-3" : "mb-4"}>
        {!(embedded && title) && (
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent-2">
            {kicker}
          </div>
        )}
        {title && (
          <h4
            className={
              embedded
                ? "text-[12.5px] font-medium text-text"
                : "mt-1.5 text-[14px] font-medium text-text"
            }
          >
            {title}
          </h4>
        )}
        {description && (
          <p
            className={
              embedded
                ? "mt-1 text-[12.5px] leading-[1.55] text-text-3"
                : "mt-1 text-[12px] leading-[1.55] text-text-3"
            }
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

const EMBEDDED_FIELD_LABEL_CLS =
  "mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-text-2";

export function WorkspaceV2MediaModelSection({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation("dashboard");

  const TEXT_MODEL_FIELDS = useMemo(
    () =>
      [
        ["text_backend_script", t("script_generation")],
        ["text_backend_overview", t("overview_generation")],
        ["text_backend_style", t("style_analysis")],
      ] as const,
    [t],
  );

  const [settings, setSettings] = useState<SystemConfigSettings | null>(null);
  const [options, setOptions] = useState<SystemConfigOptions | null>(null);
  const [draft, setDraft] = useState<SystemConfigPatch>({});
  const [saving, setSaving] = useState(false);

  const isDirty = Object.keys(draft).length > 0;
  useWarnUnsaved(isDirty);

  const allProviderNames = useMemo(
    () => ({ ...PROVIDER_NAMES, ...(options?.provider_names ?? {}) }),
    [options],
  );

  const fetchConfig = useCallback(async () => {
    const res = await WorkspaceV2SettingsAPI.getSystemConfig();
    setSettings(res.settings);
    setOptions(res.options);
    setDraft({});
  }, []);

  useEffect(() => {
    // mount/依赖变更时异步拉取配置，回调内 setSettings 等（异步 fetch 后回写）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchConfig();
  }, [fetchConfig]);

  const handleSave = useCallback(async () => {
    if (Object.keys(draft).length === 0) return;
    setSaving(true);
    try {
      await WorkspaceV2SettingsAPI.updateSystemConfig(draft);
      await fetchConfig();
      void useWorkspaceV2ConfigStatusStore.getState().refresh();
      useAppStore.getState().pushToast(t("media_config_saved"), "success");
    } catch (err) {
      useAppStore.getState().pushToast(t("save_failed", { message: errMsg(err) }), "error");
    } finally {
      setSaving(false);
    }
  }, [draft, fetchConfig, t]);

  if (!settings || !options) {
    return (
      <div
        className={
          embedded
            ? "flex min-h-[280px] flex-1 items-center justify-center gap-2 text-text-3"
            : "flex items-center gap-2 px-1 py-12 text-text-3"
        }
      >
        <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-accent-2" aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
          {t("common:loading")}
        </span>
      </div>
    );
  }

  const videoBackends: string[] = options.video_backends ?? [];
  const imageBackendsT2I: string[] =
    options.image_backends_t2i ?? options.image_backends ?? [];
  const imageBackendsI2I: string[] =
    options.image_backends_i2i ?? options.image_backends ?? [];
  const textBackends: string[] = options.text_backends ?? [];
  const hasImageBackends = imageBackendsT2I.length > 0 || imageBackendsI2I.length > 0;

  const currentVideo = draft.default_video_backend ?? settings.default_video_backend ?? "";
  const currentImageT2I =
    draft.default_image_backend_t2i ??
    settings.default_image_backend_t2i ??
    settings.default_image_backend ??
    "";
  const currentImageI2I =
    draft.default_image_backend_i2i ??
    settings.default_image_backend_i2i ??
    settings.default_image_backend ??
    "";
  const currentAudio = draft.video_generate_audio ?? settings.video_generate_audio ?? false;

  const emptyHint = (msg: string) => (
    <div
      className={`rounded-[8px] border border-hairline-soft bg-bg-grad-a/45 px-3 py-2.5 text-text-3 ${embedded ? "text-[12.5px]" : "text-[12px]"}`}
    >
      {msg}
    </div>
  );

  const formBody = (
    <>
      {/* Heading */}
      <div>
        {!embedded && (
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent-2">
            Default Routing
          </div>
        )}
        {embedded ? (
          <>
            <h3 className="text-[15px] font-medium leading-[1.55] text-text">
              模型配置
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-text-3">{t("model_selection_desc")}</p>
          </>
        ) : (
          <>
            <h3
              className="font-editorial mt-1"
              style={{
                fontWeight: 400,
                fontSize: 22,
                lineHeight: 1.1,
                letterSpacing: "-0.012em",
                color: "var(--color-text)",
              }}
            >
              {t("model_selection")}
            </h3>
            <p className="mt-1.5 text-[12.5px] leading-[1.6] text-text-3">{t("model_selection_desc")}</p>
          </>
        )}
      </div>

      {/* Video */}
      <SectionCard kicker="Video Channel" title={t("default_video_model")} embedded={embedded}>
        {videoBackends.length > 0 ? (
          <ProviderModelSelect
            value={currentVideo}
            options={videoBackends}
            providerNames={allProviderNames}
            onChange={(v) => setDraft((prev) => ({ ...prev, default_video_backend: v }))}
            allowDefault
            defaultLabel={t("auto_select")}
            defaultHint={t("auto")}
            compact={embedded}
          />
        ) : (
          emptyHint(t("no_video_providers_hint"))
        )}

        {!embedded && (
        <div className="mt-4 flex items-start gap-2.5 text-[12.5px] text-text-2">
          <input
            id="media-generate-audio"
            type="checkbox"
            checked={currentAudio}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, video_generate_audio: e.target.checked }))
            }
            className="mt-0.5 h-3.5 w-3.5 cursor-pointer rounded border-hairline bg-bg-grad-a accent-[var(--color-accent)]"
          />
          <label htmlFor="media-generate-audio" className="flex cursor-pointer flex-col">
            <span>{t("generate_audio")}</span>
            <span className="text-[11px] text-text-4">{t("audio_support_hint")}</span>
          </label>
        </div>
        )}
      </SectionCard>

      {/* Image — 文生图 / 图生图分槽，选项分别来自 image_backends_t2i / image_backends_i2i */}
      <SectionCard kicker="Image Channel" title={t("default_image_model")} embedded={embedded}>
        {hasImageBackends ? (
          <div className="space-y-3.5">
            <div>
              <div
                className={
                  embedded
                    ? EMBEDDED_FIELD_LABEL_CLS
                    : "mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-4"
                }
              >
                {t("image_model_t2i")}
              </div>
              <ProviderModelSelect
                value={currentImageT2I}
                options={imageBackendsT2I}
                providerNames={allProviderNames}
                onChange={(v) =>
                  setDraft((prev) => ({ ...prev, default_image_backend_t2i: v }))
                }
                allowDefault
                defaultLabel={t("auto_select")}
                defaultHint={t("auto")}
                aria-label={t("image_model_t2i")}
                compact={embedded}
              />
            </div>
            <div>
              <div
                className={
                  embedded
                    ? EMBEDDED_FIELD_LABEL_CLS
                    : "mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-4"
                }
              >
                {t("image_model_i2i")}
              </div>
              <ProviderModelSelect
                value={currentImageI2I}
                options={imageBackendsI2I}
                providerNames={allProviderNames}
                onChange={(v) =>
                  setDraft((prev) => ({ ...prev, default_image_backend_i2i: v }))
                }
                allowDefault
                defaultLabel={t("auto_select")}
                defaultHint={t("auto")}
                aria-label={t("image_model_i2i")}
                compact={embedded}
              />
            </div>
          </div>
        ) : (
          emptyHint(t("no_image_providers_hint"))
        )}
      </SectionCard>

      {/* Text */}
      <SectionCard
        kicker="Text Channel"
        title={t("text_models")}
        description={t("text_models_desc")}
        embedded={embedded}
      >
        {textBackends.length > 0 ? (
          <div className="space-y-3.5">
            {TEXT_MODEL_FIELDS.map(([key, label]) => (
              <div key={key}>
                <div
                  className={
                    embedded
                      ? EMBEDDED_FIELD_LABEL_CLS
                      : "mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-4"
                  }
                >
                  {label}
                </div>
                <ProviderModelSelect
                  value={draft[key] ?? settings[key] ?? ""}
                  options={textBackends}
                  providerNames={allProviderNames}
                  onChange={(v) => setDraft((prev) => ({ ...prev, [key]: v }))}
                  allowDefault
                  defaultHint={t("auto")}
                  aria-label={label}
                  compact={embedded}
                />
              </div>
            ))}
          </div>
        ) : (
          emptyHint(t("no_text_providers_hint"))
        )}
      </SectionCard>

      {!embedded && isDirty ? (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={ACCENT_BTN_CLS}
            style={ACCENT_BUTTON_STYLE}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden />
            ) : null}
            {saving ? t("common:saving") : t("common:save")}
          </button>
          <button
            type="button"
            onClick={() => setDraft({})}
            className="rounded-[8px] border border-hairline bg-bg-grad-a/55 px-4 py-2 text-[12.5px] text-text-2 transition-colors hover:border-hairline-strong hover:bg-bg-grad-a hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t("common:reset")}
          </button>
        </div>
      ) : null}
    </>
  );

  const saveFooter = embedded && isDirty && (
    <div className="z-10 shrink-0 pt-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className={ACCENT_BTN_CLS}
          style={ACCENT_BUTTON_STYLE}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden />
          ) : null}
          {saving ? t("common:saving") : t("common:save")}
        </button>
        <button
          type="button"
          onClick={() => setDraft({})}
          className="rounded-[8px] border border-hairline bg-bg-grad-a/55 px-4 py-2 text-[12.5px] text-text-2 transition-colors hover:border-hairline-strong hover:bg-bg-grad-a hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t("common:reset")}
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto">{formBody}</div>
        {saveFooter}
      </div>
    );
  }

  return <div className="space-y-7">{formBody}</div>;
}
