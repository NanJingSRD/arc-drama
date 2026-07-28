import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PropCard } from "./PropCard";

describe("PropCard (gallery)", () => {
  const prop = { description: "古铜色钥匙" };

  it("renders image-only card without inline description editor", () => {
    render(
      <PropCard
        name="钥匙"
        prop={prop}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );

    expect(screen.queryByDisplayValue("古铜色钥匙")).not.toBeInTheDocument();
    expect(screen.getByText("待生成")).toBeInTheDocument();
    expect(screen.getByText("古铜色钥匙")).toBeInTheDocument();
  });

  it("invokes onGenerate from detail modal", async () => {
    const onGenerate = vi.fn();
    render(
      <PropCard
        name="A"
        prop={prop}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={onGenerate}
      />,
    );

    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    fireEvent.click(screen.getByTestId("asset-detail-generate"));

    expect(onGenerate).toHaveBeenCalledWith("A", { description: "古铜色钥匙" });
    expect(screen.queryByTestId("asset-generate-confirm")).not.toBeInTheDocument();
  });

  it("shows generating overlay when generating", () => {
    render(
      <PropCard
        name="钥匙"
        prop={prop}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={vi.fn()}
        generating
      />,
    );

    expect(screen.getByLabelText("生成中...")).toBeInTheDocument();
    expect(screen.queryByText("待生成")).not.toBeInTheDocument();
  });

  it("closes detail modal and blocks card click while generating", async () => {
    const onGenerate = vi.fn();
    render(
      <PropCard
        name="A"
        prop={prop}
        projectName="demo"
        onUpdate={vi.fn()}
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
    expect(onGenerate).toHaveBeenCalledWith("A", { description: "古铜色钥匙" });
  });

  it("does not render importance or type badges", () => {
    render(
      <PropCard
        name="A"
        prop={prop}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );
    expect(screen.queryByText(/major|minor|主要|次要|道具类型/i)).toBeNull();
  });

  it("shows regenerate label in detail modal when sheet exists", async () => {
    render(
      <PropCard
        name="A"
        prop={{ description: "desc", prop_sheet: "props/sheets/A.png" }}
        projectName="demo"
        onUpdate={vi.fn()}
        onGenerate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId("asset-card-clickable"));
    await screen.findByTestId("asset-detail-modal");
    expect(screen.getByTestId("asset-detail-generate")).toHaveTextContent(/重新生成/);
  });
});
