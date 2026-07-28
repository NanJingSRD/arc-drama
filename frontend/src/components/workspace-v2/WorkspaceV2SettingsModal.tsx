import { useEffect, useId, useState } from "react";
import { Film, Plug, Settings, X } from "lucide-react";
import { GlassModal } from "@/components/ui/GlassModal";
import { Button } from "@/components/ui/button";
import {
  W3_NAV_ACTIVE_CLS,
  W3_NAV_INACTIVE_CLS,
} from "@/components/workspace";
import {
  WORKSPACE_V2_MODAL_PANEL_CLASS,
  WORKSPACE_V2_MODAL_WIDTH_CLASS,
} from "./workspace-v2-modal-layout";
import { WS2_MODAL_PANEL_CLASS } from "./workspace-v2-theme";
import { WorkspaceV2CustomProvidersPanel } from "./WorkspaceV2CustomProvidersPanel";
import { WorkspaceV2MediaModelsPanel } from "./WorkspaceV2MediaModelsPanel";
import { WorkspaceV2PresetProvidersPanel } from "./WorkspaceV2PresetProvidersPanel";
import { cn } from "@/lib/utils";

type SettingsNav = "providers" | "models";
type ProviderTab = "preset" | "custom";

const PROVIDER_TAB_LABELS: Record<ProviderTab, string> = {
  preset: "预置供应商",
  custom: "自定义供应商",
};

const PROVIDER_TABS: { id: ProviderTab; label: string }[] = [
  { id: "preset", label: PROVIDER_TAB_LABELS.preset },
  { id: "custom", label: PROVIDER_TAB_LABELS.custom },
];

interface WorkspaceV2SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function WorkspaceV2SettingsModal({ open, onClose }: WorkspaceV2SettingsModalProps) {
  const titleId = useId();
  const [activeNav, setActiveNav] = useState<SettingsNav>("providers");
  const [providerTab, setProviderTab] = useState<ProviderTab>("preset");

  useEffect(() => {
    if (open) return;
    setActiveNav("providers");
    setProviderTab("preset");
  }, [open]);

  const selectProviders = () => {
    setActiveNav("providers");
    setProviderTab("preset");
  };

  return (
    <GlassModal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      widthClassName={WORKSPACE_V2_MODAL_WIDTH_CLASS}
      backdropStyle={{ background: "oklch(0 0 0 / 0.65)" }}
      panelClassName={cn(WS2_MODAL_PANEL_CLASS, WORKSPACE_V2_MODAL_PANEL_CLASS)}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-8 w-8 place-items-center rounded-xl border border-border bg-muted/40"
            aria-hidden
          >
            <Settings className="h-4 w-4 text-cyan-300" />
          </span>
          <h2 id={titleId} className="text-lg font-semibold text-foreground">
            设置
          </h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav
          aria-label="设置导航"
          className="flex h-full w-[168px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-border px-3 py-5"
        >
          <div
            className={
              "rounded-[10px] border p-1.5 transition-[border-color,background,box-shadow] " +
              (activeNav === "providers"
                ? "border-accent/30 bg-bg-grad-a/45 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04),0_0_24px_-14px_var(--color-accent-glow)]"
                : "border-hairline bg-bg-grad-a/30")
            }
          >
            <button
              type="button"
              onClick={selectProviders}
              aria-current={activeNav === "providers" ? "page" : undefined}
              aria-pressed={activeNav === "providers"}
              className={
                "group flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[12.5px] transition-[color,background] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 " +
                (activeNav === "providers"
                  ? "font-semibold text-slate-50"
                  : "font-medium text-text-2 hover:bg-bg-grad-a/55 hover:text-text")
              }
            >
              <span
                className={
                  "grid h-6 w-6 shrink-0 place-items-center rounded-[6px] border transition-colors " +
                  (activeNav === "providers"
                    ? "border-accent/35 bg-accent-dim text-slate-100"
                    : "border-hairline bg-bg-grad-b/60 text-text-3 group-hover:text-text-2")
                }
              >
                <Plug className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">供应商</span>
            </button>

            <div
              role="tablist"
              aria-label="供应商类型"
              className="mt-1.5 flex flex-col gap-1 border-t border-hairline/70 px-1 pt-1.5"
            >
              {PROVIDER_TABS.map(({ id, label }) => {
                const isActive = activeNav === "providers" && providerTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => {
                      setActiveNav("providers");
                      setProviderTab(id);
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-px",
                      isActive
                        ? "bg-gradient-to-br from-[#06B6D4] to-[#6366F1] font-semibold text-primary-foreground shadow-sm"
                        : "font-medium text-muted-foreground hover:bg-accent/10 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            variant={activeNav === "models" ? "default" : "ghost"}
            onClick={() => setActiveNav("models")}
            aria-current={activeNav === "models" ? "page" : undefined}
            aria-pressed={activeNav === "models"}
            className="h-auto w-full justify-start gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px]"
          >
            <Film className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">模型配置</span>
          </Button>
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {activeNav === "providers" ? (
            <div
              role="tabpanel"
              aria-label={PROVIDER_TAB_LABELS[providerTab]}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              {providerTab === "preset" ? (
                <WorkspaceV2PresetProvidersPanel />
              ) : (
                <WorkspaceV2CustomProvidersPanel />
              )}
            </div>
          ) : (
            <div
              role="tabpanel"
              aria-label="模型配置"
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <WorkspaceV2MediaModelsPanel />
            </div>
          )}
        </div>
      </div>
    </GlassModal>
  );
}
