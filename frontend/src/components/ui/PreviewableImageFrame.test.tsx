import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PreviewableImageFrame } from "./PreviewableImageFrame";

describe("PreviewableImageFrame", () => {
  it("opens a fullscreen preview and closes from both the close button and backdrop", () => {
    render(
      <PreviewableImageFrame src="/demo.png" alt="示例图">
        <img src="/demo.png" alt="示例图" />
      </PreviewableImageFrame>,
    );

    const trigger = screen.getByRole("button", { name: "示例图 全屏预览" });

    fireEvent.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "示例图 全屏预览" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭图片预览" }));
    expect(
      screen.queryByRole("dialog", { name: "示例图 全屏预览" }),
    ).not.toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "关闭全屏预览" }));

    expect(
      screen.queryByRole("dialog", { name: "示例图 全屏预览" }),
    ).not.toBeInTheDocument();
  }, 10_000);

  it("supports an optional label on the trigger button", () => {
    render(
      <PreviewableImageFrame src="/demo.png" alt="示例图" label="完整查看">
        <img src="/demo.png" alt="示例图" />
      </PreviewableImageFrame>,
    );

    expect(
      screen.getByRole("button", { name: "完整查看：示例图" }),
    ).toBeInTheDocument();
  });
});
