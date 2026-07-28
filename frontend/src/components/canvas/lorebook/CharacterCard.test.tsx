import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CharacterCard } from "./CharacterCard";
import { useAppStore } from "@/stores/app-store";

describe("CharacterCard", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true);
    vi.restoreAllMocks();
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:character-ref"),
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    });
  });

  it("renders image-only card with placeholder when no sheet", () => {
    render(
      <CharacterCard
        name="Hero"
        character={{ description: "hero desc", voice_style: "warm" }}
        projectName="demo"
        onSave={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.getByText("待生成")).toBeInTheDocument();
    expect(screen.getByText("hero desc")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/角色描述/)).not.toBeInTheDocument();
  });

  it("opens detail modal when clicking card body", async () => {
    render(
      <CharacterCard
        name="Hero"
        character={{ description: "hero desc", voice_style: "warm" }}
        projectName="demo"
        onSave={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));

    const detail = await screen.findByTestId("asset-detail-modal");
    expect(detail).toBeInTheDocument();
    expect(within(detail).getByText("hero desc")).toBeInTheDocument();
  });

  it("does not render card generate menu", () => {
    render(
      <CharacterCard
        name="Hero"
        character={{ description: "hero desc", voice_style: "warm" }}
        projectName="demo"
        onSave={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("asset-card-menu-trigger")).not.toBeInTheDocument();
  });

  it("returns to detail modal after closing edit modal", async () => {
    render(
      <CharacterCard
        name="Hero"
        character={{ description: "hero desc", voice_style: "warm" }}
        projectName="demo"
        onSave={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    fireEvent.click(screen.getByTestId("asset-detail-edit"));
    await screen.findByTestId("asset-edit-modal");

    fireEvent.click(screen.getByText("取消"));

    await waitFor(() => {
      expect(screen.queryByTestId("asset-edit-modal")).not.toBeInTheDocument();
      expect(screen.getByTestId("asset-detail-modal")).toBeInTheDocument();
    });
  });

  it("opens edit modal from detail modal without triggering generate", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onGenerate = vi.fn();
    render(
      <CharacterCard
        name="Hero"
        character={{ description: "hero desc", voice_style: "warm" }}
        projectName="demo"
        onSave={onSave}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    fireEvent.click(screen.getByTestId("asset-detail-edit"));

    const textarea = await screen.findByPlaceholderText(/角色描述/);
    fireEvent.change(textarea, { target: { value: "edited desc" } });
    fireEvent.click(screen.getByTestId("asset-edit-confirm"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("Hero", {
        description: "edited desc",
        voiceStyle: "warm",
        referenceFile: null,
      });
      expect(onGenerate).not.toHaveBeenCalled();
    });
  });

  it("triggers generate directly from detail modal when sheet exists", async () => {
    const onGenerate = vi.fn();
    render(
      <CharacterCard
        name="Hero"
        character={{
          description: "hero desc",
          voice_style: "warm",
          reference_image: "characters/refs/Hero.png",
          character_sheet: "characters/sheets/Hero.png",
        }}
        projectName="demo"
        onSave={vi.fn()}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    fireEvent.click(screen.getByTestId("asset-detail-generate"));

    expect(onGenerate).toHaveBeenCalledWith("Hero", { description: "hero desc" });
    expect(screen.queryByTestId("asset-generate-confirm")).not.toBeInTheDocument();
  });

  it("triggers generate directly from detail modal", async () => {
    const onGenerate = vi.fn();
    render(
      <CharacterCard
        name="Hero"
        character={{ description: "hero desc", voice_style: "warm" }}
        projectName="demo"
        onSave={vi.fn()}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    fireEvent.click(screen.getByTestId("asset-detail-generate"));

    expect(onGenerate).toHaveBeenCalledWith("Hero", { description: "hero desc" });
    await waitFor(() => {
      expect(screen.queryByTestId("asset-detail-modal")).not.toBeInTheDocument();
    });
  });

  it("shows generating overlay on card while request is in flight", async () => {
    let resolveGenerate: () => void = () => {};
    const onGenerate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveGenerate = resolve;
        }),
    );
    render(
      <CharacterCard
        name="Hero"
        character={{ description: "hero desc", voice_style: "warm" }}
        projectName="demo"
        onSave={vi.fn()}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    fireEvent.click(screen.getByTestId("asset-detail-generate"));

    await waitFor(() => {
      expect(screen.queryByTestId("asset-detail-modal")).not.toBeInTheDocument();
      expect(screen.getByLabelText("生成中...")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    expect(screen.queryByTestId("asset-detail-modal")).not.toBeInTheDocument();

    resolveGenerate();
    await waitFor(() => expect(onGenerate).toHaveBeenCalled());
  });

  it("disables generate when description is empty", async () => {
    const onGenerate = vi.fn();
    render(
      <CharacterCard
        name="Hero"
        character={{ description: "", voice_style: "warm" }}
        projectName="demo"
        onSave={vi.fn()}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    expect(screen.getByTestId("asset-detail-generate")).toBeDisabled();
    expect(onGenerate).not.toHaveBeenCalled();
  });
});
