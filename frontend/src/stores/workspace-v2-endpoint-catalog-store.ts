import { create } from "zustand";
import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import type { EndpointDescriptor, ImageCap, MediaType } from "@/types";

export interface EndpointPath {
  method: string;
  path: string;
}

interface WorkspaceV2EndpointCatalogState {
  endpoints: EndpointDescriptor[];
  endpointToMediaType: Record<string, MediaType>;
  endpointPaths: Record<string, EndpointPath>;
  endpointToImageCapabilities: Record<string, ImageCap[]>;
  loading: boolean;
  initialized: boolean;
  fetch: () => Promise<void>;
  refresh: () => Promise<void>;
}

function deriveMaps(endpoints: EndpointDescriptor[]): {
  endpointToMediaType: Record<string, MediaType>;
  endpointPaths: Record<string, EndpointPath>;
  endpointToImageCapabilities: Record<string, ImageCap[]>;
} {
  const endpointToMediaType: Record<string, MediaType> = {};
  const endpointPaths: Record<string, EndpointPath> = {};
  const endpointToImageCapabilities: Record<string, ImageCap[]> = {};
  for (const e of endpoints) {
    endpointToMediaType[e.key] = e.media_type;
    endpointPaths[e.key] = { method: e.request_method, path: e.request_path_template };
    if (e.image_capabilities) {
      endpointToImageCapabilities[e.key] = e.image_capabilities;
    }
  }
  return { endpointToMediaType, endpointPaths, endpointToImageCapabilities };
}

export const useWorkspaceV2EndpointCatalogStore = create<WorkspaceV2EndpointCatalogState>(
  (set, get) => ({
    endpoints: [],
    endpointToMediaType: {},
    endpointPaths: {},
    endpointToImageCapabilities: {},
    loading: false,
    initialized: false,

    fetch: async () => {
      if (get().initialized || get().loading) return;
      await get().refresh();
    },

    refresh: async () => {
      if (get().loading) return;
      set({ loading: true });
      try {
        const res = await WorkspaceV2SettingsAPI.listEndpointCatalog();
        const { endpointToMediaType, endpointPaths, endpointToImageCapabilities } = deriveMaps(
          res.endpoints,
        );
        set({
          endpoints: res.endpoints,
          endpointToMediaType,
          endpointPaths,
          endpointToImageCapabilities,
          loading: false,
          initialized: true,
        });
      } catch {
        set({ loading: false });
      }
    },
  }),
);
