import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import { WorkspaceV2CustomProviderDetail } from "@/components/workspace-v2/settings/WorkspaceV2CustomProviderDetail";
import { WorkspaceV2CustomProviderForm } from "@/components/workspace-v2/settings/WorkspaceV2CustomProviderForm";
import { useWorkspaceV2ConfigStatusStore } from "@/stores/workspace-v2-config-status-store";
import type { CustomProviderInfo } from "@/types";
import { errMsg, voidCall } from "@/utils/async";
import { WorkspaceV2PanelLoading } from "./WorkspaceV2PanelLoading";
import { WorkspaceV2PanelContentTransition } from "./WorkspaceV2PanelContentTransition";
import {
  WORKSPACE_V2_PROVIDER_TABBAR_CLASS,
  WORKSPACE_V2_PROVIDER_TABLIST_CLASS,
  workspaceV2ProviderTabClass,
} from "./workspace-v2-provider-tab-styles";

type CustomSelection = { kind: "existing"; id: number } | { kind: "new" } | null;

function CustomStatusDot({ provider }: { provider: CustomProviderInfo }) {
  const ready = provider.base_url && provider.api_key_masked;
  return (
    <span
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${ready ? "bg-good" : "bg-text-4"}`}
      aria-hidden
    />
  );
}

export function WorkspaceV2CustomProvidersPanel() {
  const [providers, setProviders] = useState<CustomProviderInfo[]>([]);
  const [selection, setSelection] = useState<CustomSelection>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadProviders = useCallback(async () => {
    const res = await WorkspaceV2SettingsAPI.listCustomProviders();
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
          setSelection((current) => {
            if (current?.kind === "new") return current;
            if (current?.kind === "existing" && list.some((provider) => provider.id === current.id)) {
              return current;
            }
            return list[0] ? { kind: "existing", id: list[0].id } : null;
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

  const handleCreated = useCallback(async () => {
    const list = await refreshProviders();
    if (list.length > 0) {
      setSelection({ kind: "existing", id: list[list.length - 1].id });
    } else {
      setSelection(null);
    }
  }, [refreshProviders]);

  const handleDeleted = useCallback(async () => {
    const list = await refreshProviders();
    setSelection(list[0] ? { kind: "existing", id: list[0].id } : null);
  }, [refreshProviders]);

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
    return <WorkspaceV2PanelLoading label="加载自定义供应商..." />;
  }

  const contentTransitionKey =
    selection?.kind === "existing"
      ? `existing-${selection.id}`
      : selection?.kind === "new"
        ? "new"
        : "empty";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={WORKSPACE_V2_PROVIDER_TABBAR_CLASS}>
        <div
          role="tablist"
          aria-label="自定义供应商列表"
          className={WORKSPACE_V2_PROVIDER_TABLIST_CLASS}
        >
          {providers.map((provider) => {
            const isActive =
              selection?.kind === "existing" && selection.id === provider.id;
            return (
              <button
                key={provider.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSelection({ kind: "existing", id: provider.id })}
                className={workspaceV2ProviderTabClass(isActive)}
              >
                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-hairline-soft bg-bg-grad-b/70 font-mono text-[9px] font-bold uppercase text-text-2">
                  {provider.display_name?.[0] ?? "?"}
                </span>
                <span className="max-w-[8rem] truncate">{provider.display_name}</span>
                <CustomStatusDot provider={provider} />
              </button>
            );
          })}

          <button
            type="button"
            role="tab"
            aria-selected={selection?.kind === "new"}
            onClick={() => setSelection({ kind: "new" })}
            className={workspaceV2ProviderTabClass(selection?.kind === "new")}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>添加供应商</span>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
        <WorkspaceV2PanelContentTransition
          transitionKey={contentTransitionKey}
          className="flex min-h-0 flex-1 flex-col"
        >
          {selection?.kind === "existing" ? (
            <WorkspaceV2CustomProviderDetail
              providerId={selection.id}
              centerLoading
              onDeleted={() => {
                void handleDeleted();
              }}
              onSaved={handleProviderSaved}
            />
          ) : selection?.kind === "new" ? (
            <WorkspaceV2CustomProviderForm
              embedded
              onSaved={() => {
                void handleCreated();
              }}
              onCancel={() => {
                setSelection(providers[0] ? { kind: "existing", id: providers[0].id } : null);
              }}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[12.5px] text-text-3">
                {providers.length === 0 ? "暂无自定义供应商，点击上方添加" : "请选择自定义供应商"}
              </p>
            </div>
          )}
        </WorkspaceV2PanelContentTransition>
      </div>
    </div>
  );
}
