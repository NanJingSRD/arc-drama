import { useState } from "react";
import { X, Copy, Check, Terminal, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth-store";
import { getAppBase } from "@/utils/app-base";

type MediaKind = "storyboard" | "video";

interface CurlInfoDialogProps {
  open: boolean;
  onClose: () => void;
  kind: MediaKind;
  projectName: string;
  segmentId: string;
  scriptFile: string;
  prompt: unknown;
  durationSeconds?: number;
}

export function CurlInfoDialog({
  open,
  onClose,
  kind,
  projectName,
  segmentId,
  scriptFile,
  prompt,
  durationSeconds = 4,
}: CurlInfoDialogProps) {
  const { t } = useTranslation("dashboard");
  const token = useAuthStore((s) => s.token);
  const [copied, setCopied] = useState(false);

  const baseUrl = `${window.location.origin}${getAppBase()}`;
  const endpoint = kind === "storyboard"
    ? `/api/v1/projects/${encodeURIComponent(projectName)}/generate/storyboard/${encodeURIComponent(segmentId)}`
    : `/api/v1/projects/${encodeURIComponent(projectName)}/generate/video/${encodeURIComponent(segmentId)}`;

  const promptData = typeof prompt === "string" || typeof prompt === "object" ? prompt : {};
  const requestBody = kind === "storyboard"
    ? JSON.stringify({ prompt: promptData, script_file: scriptFile }, null, 2)
    : JSON.stringify({ prompt: promptData, script_file: scriptFile, duration_seconds: durationSeconds }, null, 2);

  const curlCommand = token
    ? `curl -X POST ${baseUrl}${endpoint} \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(kind === "storyboard" ? { prompt: promptData, script_file: scriptFile } : { prompt: promptData, script_file: scriptFile, duration_seconds: durationSeconds })}'`
    : `curl -X POST ${baseUrl}${endpoint} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(kind === "storyboard" ? { prompt: promptData, script_file: scriptFile } : { prompt: promptData, script_file: scriptFile, duration_seconds: durationSeconds })}'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPrompt = () => {
    const promptText = typeof prompt === "string" ? prompt : JSON.stringify(prompt, null, 2);
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  const promptText = typeof prompt === "string" ? prompt : JSON.stringify(prompt, null, 2);
  const promptLength = promptText.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: "oklch(0 0 0 / 0.6)", backdropFilter: "blur(8px)" }}
      />
      <div
        className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl"
        style={{
          background: "oklch(0.20 0.012 265 / 0.98)",
          border: "1px solid var(--color-hairline)",
          boxShadow: "0 32px 80px -24px oklch(0 0 0 / 0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--color-hairline-soft)" }}
        >
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4" style={{ color: "var(--color-accent-2)" }} />
            <span
              className="text-[13px] font-semibold"
              style={{ color: "var(--color-text)" }}
            >
              {kind === "storyboard" ? t("curl_dialog_storyboard_title") : t("curl_dialog_video_title")}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring grid h-6 w-6 place-items-center rounded-md transition-colors hover:bg-[oklch(1_0_0_/_0.08)]"
            aria-label={t("close")}
          >
            <X className="h-4 w-4" style={{ color: "var(--color-text-3)" }} />
          </button>
        </div>

        <div className="flex h-[calc(85vh-60px)] flex-col gap-4 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <div
              className="flex h-full flex-col"
              style={{ borderBottom: "1px solid var(--color-hairline-soft)" }}
            >
              <div className="flex items-center justify-between px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5" style={{ color: "var(--color-text-4)" }} />
                  <span
                    className="text-[11px] font-bold uppercase"
                    style={{ color: "var(--color-text-4)", letterSpacing: "0.8px" }}
                  >
                    {t("curl_dialog_curl_command")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors hover:bg-[oklch(1_0_0_/_0.05)]"
                  style={{ color: "var(--color-text-3)" }}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? t("copied") : t("copy")}</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto px-5 pb-3">
                <pre
                  className="whitespace-pre-wrap rounded-lg p-3 text-[12px] font-mono"
                  style={{
                    background: "oklch(0.16 0.010 265 / 0.8)",
                    color: "var(--color-text-2)",
                    border: "1px solid var(--color-hairline-soft)",
                  }}
                >
                  {curlCommand}
                </pre>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" style={{ color: "var(--color-text-4)" }} />
                  <span
                    className="text-[11px] font-bold uppercase"
                    style={{ color: "var(--color-text-4)", letterSpacing: "0.8px" }}
                  >
                    {kind === "storyboard" ? t("curl_dialog_image_prompt") : t("curl_dialog_video_prompt")}
                  </span>
                  <span
                    className="num text-[10px]"
                    style={{ color: "var(--color-text-4)" }}
                  >
                    {promptLength} {t("characters")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="focus-ring inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors hover:bg-[oklch(1_0_0_/_0.05)]"
                  style={{ color: "var(--color-text-3)" }}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? t("copied") : t("copy")}</span>
                </button>
              </div>
              <div className="flex-1 overflow-auto px-5 pb-3">
                <pre
                  className="whitespace-pre-wrap rounded-lg p-3 text-[12px] font-mono leading-relaxed"
                  style={{
                    background: "oklch(0.16 0.010 265 / 0.8)",
                    color: "var(--color-text-2)",
                    border: "1px solid var(--color-hairline-soft)",
                  }}
                >
                  {promptText}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: "1px solid var(--color-hairline-soft)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-md px-4 py-2 text-[12px] font-medium transition-colors hover:bg-[oklch(1_0_0_/_0.08)]"
            style={{
              background: "oklch(0.22 0.011 265 / 0.6)",
              border: "1px solid var(--color-hairline)",
              color: "var(--color-text-2)",
            }}
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}