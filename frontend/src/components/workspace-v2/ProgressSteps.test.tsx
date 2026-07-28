import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressSteps } from "./ProgressSteps";

describe("ProgressSteps", () => {
  it("marks completed steps with checkmarks and active step with number", () => {
    render(<ProgressSteps progress="script_episoding" />);

    expect(screen.getByText("剧情导入")).toBeInTheDocument();
    expect(screen.getByText("生成剧本")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("marks all steps completed when progress is completed", () => {
    const { container } = render(<ProgressSteps progress="completed" />);

    expect(screen.getByText("已完成")).toBeInTheDocument();
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(5);
  });
});
