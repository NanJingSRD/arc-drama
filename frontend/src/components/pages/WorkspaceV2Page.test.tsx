import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchWorkspaceV2Projects } from "@/api/workspace-v2";
import type { WorkspaceV2Project } from "@/types/workspace-v2";
import { WorkspaceV2Page } from "./WorkspaceV2Page";

vi.mock("@/api/workspace-v2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/workspace-v2")>();
  return {
    ...actual,
    fetchWorkspaceV2Projects: vi.fn(),
  };
});

vi.mock("@/hooks/useWorkspaceV2StyleTemplates", () => ({
  useWorkspaceV2StyleTemplates: () => ({
    data: {
      live: [{ id: "live_premium_drama", category: "live", name: "精品短剧", prompt: "" }],
      anim: [],
    },
    loading: false,
    error: null,
  }),
}));

vi.mock("@/components/pages/welcome/WelcomeLazyVideo", () => ({
  WelcomeDeferredBackground: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/pages/welcome/WelcomeBackground", () => ({
  WelcomeBackground: () => null,
}));

const mockFetch = vi.mocked(fetchWorkspaceV2Projects);

const FIXTURE_PROJECTS: WorkspaceV2Project[] = [
  {
    id: "ws2-001",
    name: "权力的游戏",
    coverUrl: null,
    dramaType: "series",
    contentModeLabel: "剧集模式",
    episodeCount: 12,
    style: "国风 3D",
    progress: "production",
    updatedAt: "2026-07-05T18:30:00Z",
  },
  {
    id: "ws2-002",
    name: "长安十二时辰",
    coverUrl: null,
    dramaType: "novel",
    contentModeLabel: "旁白模式",
    episodeCount: 24,
    style: "古风仙侠",
    progress: "script_episoding",
    updatedAt: "2026-07-04T10:15:00Z",
  },
  {
    id: "ws2-003",
    name: "星际穿越广告篇",
    coverUrl: null,
    dramaType: "ad",
    contentModeLabel: "广告",
    episodeCount: 1,
    style: "赛博朋克",
    progress: "asset_generation",
    updatedAt: "2026-07-03T14:20:00Z",
  },
];

describe("WorkspaceV2Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(async (params = {}) => {
      const keyword = params.keyword?.trim().toLowerCase() ?? "";
      const items = FIXTURE_PROJECTS.filter((project) => {
        if (keyword && !project.name.toLowerCase().includes(keyword)) return false;
        if (params.progress && project.progress !== params.progress) return false;
        if (params.style && project.style !== params.style) return false;
        if (params.progress && project.progress !== params.progress) return false;
        return true;
      });
      return { items, total: items.length };
    });
  });

  it("renders project cards from fetched data", async () => {
    render(<WorkspaceV2Page />);

    expect(await screen.findByText("权力的游戏")).toBeInTheDocument();
    expect(screen.getByText("长安十二时辰")).toBeInTheDocument();
  });

  it("filters projects automatically when typing keyword", async () => {
    const user = userEvent.setup();
    render(<WorkspaceV2Page />);

    await screen.findByText("权力的游戏");

    await user.type(
      screen.getByPlaceholderText("请输入项目或剧集名称关键词搜索..."),
      "广告",
    );

    await waitFor(() => {
      expect(screen.getByText("星际穿越广告篇")).toBeInTheDocument();
      expect(screen.queryByText("权力的游戏")).not.toBeInTheDocument();
    });
  });

  it("filters projects automatically when selecting progress status", async () => {
    const user = userEvent.setup();
    render(<WorkspaceV2Page />);

    await screen.findByText("权力的游戏");

    await user.click(screen.getByRole("button", { name: "剧集状态" }));
    await user.click(screen.getByRole("option", { name: "生成剧本" }));

    await waitFor(() => {
      expect(screen.getByText("长安十二时辰")).toBeInTheDocument();
      expect(screen.queryByText("权力的游戏")).not.toBeInTheDocument();
    });
  });
});
