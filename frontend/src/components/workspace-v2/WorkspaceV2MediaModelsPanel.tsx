import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WorkspaceV2MediaModelSection } from "@/components/workspace-v2/settings/WorkspaceV2MediaModelSection";
import { useWorkspaceV2ConfigStatusStore } from "@/stores/workspace-v2-config-status-store";

export function WorkspaceV2MediaModelsPanel() {
  const { t } = useTranslation("dashboard");
  const configIssues = useWorkspaceV2ConfigStatusStore((s) => s.issues);
  const fetchConfigStatus = useWorkspaceV2ConfigStatusStore((s) => s.fetch);

  useEffect(() => {
    void fetchConfigStatus();
  }, [fetchConfigStatus]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-4">
      {configIssues.length > 0 && (
        <div
          className="mb-4 shrink-0 rounded-[10px] border p-4"
          style={{
            borderColor: "var(--color-warm-ring)",
            background: "var(--color-warm-tint)",
          }}
        >
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-warm-bright">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            {t("config_issues")}
          </div>
          <p className="mb-2.5 text-[12px] leading-[1.55] text-text-2">{t("config_issues_hint")}</p>
          <ul className="space-y-1.5">
            {configIssues.map((issue, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[12px] text-text-3">
                <span
                  aria-hidden
                  className="mt-1.5 h-[5px] w-[5px] shrink-0 rounded-full"
                  style={{ background: "var(--color-warm)" }}
                />
                {t(issue.label)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <WorkspaceV2MediaModelSection embedded />
    </div>
  );
}
