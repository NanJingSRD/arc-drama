import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { Loader2, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import { errMsg } from "@/utils/async";
import type { CustomProviderInfo } from "@/types";
import { useEndpointCatalogStore } from "@/stores/endpoint-catalog-store";
import { formatDurationsLabel } from "@/utils/duration_format";
import { formatDate } from "@/utils/date-format";
import { ACCENT_BTN_SM_CLS, ACCENT_BUTTON_STYLE, CARD_STYLE, GOOD_BTN_CLS, GOOD_BUTTON_STYLE, GHOST_BTN_CLS } from "@/components/ui/darkroom-tokens";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { CustomProviderForm } from "./CustomProviderForm";

const MEDIA_LABELS: Record<string, string> = {
  text: "media_type_text",
  image: "media_type_image",
  video: "media_type_video",
  audio: "media_type_audio",
};

const READY_BADGE_STYLE: CSSProperties = {
  background: "oklch(0.30 0.10 155 / 0.18)",
  color: "var(--color-good)",
  border: "1px solid oklch(0.45 0.10 155 / 0.40)",
  boxShadow: "0 0 14px -6px oklch(0.55 0.10 155 / 0.50)",
};

const UNCONFIGURED_BADGE_STYLE: CSSProperties = {
  background: "var(--color-bg-grad-a)",
  color: "var(--color-text-3)",
  border: "1px solid var(--color-hairline)",
};

const LEGACY_STICKY_FOOTER_STYLE: CSSProperties = {
  background:
    "linear-gradient(180deg, oklch(0.20 0.011 265 / 0.65), oklch(0.15 0.010 265 / 0.85))",
};

interface CustomProviderDetailProps {
  providerId: number;
  onDeleted: () => void;
  onSaved: () => void;
  /** 加载态垂直居中（工作空间 2.0 弹框内容区） */
  centerLoading?: boolean;
}

export function CustomProviderDetail({
  providerId,
  onDeleted,
  onSaved,
  centerLoading = false,
}: CustomProviderDetailProps) {
  const { t, i18n } = useTranslation("dashboard");
  const endpointToMediaType = useEndpointCatalogStore((s) => s.endpointToMediaType);
  const fetchEndpointCatalog = useEndpointCatalogStore((s) => s.fetch);
  useEffect(() => {
    void fetchEndpointCatalog();
  }, [fetchEndpointCatalog]);
  const [provider, setProvider] = useState<CustomProviderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const pushToast = useCallback(
    (msg: string, tone: "success" | "error") => useAppStore.getState().pushToast(msg, tone),
    [],
  );
  const showError = useCallback((msg: string) => useAppStore.getState().pushToast(msg, "error"), []);

  const fetchProvider = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.getCustomProvider(providerId);
      setProvider(data);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    // providerId 切换时重置编辑/删除/测试态并重新拉取（动作驱动重置）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditing(false);
    setConfirmDelete(false);
    if (!centerLoading) setTestResult(null);
    void fetchProvider();
  }, [fetchProvider, centerLoading]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      await API.deleteCustomProvider(providerId);
      onDeleted();
    } catch (e) {
      showError(t("delete_failed", { message: errMsg(e) }));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [providerId, onDeleted, showError, t]);

  const handleTest = useCallback(async () => {
    if (!provider) return;
    setTesting(true);
    if (!centerLoading) setTestResult(null);
    try {
      const res = await API.testCustomConnectionById(provider.id);
      if (centerLoading) {
        pushToast(res.message, res.success ? "success" : "error");
      } else {
        setTestResult(res);
      }
    } catch (e) {
      const message = errMsg(e, t("connection_test_failed"));
      if (centerLoading) {
        pushToast(message, "error");
      } else {
        setTestResult({ success: false, message });
      }
    } finally {
      setTesting(false);
    }
  }, [provider, centerLoading, pushToast, t]);

  const handleFormSaved = useCallback(() => {
    setEditing(false);
    void fetchProvider();
    onSaved();
  }, [fetchProvider, onSaved]);

  if (loading || !provider) {
    return (
      <div
        className={
          centerLoading
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

  if (editing) {
    return (
      <CustomProviderForm
        existing={provider}
        onSaved={handleFormSaved}
        onCancel={() => setEditing(false)}
        embedded={centerLoading}
      />
    );
  }

  const ready = provider.base_url && provider.api_key_masked;

  const testResultBanner =
    !centerLoading && testResult ? (
    <div
      aria-live="polite"
      className="flex items-start gap-2 rounded-[8px] px-3 py-2 text-[12px]"
      style={
        testResult.success
          ? {
              background: "oklch(0.30 0.10 155 / 0.15)",
              color: "var(--color-good)",
              border: "1px solid oklch(0.45 0.10 155 / 0.30)",
            }
          : {
              background: "var(--color-warm-tint)",
              color: "var(--color-warm-bright)",
              border: "1px solid var(--color-warm-ring)",
            }
      }
    >
      {testResult.success ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{testResult.message}</span>
    </div>
  ) : null;

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={ACCENT_BTN_SM_CLS}
        style={ACCENT_BUTTON_STYLE}
      >
        <Pencil className="h-3.5 w-3.5" />
        {t("common:edit")}
      </button>

      <button
        type="button"
        onClick={() => void handleTest()}
        disabled={testing}
        className={GOOD_BTN_CLS}
        style={GOOD_BUTTON_STYLE}
      >
        {testing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" />
            {t("testing_connection")}
          </>
        ) : (
          t("test_connection")
        )}
      </button>

      {!confirmDelete ? (
        <PrimaryButton
          tone="danger"
          size="sm"
          onClick={() => setConfirmDelete(true)}
          leadingIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
        >
          {t("common:delete")}
        </PrimaryButton>
      ) : (
        <div className="flex items-center gap-1.5">
          <PrimaryButton
            tone="danger"
            size="sm"
            onClick={() => void handleDelete()}
            disabled={deleting}
            leadingIcon={
              deleting ? (
                <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin" aria-hidden />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              )
            }
          >
            {t("confirm_delete_provider")}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className={GHOST_BTN_CLS}
          >
            {t("common:cancel")}
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className={centerLoading ? "flex min-h-0 flex-1 flex-col" : undefined}>
      <div
        className={
          centerLoading
            ? "min-h-0 flex-1 overflow-y-auto"
            : "p-6 pb-24"
        }
      >
        <div className={centerLoading ? "w-full space-y-6" : "max-w-2xl space-y-6"}>
          {/* Header */}
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-[6px] font-mono text-[11px] font-bold uppercase text-text-2"
              style={{
                background: "var(--color-bg-grad-a)",
                border: "1px solid var(--color-hairline-strong)",
              }}
            >
              {provider.display_name?.[0] ?? "?"}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[15px] font-medium leading-[1.55] text-text">
                  {provider.display_name}
                </h3>
                <span
                  className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={ready ? READY_BADGE_STYLE : UNCONFIGURED_BADGE_STYLE}
                >
                  {ready ? t("status_connected") : t("status_unconfigured")}
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-text-4">
                {provider.discovery_format === "openai" ? "OPENAI" : "GOOGLE"} ·{" "}
                <span className="normal-case tracking-normal">{provider.base_url}</span>
              </p>
            </div>
          </div>

          {!centerLoading && (
          <div className="rounded-[10px] border border-hairline p-5" style={CARD_STYLE}>
            <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent-2">
              Connection
            </div>
            <div className="space-y-2 text-[12.5px]">
              <div className="flex justify-between gap-4">
                <span className="text-text-3">{t("discovery_format_label")}</span>
                <span className="text-text">
                  {provider.discovery_format === "openai" ? "OpenAI" : "Google"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-3">{t("base_url")}</span>
                <span className="truncate font-mono text-[11.5px] text-text">{provider.base_url}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-3">{t("api_key_label")}</span>
                <span className="font-mono text-[11.5px] text-text">
                  {provider.api_key_masked || t("api_key_not_set")}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-3">{t("created_at")}</span>
                <span className="text-text">
                  {formatDate(provider.created_at, i18n.language, { year: "numeric", month: "2-digit", day: "2-digit" })}
                </span>
              </div>
            </div>
          </div>
          )}

          {/* Models */}
          {provider.models.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent-2">
                {t("model_list")}
              </div>
              <div className="space-y-1.5">
                {provider.models.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-2 rounded-[8px] border border-hairline px-3 py-2 text-[12.5px] ${
                      m.is_enabled ? "text-text" : "text-text-4 opacity-60"
                    }`}
                    style={CARD_STYLE}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]">
                      {m.model_id}
                    </span>
                    <span className="rounded-full border border-hairline-soft bg-bg-grad-a/55 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-3">
                      {(() => {
                        const media = endpointToMediaType[m.endpoint];
                        return MEDIA_LABELS[media] ? t(MEDIA_LABELS[media]) : media;
                      })()}
                    </span>
                    {m.is_default && (
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{
                          background: "var(--color-accent-dim)",
                          color: "var(--color-accent-2)",
                          border: "1px solid var(--color-accent-soft)",
                        }}
                      >
                        {t("default_label")}
                      </span>
                    )}
                    {m.supported_durations && m.supported_durations.length > 0 && (
                      <span className="font-mono text-[10.5px] text-text-4">
                        {t("supported_durations_summary", {
                          value: formatDurationsLabel(m.supported_durations),
                        })}
                      </span>
                    )}
                    {!m.is_enabled && (
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-4">
                        {t("model_disabled")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!centerLoading ? testResultBanner : null}

        </div>
      </div>

      <div
        className={
          centerLoading
            ? "z-10 shrink-0 pt-3"
            : "sticky bottom-0 z-10 border-t border-hairline px-6 py-3 backdrop-blur"
        }
        style={centerLoading ? undefined : LEGACY_STICKY_FOOTER_STYLE}
      >
        <div className="flex flex-wrap items-center gap-3">{actionButtons}</div>
      </div>
    </div>
  );
}
