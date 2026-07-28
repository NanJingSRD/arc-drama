import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import { WorkspaceV2CreateProjectModal } from "./WorkspaceV2CreateProjectModal";

const STYLE_TEMPLATES = {
  live: [
    {
      id: "live_premium_drama",
      category: "live" as const,
      name: "精品短剧",
      prompt: "真人电视剧风格",
    },
  ],
  anim: [
    {
      id: "anim_kyoto",
      category: "anim" as const,
      name: "商业动画 京都",
      prompt: "商业动画画风",
    },
  ],
};

const MOCK_SYSTEM_CONFIG = {
  settings: {
    default_video_backend: "custom-3/doubao-seedance-2.0",
    default_image_backend: "custom-2/qwen-image",
    default_image_backend_t2i: "custom-2/qwen-image",
    default_image_backend_i2i: "custom-2/qwen-image",
    default_text_backend: "",
    text_backend_script: "custom-1/minimax-m2.7",
    text_backend_overview: "",
    text_backend_style: "",
    video_generate_audio: false,
    anthropic_api_key: { is_set: true, masked: null },
    anthropic_base_url: "",
    anthropic_model: "",
    anthropic_default_haiku_model: "",
    anthropic_default_opus_model: "",
    anthropic_default_sonnet_model: "",
    claude_code_subagent_model: "",
    agent_session_cleanup_delay_seconds: 300,
    agent_max_concurrent_sessions: 5,
  },
  options: {
    video_backends: ["custom-3/doubao-seedance-2.0", "ark/other"],
    image_backends_t2i: ["custom-2/qwen-image"],
    image_backends_i2i: ["custom-2/qwen-image"],
    text_backends: ["custom-1/minimax-m2.7"],
    provider_names: {
      "custom-1": "文本供应商",
      "custom-2": "文生图",
      "custom-3": "图生视频",
    },
  },
};

vi.mock("@/stores/app-store", () => ({
  useAppStore: (selector: (s: { pushToast: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ pushToast: vi.fn() }),
}));

describe("WorkspaceV2CreateProjectModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(WorkspaceV2SettingsAPI, "getSystemConfig").mockResolvedValue(MOCK_SYSTEM_CONFIG);
  });

  it("renders form sections from workspace v2 spec", async () => {
    render(
      <WorkspaceV2CreateProjectModal
        open
        onClose={() => {}}
        styleTemplates={STYLE_TEMPLATES}
      />,
    );

    expect(screen.getByRole("heading", { name: "新建项目" })).toBeInTheDocument();
    expect(screen.getByText("基础项目信息")).toBeInTheDocument();
    expect(screen.getByText("视觉风格库")).toBeInTheDocument();
    expect(screen.getByText("AI 模型配置")).toBeInTheDocument();
    expect(screen.getByText("精品短剧")).toBeInTheDocument();

    await waitFor(() => {
      expect(WorkspaceV2SettingsAPI.getSystemConfig).toHaveBeenCalled();
    });
  });

  it("prefills required model selects from global system config, leaves I2I empty", async () => {
    render(
      <WorkspaceV2CreateProjectModal
        open
        onClose={() => {}}
        styleTemplates={STYLE_TEMPLATES}
      />,
    );

    expect(await screen.findByRole("combobox", { name: "文本大模型" })).toHaveTextContent(
      "文本供应商 · minimax-m2.7",
    );
    expect(screen.getByRole("combobox", { name: "文生图模型" })).toHaveTextContent(
      "文生图 · qwen-image",
    );
    expect(screen.getByRole("combobox", { name: "图生图模型" })).toHaveTextContent(
      "选择模型…",
    );
    expect(screen.getByRole("combobox", { name: "视频生成模型" })).toHaveTextContent(
      "图生视频 · doubao-seedance-2.0",
    );
  });

  it("shows script adaptation only for series mode", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceV2CreateProjectModal
        open
        onClose={() => {}}
        styleTemplates={STYLE_TEMPLATES}
      />,
    );

    await waitFor(() => {
      expect(WorkspaceV2SettingsAPI.getSystemConfig).toHaveBeenCalled();
    });

    expect(screen.getByText("剧本改写")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "旁白模式" }));
    expect(screen.queryByText("剧本改写")).not.toBeInTheDocument();
  });

  it("switches style templates by category tab", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceV2CreateProjectModal
        open
        onClose={() => {}}
        styleTemplates={STYLE_TEMPLATES}
      />,
    );

    await waitFor(() => {
      expect(WorkspaceV2SettingsAPI.getSystemConfig).toHaveBeenCalled();
    });

    expect(screen.getByText("精品短剧")).toBeInTheDocument();
    expect(screen.getByText("真人电视剧风格")).toBeInTheDocument();
    expect(screen.queryByText("商业动画 京都")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "AI 漫剧" }));
    expect(screen.getByText("商业动画 京都")).toBeInTheDocument();
    expect(screen.getByText("商业动画画风")).toBeInTheDocument();
  });

  it("disables create when global model config is incomplete", async () => {
    vi.spyOn(WorkspaceV2SettingsAPI, "getSystemConfig").mockResolvedValue({
      ...MOCK_SYSTEM_CONFIG,
      settings: { ...MOCK_SYSTEM_CONFIG.settings, default_video_backend: "" },
    });

    render(
      <WorkspaceV2CreateProjectModal
        open
        onClose={() => {}}
        styleTemplates={STYLE_TEMPLATES}
      />,
    );

    const createBtn = await screen.findByRole("button", { name: "创建项目" });
    expect(createBtn).toBeDisabled();
  });

  it("disables create until project name is filled", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceV2CreateProjectModal
        open
        onClose={() => {}}
        styleTemplates={STYLE_TEMPLATES}
      />,
    );

    const createBtn = await screen.findByRole("button", { name: "创建项目" });
    expect(createBtn).toBeDisabled();

    await user.type(screen.getByLabelText(/项目名称/), "我的短剧");
    expect(createBtn).toBeEnabled();
  });

  it("renders edit mode as view-only including AI models", async () => {
    render(
      <WorkspaceV2CreateProjectModal
        open
        mode="edit"
        editProjectId="proj-demo"
        initialForm={{
          projectName: "test_070901_novel",
          creationMode: "series",
          scriptAdaptation: "ai_rewrite",
          aspectRatio: "16:9",
          visualStyleId: "live_premium_drama",
          textModel: "custom-1/minimax-m2.7",
          imageModel: "custom-2/qwen-image",
          imageModelI2I: "custom-2/qwen-image",
          videoModel: "custom-3/doubao-seedance-2.0",
          imageResolution: "1k",
          videoResolution: "1080p",
          shotDurationSec: 9,
        }}
        onClose={() => {}}
        styleTemplates={STYLE_TEMPLATES}
      />,
    );

    expect(screen.getByRole("heading", { name: "编辑项目" })).toBeInTheDocument();
    expect(screen.getByText("项目信息暂不支持修改")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "保存修改" })).toBeNull();
    expect(screen.getByLabelText(/项目名称/)).toBeDisabled();
    expect(screen.getByRole("radio", { name: "横屏 16:9" })).toBeDisabled();

    await waitFor(() => {
      expect(WorkspaceV2SettingsAPI.getSystemConfig).toHaveBeenCalled();
    });

    expect(await screen.findByRole("combobox", { name: "文本大模型" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "文生图模型" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "图生图模型" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "视频生成模型" })).toBeDisabled();
  });
});
