import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import type { CustomProviderInfo, ProviderInfo } from "@/types";

export async function getWorkspaceV2ProviderModels(): Promise<ProviderInfo[]> {
  const res = await WorkspaceV2SettingsAPI.getProviders();
  return res.providers;
}

export async function getWorkspaceV2CustomProviderModels(): Promise<CustomProviderInfo[]> {
  const res = await WorkspaceV2SettingsAPI.listCustomProviders();
  return res.providers;
}
