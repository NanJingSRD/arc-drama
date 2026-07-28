import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SceneCard } from "./SceneCard";

describe("SceneCard", () => {
  const scene = { description: "阴森古朴" };

  it("renders image-only card without inline description editor", () => {
    render(
      <SceneCard
        name="庙宇"
        scene={scene}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.queryByDisplayValue("阴森古朴")).not.toBeInTheDocument();
    expect(screen.getByText("待生成")).toBeInTheDocument();
    expect(screen.getByText("阴森古朴")).toBeInTheDocument();
  });

  it("invokes onGenerate from detail modal", async () => {
    const onGenerate = vi.fn();
    render(
      <SceneCard
        name="A"
        scene={scene}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    fireEvent.click(screen.getByTestId("asset-detail-generate"));

    expect(onGenerate).toHaveBeenCalledWith("A", { description: "阴森古朴" });
    expect(screen.queryByTestId("asset-generate-confirm")).not.toBeInTheDocument();
  });

  it("does not render importance or type badges", () => {
    render(
      <SceneCard
        name="A"
        scene={scene}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.queryByText(/major|minor|主要|次要|location|场景类型/i)).toBeNull();
  });

  it("does not render card generate menu", () => {
    render(
      <SceneCard
        name="A"
        scene={{ description: "" }}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("asset-card-menu-trigger")).not.toBeInTheDocument();
  });
});
