import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeSelect } from "./ThemeSelect";

describe("ThemeSelect", () => {
  it("uses modal layer when popoverLayer is modal", async () => {
    const user = userEvent.setup();

    render(
      <ThemeSelect
        aria-label="视频生成方式"
        popoverLayer="modal"
        value="storyboard_to_video"
        onChange={vi.fn()}
        options={[{ value: "storyboard_to_video", label: "分镜图生视频（推荐）" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "视频生成方式" }));
    expect(screen.getByRole("listbox", { name: "视频生成方式" }).parentElement).toHaveClass("z-50");
  });

  it("opens menu and selects an option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ThemeSelect
        aria-label="剧集类型"
        value=""
        onChange={onChange}
        placeholder="全部类型"
        options={[
          { value: "", label: "全部类型" },
          { value: "novel", label: "小说" },
          { value: "series", label: "剧集" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "剧集类型" }));
    expect(screen.getByRole("listbox", { name: "剧集类型" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "小说" }));
    expect(onChange).toHaveBeenCalledWith("novel");
  });
});
