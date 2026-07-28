import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useAutoFocus } from "@/hooks/useAutoFocus";
import { errMsg, voidPromise } from "@/utils/async";
import {
  Check,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Wifi,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { API } from "@/api";
import { useAppStore } from "@/stores/app-store";
import {
  ACCENT_BTN_SM_CLS,
  ACCENT_BUTTON_STYLE,
  CARD_STYLE,
  GHOST_BTN_CLS,
  ICON_BTN_CLS,
  INPUT_CLS,
} from "@/components/ui/darkroom-tokens";
import { FieldLabel } from "@/components/ui/FieldLabel";
import type { CredentialSecretField, ProviderCredential, ProviderTestResult } from "@/types";

// 单 secret provider 的默认凭证字段，供未显式传 secretFields 的调用方兜底（行为同旧版 api_key 表单）。
const DEFAULT_SECRET_FIELDS: CredentialSecretField[] = [{ key: "api_key", label: "API Key" }];

// 已知 secret 凭证字段 → 前端 i18n label key；未知 key 回退后端提供的 label。
const SECRET_FIELD_LABEL_KEY: Record<string, string> = {
  api_key: "api_key_label",
  access_key: "access_key_label",
  secret_key: "secret_key_label",
};

// 解析 secret 字段标签：已知 key 走前端 i18n，未知 key 回退后端提供的 label。
function secretFieldLabel(t: TFunction, field: CredentialSecretField): string {
  const lk = SECRET_FIELD_LABEL_KEY[field.key];
  return lk ? t(lk) : field.label;
}

// 逐字段读取脱敏值（与后端 *_masked 列一一对应）。
function maskedForKey(cred: ProviderCredential, key: string): string | null | undefined {
  if (key === "api_key") return cred.api_key_masked;
  if (key === "access_key") return cred.access_key_masked;
  if (key === "secret_key") return cred.secret_key_masked;
  return undefined;
}

// 工作空间 2.0 弹框内紧凑样式
const COMPACT_INPUT_CLS =
  "w-full rounded-[7px] border border-hairline bg-bg-grad-a/55 px-2.5 py-1.5 text-[12.5px] text-text placeholder:text-text-4 transition-colors hover:border-hairline-strong focus:border-accent/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";

const COMPACT_ACCENT_BTN_CLS =
  "inline-flex items-center gap-1 rounded-[7px] px-2.5 py-1 text-[11px] font-semibold transition-transform motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0";

const COMPACT_GHOST_BTN_CLS =
  "inline-flex items-center gap-1 rounded-[7px] border border-hairline bg-bg-grad-a/55 px-2.5 py-1 text-[11px] text-text-2 transition-colors hover:border-hairline-strong hover:bg-bg-grad-a hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";

const COMPACT_ICON_BTN_CLS =
  "rounded-[5px] p-0.5 text-text-4 transition-colors enabled:hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40";

function formatCredentialTestToastMessage(result: ProviderTestResult, t: TFunction): string {
  if (result.success && result.available_models.length > 0) {
    return `${result.message} ${t("available_models")}${result.available_models.join(", ")}`;
  }
  return result.message;
}

interface RowProps {
  cred: ProviderCredential;
  providerId: string;
  isVertex: boolean;
  supportsBaseUrl: boolean;
  secretFields: CredentialSecretField[];
  onChanged: () => void;
  compact?: boolean;
}

const CredentialRow = memo(function CredentialRow({
  cred,
  providerId,
  isVertex,
  supportsBaseUrl,
  secretFields,
  onChanged,
  compact = false,
}: RowProps) {
  const { t } = useTranslation("dashboard");
  const [editing, setEditing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  // secrets 留空表示保留现有值；逐字段独立编辑。
  const [draft, setDraft] = useState<{ name: string; base_url: string; secrets: Record<string, string> }>({
    name: cred.name,
    base_url: cred.base_url ?? "",
    secrets: {},
  });

  const labelFor = useCallback((field: CredentialSecretField): string => secretFieldLabel(t, field), [t]);
  const pushToast = useCallback(
    (msg: string, tone: "success" | "error") => useAppStore.getState().pushToast(msg, tone),
    [],
  );

  const handleActivate = useCallback(async () => {
    try {
      await API.activateCredential(providerId, cred.id);
      onChanged();
    } catch {
      // 网络错误静默处理
    }
  }, [providerId, cred.id, onChanged]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    if (!compact) setTestResult(null);
    try {
      const result = await API.testProviderConnection(providerId, cred.id);
      if (compact) {
        pushToast(formatCredentialTestToastMessage(result, t), result.success ? "success" : "error");
      } else {
        setTestResult(result);
      }
    } catch (e) {
      const message = errMsg(e);
      if (compact) {
        pushToast(message, "error");
      } else {
        setTestResult({ success: false, available_models: [], message });
      }
    }
    setTesting(false);
  }, [providerId, cred.id, compact, pushToast, t]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await API.deleteCredential(providerId, cred.id);
      onChanged();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [providerId, cred.id, confirmDelete, onChanged]);

  const handleSaveEdit = useCallback(async () => {
    const data: Record<string, string> = {};
    if (draft.name && draft.name !== cred.name) data.name = draft.name;
    for (const field of secretFields) {
      const val = draft.secrets[field.key]?.trim();
      if (val) data[field.key] = val;
    }
    if (draft.base_url !== (cred.base_url ?? "")) data.base_url = draft.base_url;
    if (Object.keys(data).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await API.updateCredential(providerId, cred.id, data);
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }, [draft, cred, providerId, secretFields, onChanged]);

  const editPrefix = `cred-edit-${cred.id}`;
  const inputCls = compact ? COMPACT_INPUT_CLS : INPUT_CLS;
  const accentBtnCls = compact ? COMPACT_ACCENT_BTN_CLS : ACCENT_BTN_SM_CLS;
  const ghostBtnCls = compact ? COMPACT_GHOST_BTN_CLS : GHOST_BTN_CLS;
  const iconBtnCls = compact ? COMPACT_ICON_BTN_CLS : ICON_BTN_CLS;
  const labelSize = compact ? "sm" as const : "default" as const;

  return (
    <div
      className={`relative rounded-[8px] border border-hairline transition-colors hover:border-hairline-strong ${
        compact ? "px-2.5 py-2" : "px-3 py-2.5"
      }`}
      style={
        cred.is_active
          ? {
              ...CARD_STYLE,
              boxShadow:
                "inset 2px 0 0 var(--color-accent), 0 0 18px -10px var(--color-accent-glow)",
            }
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={cred.is_active ? undefined : voidPromise(handleActivate)}
          disabled={cred.is_active}
          aria-label={cred.is_active ? t("currently_active") : t("activate_credential", { name: cred.name })}
          className={`h-2.5 w-2.5 flex-shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            cred.is_active
              ? ""
              : "border border-hairline-strong hover:border-accent-2 cursor-pointer"
          }`}
          style={
            cred.is_active
              ? {
                  background: "var(--color-accent)",
                  boxShadow: "0 0 8px var(--color-accent-glow)",
                }
              : undefined
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`font-medium text-text ${compact ? "text-[12px]" : "text-[13px]"}`}>
              {cred.name}
            </span>
            {cred.is_active && (
              <span
                className={`rounded-full font-mono font-bold uppercase tracking-[0.14em] ${
                  compact ? "px-1 py-px text-[8px]" : "px-1.5 py-0.5 text-[9px]"
                }`}
                style={{
                  background: "var(--color-accent-dim)",
                  color: "var(--color-accent-2)",
                  border: "1px solid var(--color-accent-soft)",
                }}
              >
                {t("active_label")}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {secretFields.map((field) => {
              const masked = maskedForKey(cred, field.key);
              if (!masked) return null;
              return (
                <span key={field.key} className={`font-mono text-text-4 ${compact ? "text-[10px]" : "text-[11px]"}`}>
                  {secretFields.length > 1 ? `${labelFor(field)}: ${masked}` : masked}
                </span>
              );
            })}
            {cred.credentials_filename && (
              <span className={`text-text-4 ${compact ? "text-[10px]" : "text-[11px]"}`}>
                {cred.credentials_filename}
              </span>
            )}
          </div>
          {cred.base_url && (
            <div className={`mt-0.5 truncate font-mono text-text-4 ${compact ? "text-[10px]" : "text-[10.5px]"}`}>
              {cred.base_url}
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={voidPromise(handleTest)}
            disabled={testing}
            aria-label={t("test_credential", { name: cred.name })}
            className={iconBtnCls}
          >
            {testing ? (
              <Loader2 className={`motion-safe:animate-spin ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
            ) : (
              <Wifi className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            )}
          </button>
          {!isVertex && (
            <button
              type="button"
              onClick={() => {
                setEditing(!editing);
                setDraft({ name: cred.name, base_url: cred.base_url ?? "", secrets: {} });
                setTestResult(null);
              }}
              aria-label={t("edit_credential", { name: cred.name })}
              className={iconBtnCls}
            >
              <Edit2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            </button>
          )}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={voidPromise(handleDelete)}
              disabled={deleting}
              aria-label={t("delete_credential", { name: cred.name })}
              className={`${iconBtnCls} hover:text-warm-bright`}
            >
              <Trash2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={voidPromise(handleDelete)}
                disabled={deleting}
                className="inline-flex items-center gap-1 rounded-[6px] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                style={{
                  background: "var(--color-warm-tint)",
                  color: "var(--color-warm-bright)",
                  border: "1px solid var(--color-warm-ring)",
                }}
              >
                {deleting ? (
                  <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
                ) : (
                  t("common:confirm")
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-[6px] border border-hairline bg-bg-grad-a/55 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-3 transition-colors hover:border-hairline-strong hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {t("common:cancel")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Test result */}
      {!compact && testResult && (
        <div
          aria-live="polite"
          className={`mt-2 ml-5.5 rounded-[8px] px-3 py-2 ${compact ? "text-[11px]" : "text-[12px]"}`}
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
          {testResult.message}
          {testResult.success && testResult.available_models.length > 0 && (
            <div className="mt-1 opacity-75">
              {t("available_models")}{testResult.available_models.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Inline edit */}
      {editing && (
        <div
          className={`mt-2.5 ml-5.5 space-y-2.5 rounded-[8px] border border-hairline ${compact ? "p-2.5" : "p-3"}`}
          style={CARD_STYLE}
        >
          <div>
            <FieldLabel htmlFor={`${editPrefix}-name`} size={labelSize}>
              {t("credential_name")}
            </FieldLabel>
            <input
              id={`${editPrefix}-name`}
              name="name"
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className={inputCls}
            />
          </div>
          {secretFields.map((field) => (
            <div key={field.key}>
              <FieldLabel htmlFor={`${editPrefix}-${field.key}`} size={labelSize}>
                {labelFor(field)}
              </FieldLabel>
              <input
                id={`${editPrefix}-${field.key}`}
                name={field.key}
                type="password"
                autoComplete="off"
                value={draft.secrets[field.key] ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, secrets: { ...d.secrets, [field.key]: e.target.value } }))
                }
                placeholder={t("keep_existing_placeholder")}
                className={inputCls}
              />
            </div>
          ))}
          {supportsBaseUrl && (
            <div>
              <FieldLabel htmlFor={`${editPrefix}-baseurl`} size={labelSize}>
                {t("base_url_optional")}
              </FieldLabel>
              <input
                id={`${editPrefix}-baseurl`}
                name="base_url"
                type="url"
                value={draft.base_url}
                onChange={(e) => setDraft((d) => ({ ...d, base_url: e.target.value }))}
                placeholder={t("default_url_placeholder")}
                className={inputCls}
              />
            </div>
          )}
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => void handleSaveEdit()}
              disabled={saving}
              className={accentBtnCls}
              style={ACCENT_BUTTON_STYLE}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {t("common:save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={ghostBtnCls}
            >
              <X className="h-3 w-3" /> {t("common:cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

interface AddFormProps {
  providerId: string;
  isVertex: boolean;
  supportsBaseUrl: boolean;
  secretFields: CredentialSecretField[];
  onCreated: () => void;
  onCancel: () => void;
  compact?: boolean;
}

function AddCredentialForm({
  providerId,
  isVertex,
  supportsBaseUrl,
  secretFields,
  onCreated,
  onCancel,
  compact = false,
}: AddFormProps) {
  const { t } = useTranslation("dashboard");
  const [name, setName] = useState("");
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [baseUrl, setBaseUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const nameRef = useAutoFocus<HTMLInputElement>();
  const inputCls = compact ? COMPACT_INPUT_CLS : INPUT_CLS;
  const accentBtnCls = compact ? COMPACT_ACCENT_BTN_CLS : ACCENT_BTN_SM_CLS;
  const ghostBtnCls = compact ? COMPACT_GHOST_BTN_CLS : GHOST_BTN_CLS;
  const labelSize = compact ? "sm" as const : "default" as const;

  const labelFor = (field: CredentialSecretField): string => secretFieldLabel(t, field);
  const showError = (msg: string) => {
    if (compact) {
      useAppStore.getState().pushToast(msg, "error");
    } else {
      setError(msg);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    if (!compact) setError(null);
    try {
      if (isVertex) {
        const file = fileRef.current?.files?.[0];
        if (!file) {
          showError(t("select_credential_file"));
          setSaving(false);
          return;
        }
        await API.uploadVertexCredential(name, file);
      } else {
        // 所有 secret 字段均必填（按 provider 的 required_keys 渲染）
        if (secretFields.some((f) => !(secrets[f.key] ?? "").trim())) {
          showError(t("enter_credentials_required"));
          setSaving(false);
          return;
        }
        const payload: { name: string; [key: string]: string | undefined } = {
          name: name.trim(),
          base_url: baseUrl || undefined,
        };
        for (const field of secretFields) payload[field.key] = secrets[field.key]?.trim();
        await API.createCredential(providerId, payload);
      }
      onCreated();
    } catch (e) {
      showError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`space-y-2.5 rounded-[8px] border border-hairline ${compact ? "p-2.5" : "p-3"}`}
      style={CARD_STYLE}
    >
      <div>
        <FieldLabel htmlFor="cred-add-name" required size={labelSize}>
          {t("credential_name")}
        </FieldLabel>
        <input
          id="cred-add-name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("credential_name_placeholder")}
          className={inputCls}
          ref={nameRef}
        />
      </div>
      {isVertex ? (
        <div>
          <FieldLabel htmlFor="cred-add-file" required size={labelSize}>
            {t("credential_file")}
          </FieldLabel>
          <button
            id="cred-add-file"
            type="button"
            onClick={() => fileRef.current?.click()}
            className={ghostBtnCls}
          >
            <Upload className="h-3 w-3" />
            {selectedFileName ?? t("select_json_file")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            aria-label={t("import_credential_file_aria")}
            className="hidden"
            onChange={(e) => {
              setError(null);
              setSelectedFileName(e.currentTarget.files?.[0]?.name ?? null);
            }}
          />
        </div>
      ) : (
        <>
          {secretFields.map((field) => (
            <div key={field.key}>
              <FieldLabel htmlFor={`cred-add-${field.key}`} required size={labelSize}>
                {labelFor(field)}
              </FieldLabel>
              <input
                id={`cred-add-${field.key}`}
                name={field.key}
                type="password"
                autoComplete="off"
                value={secrets[field.key] ?? ""}
                onChange={(e) => setSecrets((s) => ({ ...s, [field.key]: e.target.value }))}
                className={inputCls}
              />
            </div>
          ))}
          {supportsBaseUrl && (
            <div>
              <FieldLabel htmlFor="cred-add-baseurl" size={labelSize}>
                {t("base_url_optional")}
              </FieldLabel>
              <input
                id="cred-add-baseurl"
                name="base_url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={t("default_url_placeholder")}
                className={inputCls}
              />
            </div>
          )}
        </>
      )}
      {error && !compact && (
        <p
          className={`rounded-[6px] px-2.5 py-1.5 ${compact ? "text-[10.5px]" : "text-[11.5px]"}`}
          aria-live="polite"
          style={{
            background: "var(--color-warm-tint)",
            color: "var(--color-warm-bright)",
            border: "1px solid var(--color-warm-ring)",
          }}
        >
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving || !name.trim()}
          className={accentBtnCls}
          style={ACCENT_BUTTON_STYLE}
        >
          {saving ? (
            <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          {t("add")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={ghostBtnCls}
        >
          {t("common:cancel")}
        </button>
      </div>
    </div>
  );
}

interface Props {
  providerId: string;
  supportsBaseUrl: boolean;
  secretFields?: CredentialSecretField[];
  onChanged?: () => void;
  /** 覆盖「添加密钥」按钮文案（工作空间 2.0） */
  addCredentialLabel?: string;
  /** 紧凑布局（工作空间 2.0 弹框） */
  compact?: boolean;
}

export function CredentialList({
  providerId,
  supportsBaseUrl,
  secretFields,
  onChanged,
  addCredentialLabel,
  compact = false,
}: Props) {
  const fields = secretFields ?? DEFAULT_SECRET_FIELDS;
  const { t } = useTranslation("dashboard");
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const isVertex = providerId === "gemini-vertex";

  const onChangedRef = useRef(onChanged);
  // 同步最新 onChanged 回调到 ref，供异步刷新后调用
  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  const refresh = useCallback(async () => {
    try {
      const { credentials: creds } = await API.listCredentials(providerId);
      setCredentials(creds);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  const handleChanged = useCallback(async () => {
    await refresh();
    onChangedRef.current?.();
  }, [refresh]);

  useEffect(() => {
    // providerId 变化时重置加载态并重新拉取，属于动作驱动的状态重置
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setShowAdd(false);
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-text-3">
        <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-accent-2" aria-hidden />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
          {t("common:loading")}
        </span>
      </div>
    );
  }

  return (
    <div>
      <div className={`mb-2.5 flex items-center justify-between ${compact ? "mb-2" : ""}`}>
        <div
          className={`font-mono font-bold uppercase tracking-[0.16em] text-accent-2 ${
            compact ? "text-[9px]" : "text-[10px]"
          }`}
        >
          {t("credential_mgmt")}
        </div>
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-1 font-mono font-bold uppercase tracking-[0.14em] text-accent-2 transition-colors hover:bg-accent-dim hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              compact ? "text-[9.5px]" : "text-[10.5px]"
            }`}
          >
            <Plus className="h-3 w-3" /> {addCredentialLabel ?? t("add_credential")}
          </button>
        )}
      </div>

      {credentials.length === 0 && !showAdd && (
        <div className={`rounded-[10px] border border-dashed border-hairline-strong bg-bg-grad-a/45 text-center ${compact ? "px-3 py-5" : "px-4 py-7"}`}>
          <p className={`text-text-3 ${compact ? "text-[11.5px]" : "text-[12.5px]"}`}>{t("no_credentials")}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {/* 子组件 onChanged 通过 voidPromise 包装 ref 持有的最新回调 */}
        {/* eslint-disable-next-line react-hooks/refs */}
        {credentials.map((c) => (
          <CredentialRow
            key={c.id}
            cred={c}
            providerId={providerId}
            isVertex={isVertex}
            supportsBaseUrl={supportsBaseUrl}
            secretFields={fields}
            onChanged={voidPromise(handleChanged)}
            compact={compact}
          />
        ))}
      </div>

      {showAdd && (
        <div className={compact ? "mt-2.5" : "mt-3"}>
          <AddCredentialForm
            providerId={providerId}
            isVertex={isVertex}
            supportsBaseUrl={supportsBaseUrl}
            secretFields={fields}
            compact={compact}
            onCreated={() => {
              setShowAdd(false);
              void handleChanged();
            }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}
    </div>
  );
}
