import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssetLibraryHeaderActionsContext } from "@/components/workspace-v2/project-detail/AssetLibraryHeaderActionsContext";
import { GalleryToolbar } from "./GalleryToolbar";

describe("GalleryToolbar header actions", () => {
  it("does not re-set header actions when only callback props change identity", () => {
    const setHeaderActions = vi.fn();

    const { rerender } = render(
      <AssetLibraryHeaderActionsContext.Provider value={setHeaderActions}>
        <GalleryToolbar
          title="道具"
          count={3}
          hideAddButton
          onExtractAssets={() => {}}
          extractingAssets={false}
          onGenerateAll={() => {}}
        />
      </AssetLibraryHeaderActionsContext.Provider>,
    );

    expect(setHeaderActions).toHaveBeenCalledTimes(1);

    rerender(
      <AssetLibraryHeaderActionsContext.Provider value={setHeaderActions}>
        <GalleryToolbar
          title="道具"
          count={3}
          hideAddButton
          onExtractAssets={() => {}}
          extractingAssets={false}
          onGenerateAll={() => {}}
        />
      </AssetLibraryHeaderActionsContext.Provider>,
    );

    expect(setHeaderActions).toHaveBeenCalledTimes(1);
  });

  it("updates header actions when display state changes", () => {
    const setHeaderActions = vi.fn();

    const { rerender } = render(
      <AssetLibraryHeaderActionsContext.Provider value={setHeaderActions}>
        <GalleryToolbar
          title="道具"
          count={3}
          hideAddButton
          onExtractAssets={() => {}}
          extractingAssets={false}
        />
      </AssetLibraryHeaderActionsContext.Provider>,
    );

    expect(setHeaderActions).toHaveBeenCalledTimes(1);

    rerender(
      <AssetLibraryHeaderActionsContext.Provider value={setHeaderActions}>
        <GalleryToolbar
          title="道具"
          count={7}
          hideAddButton
          onExtractAssets={() => {}}
          extractingAssets={true}
        />
      </AssetLibraryHeaderActionsContext.Provider>,
    );

    // cleanup(null) + set JSX when count/extracting change
    expect(setHeaderActions.mock.calls.length).toBeGreaterThan(1);
    expect(setHeaderActions).toHaveBeenLastCalledWith(expect.anything());
  });
});
