import { create } from "zustand";
import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import { useWorkspaceV2EndpointCatalogStore } from "./workspace-v2-endpoint-catalog-store";

export interface WorkspaceV2ConfigIssue {
  key: string;
  label: string;
}

async function getWorkspaceV2ConfigStatus(): Promise<{
  issues: WorkspaceV2ConfigIssue[];
  availableMediaTypes: string[];
}> {
  const issues: WorkspaceV2ConfigIssue[] = [];

  const [{ providers }, { providers: customProviders }] = await Promise.all([
    WorkspaceV2SettingsAPI.getProviders(),
    WorkspaceV2SettingsAPI.listCustomProviders(),
  ]);

  const readyProviders = providers.filter((p) => p.status === "ready");

  if (customProviders.length > 0) {
    await useWorkspaceV2EndpointCatalogStore.getState().fetch();
  }
  const endpointToMediaType = useWorkspaceV2EndpointCatalogStore.getState().endpointToMediaType;

  const hasMediaType = (type: string) => {
    const hasPresetProvider = readyProviders.some((p) => p.media_types.includes(type));
    if (hasPresetProvider) return true;
    return customProviders.some((cp) =>
      cp.models.some((m) => endpointToMediaType[m.endpoint] === type && m.is_enabled),
    );
  };

  if (!hasMediaType("video")) {
    issues.push({
      key: "no-video-provider",
      label: "video_provider_not_configured",
    });
  }
  if (!hasMediaType("image")) {
    issues.push({
      key: "no-image-provider",
      label: "image_provider_not_configured",
    });
  }
  if (!hasMediaType("text")) {
    issues.push({
      key: "no-text-provider",
      label: "text_provider_not_configured",
    });
  }

  const availableMediaTypes = ["image", "video", "text", "audio"].filter(hasMediaType);

  return { issues, availableMediaTypes };
}

interface WorkspaceV2ConfigStatusState {
  issues: WorkspaceV2ConfigIssue[];
  availableMediaTypes: string[];
  isComplete: boolean;
  loading: boolean;
  initialized: boolean;
  pendingRefresh: boolean;
  hasMediaType: (type: string) => boolean;
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useWorkspaceV2ConfigStatusStore = create<WorkspaceV2ConfigStatusState>((set, get) => {
  let inflight: Promise<void> | null = null;

  const run = async (): Promise<void> => {
    for (;;) {
      set({ loading: true, pendingRefresh: false });
      try {
        const { issues, availableMediaTypes } = await getWorkspaceV2ConfigStatus();
        set({ issues, availableMediaTypes, isComplete: issues.length === 0, initialized: true });
      } catch {
        set({ initialized: false, availableMediaTypes: [] });
      }
      if (!get().pendingRefresh) {
        set({ loading: false });
        break;
      }
    }
  };

  return {
    issues: [],
    availableMediaTypes: [],
    isComplete: true,
    loading: false,
    initialized: false,
    pendingRefresh: false,

    hasMediaType: (type: string) => get().availableMediaTypes.includes(type),

    fetch: async () => {
      if (get().initialized) return;
      await (inflight ?? get().refresh());
    },

    refresh: () => {
      if (inflight) {
        set({ pendingRefresh: true });
        return inflight;
      }
      inflight = run().finally(() => {
        inflight = null;
      });
      return inflight;
    },
  };
});
