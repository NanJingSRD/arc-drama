export const WORKSPACE_V2_PROVIDER_TABBAR_CLASS = "shrink-0 px-4";

export const WORKSPACE_V2_PROVIDER_TABLIST_CLASS = "flex gap-4 overflow-x-auto";

export function workspaceV2ProviderTabClass(isActive: boolean) {
  return (
    "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-1 pb-1 pt-2 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
    (isActive
      ? "border-accent font-medium text-text"
      : "border-transparent text-text-3 hover:text-text")
  );
}
