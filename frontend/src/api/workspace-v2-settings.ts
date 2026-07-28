/**
 * 工作空间 2.0 设置 API（供应商、模型配置、密钥等）— 独立后端 1242。
 * 与老工作空间 `API`（1240）完全隔离。
 */

import type {
  CustomProviderCreateRequest,
  CustomProviderInfo,
  CustomProviderModelInfo,
  CustomProviderModelInput,
  DiscoveredModel,
  EndpointDescriptor,
  GetSystemConfigResponse,
  ProviderConfigDetail,
  ProviderCredential,
  ProviderInfo,
  ProviderTestResult,
  SystemConfigPatch,
} from "@/types";
import { WORKSPACE_V2_API_BASE } from "@/utils/app-base";
import {
  requestWorkspaceV2,
  throwIfWorkspaceV2NotOk,
  withWorkspaceV2Auth,
} from "./workspace-v2-client";

export const WorkspaceV2SettingsAPI = {
  getSystemConfig(): Promise<GetSystemConfigResponse> {
    return requestWorkspaceV2("/system/config");
  },

  updateSystemConfig(patch: SystemConfigPatch): Promise<GetSystemConfigResponse> {
    return requestWorkspaceV2("/system/config", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  getProviders(): Promise<{ providers: ProviderInfo[] }> {
    return requestWorkspaceV2("/providers");
  },

  getProviderConfig(id: string): Promise<ProviderConfigDetail> {
    return requestWorkspaceV2(`/providers/${encodeURIComponent(id)}/config`);
  },

  patchProviderConfig(id: string, patch: Record<string, string | null>): Promise<void> {
    return requestWorkspaceV2(`/providers/${encodeURIComponent(id)}/config`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  testProviderConnection(id: string, credentialId?: number): Promise<ProviderTestResult> {
    const params = credentialId != null ? `?credential_id=${credentialId}` : "";
    return requestWorkspaceV2(`/providers/${encodeURIComponent(id)}/test${params}`, {
      method: "POST",
    });
  },

  listCredentials(providerId: string): Promise<{ credentials: ProviderCredential[] }> {
    return requestWorkspaceV2(`/providers/${encodeURIComponent(providerId)}/credentials`);
  },

  createCredential(
    providerId: string,
    data: {
      name: string;
      api_key?: string;
      base_url?: string;
      access_key?: string;
      secret_key?: string;
    },
  ): Promise<ProviderCredential> {
    return requestWorkspaceV2(`/providers/${encodeURIComponent(providerId)}/credentials`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateCredential(
    providerId: string,
    credId: number,
    data: {
      name?: string;
      api_key?: string;
      base_url?: string;
      access_key?: string;
      secret_key?: string;
    },
  ): Promise<void> {
    return requestWorkspaceV2(
      `/providers/${encodeURIComponent(providerId)}/credentials/${credId}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  },

  deleteCredential(providerId: string, credId: number): Promise<void> {
    return requestWorkspaceV2(
      `/providers/${encodeURIComponent(providerId)}/credentials/${credId}`,
      { method: "DELETE" },
    );
  },

  activateCredential(providerId: string, credId: number): Promise<void> {
    return requestWorkspaceV2(
      `/providers/${encodeURIComponent(providerId)}/credentials/${credId}/activate`,
      { method: "POST" },
    );
  },

  async uploadVertexCredential(name: string, file: File): Promise<ProviderCredential> {
    const formData = new FormData();
    formData.append("file", file);
    const headers = new Headers();
    const auth = withWorkspaceV2Auth();
    const authHeader = new Headers(auth.headers).get("Authorization");
    if (authHeader) headers.set("Authorization", authHeader);
    const lang = new Headers(auth.headers).get("Accept-Language");
    if (lang) headers.set("Accept-Language", lang);
    const response = await fetch(
      `${WORKSPACE_V2_API_BASE}/providers/gemini-vertex/credentials/upload?name=${encodeURIComponent(name)}`,
      { method: "POST", body: formData, headers },
    );
    await throwIfWorkspaceV2NotOk(response, "上传凭证失败");
    return response.json() as Promise<ProviderCredential>;
  },

  listCustomProviders(): Promise<{ providers: CustomProviderInfo[] }> {
    return requestWorkspaceV2("/custom-providers");
  },

  listEndpointCatalog(): Promise<{ endpoints: EndpointDescriptor[] }> {
    return requestWorkspaceV2("/custom-providers/endpoints");
  },

  createCustomProvider(data: CustomProviderCreateRequest): Promise<CustomProviderInfo> {
    return requestWorkspaceV2("/custom-providers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getCustomProvider(id: number): Promise<CustomProviderInfo> {
    return requestWorkspaceV2(`/custom-providers/${id}`);
  },

  fullUpdateCustomProvider(
    id: number,
    data: {
      display_name: string;
      base_url: string;
      api_key?: string;
      models: CustomProviderModelInput[];
    },
  ): Promise<CustomProviderInfo> {
    return requestWorkspaceV2(`/custom-providers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteCustomProvider(id: number): Promise<void> {
    return requestWorkspaceV2(`/custom-providers/${id}`, { method: "DELETE" });
  },

  discoverModels(data: {
    discovery_format: string;
    base_url: string;
    api_key: string;
  }): Promise<{ models: DiscoveredModel[] }> {
    return requestWorkspaceV2("/custom-providers/discover", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  discoverModelsForProvider(id: number): Promise<{ models: DiscoveredModel[] }> {
    return requestWorkspaceV2(`/custom-providers/${id}/discover`, { method: "POST" });
  },

  testCustomConnection(data: {
    discovery_format: string;
    base_url: string;
    api_key: string;
  }): Promise<{ success: boolean; message: string }> {
    return requestWorkspaceV2("/custom-providers/test", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  testCustomConnectionById(id: number): Promise<{ success: boolean; message: string }> {
    return requestWorkspaceV2(`/custom-providers/${id}/test`, { method: "POST" });
  },
};
