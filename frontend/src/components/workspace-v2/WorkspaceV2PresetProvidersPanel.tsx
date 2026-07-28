import { useCallback, useEffect, useState } from "react";
import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import { WorkspaceV2ProviderDetail } from "@/components/workspace-v2/settings/WorkspaceV2ProviderDetail";
import { ProviderIcon } from "@/components/ui/ProviderIcon";
import { useWorkspaceV2ConfigStatusStore } from "@/stores/workspace-v2-config-status-store";
import type { ProviderInfo } from "@/types";
import { errMsg, voidCall } from "@/utils/async";
import { WorkspaceV2PanelLoading } from "./WorkspaceV2PanelLoading";
import { WorkspaceV2PanelContentTransition } from "./WorkspaceV2PanelContentTransition";
import {
  WORKSPACE_V2_PROVIDER_TABBAR_CLASS,
  WORKSPACE_V2_PROVIDER_TABLIST_CLASS,
  workspaceV2ProviderTabClass,
} from "./workspace-v2-provider-tab-styles";

const STATUS_MAP: Record<string, { color: string; glow?: string }> = {
  ready: {
    color: "var(--color-good)",
    glow: "0 0 6px oklch(0.78 0.10 155 / 0.55)",
  },
  error: {
    color: "var(--color-warm)",
    glow: "0 0 6px var(--color-warm-glow)",
  },
  unconfigured: {
    color: "var(--color-text-4)",
  },
};

function StatusDot({ status }: { status: string }) {
  const { color, glow } = STATUS_MAP[status] ?? STATUS_MAP.unconfigured;
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      aria-hidden
      style={{ background: color, boxShadow: glow }}
    />
  );
}

export function WorkspaceV2PresetProvidersPanel() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadProviders = useCallback(async () => {
    const res = await WorkspaceV2SettingsAPI.getProviders();
    setProviders(res.providers);
    return res.providers;
  }, []);

  const refreshProviders = useCallback(async () => {
    const list = await loadProviders();
    void useWorkspaceV2ConfigStatusStore.getState().refresh();
    return list;
  }, [loadProviders]);

  useEffect(() => {
    let disposed = false;
    setLoadError(null);
    voidCall(
      (async () => {
        try {
          const list = await loadProviders();
          if (disposed) return;
          setSelectedId((current) => {
            if (current && list.some((provider) => provider.id === current)) return current;
            return list[0]?.id ?? null;
          });
        } catch (err) {
          if (!disposed) setLoadError(errMsg(err));
        } finally {
          if (!disposed) setLoading(false);
        }
      })(),
    );
    return () => {
      disposed = true;
    };
  }, [reloadKey, loadProviders]);

  const handleProviderSaved = useCallback(() => {
    void refreshProviders();
  }, [refreshProviders]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  if (loadError) {
    return (
      <div role="alert" className="flex flex-1 flex-col items-start gap-2.5 px-5 py-6">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-warm">
          加载失败
        </span>
        <p className="text-[12.5px] text-text-2">{loadError}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-[7px] border border-hairline-soft bg-bg-grad-a/55 px-3 py-1.5 text-[12px] text-text-2 transition-colors hover:border-hairline hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          重试
        </button>
      </div>
    );
  }

  if (loading) {
    return <WorkspaceV2PanelLoading label="加载供应商..." />;
  }

  if (providers.length === 0) {
    return (
      <div className="flex flex-1 items-center px-5 py-6 text-[12.5px] text-text-3">
        暂无预置供应商
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={WORKSPACE_V2_PROVIDER_TABBAR_CLASS}>
        <div
          role="tablist"
          aria-label="预置供应商列表"
          className={WORKSPACE_V2_PROVIDER_TABLIST_CLASS}
        >
          {providers.map((provider) => {
            const isActive = selectedId === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelectedId(provider.id)}
                className={workspaceV2ProviderTabClass(isActive)}
              >
                <ProviderIcon providerId={provider.id} className="h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[8rem] truncate">{provider.display_name}</span>
                <StatusDot status={provider.status} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        {selectedId ? (
          <WorkspaceV2PanelContentTransition
            transitionKey={selectedId}
            className="flex min-h-0 flex-1 flex-col"
          >
            <WorkspaceV2ProviderDetail
              providerId={selectedId}
              centerLoading
              addCredentialLabel="添加密钥"
              onSaved={handleProviderSaved}
            />
          </WorkspaceV2PanelContentTransition>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-[12.5px] text-text-3">请选择供应商</p>
          </div>
        )}
      </div>
    </div>
  );
}
