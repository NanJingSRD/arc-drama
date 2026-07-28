import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceV2SettingsAPI } from "@/api/workspace-v2-settings";
import { useWorkspaceV2ConfigStatusStore } from "@/stores/workspace-v2-config-status-store";
import type { CustomProviderInfo, GetSystemConfigResponse, ProviderInfo } from "@/types";
import { WorkspaceV2SettingsModal } from "./WorkspaceV2SettingsModal";

const MOCK_PROVIDERS: ProviderInfo[] = [
  {
    id: "gemini",
    display_name: "AI Studio",
    description: "Google AI Studio",
    status: "ready",
    media_types: ["image", "video", "text"],
    capabilities: [],
    configured_keys: ["api_key"],
    missing_keys: [],
    models: {},
  },
  {
    id: "openai",
    display_name: "OpenAI",
    description: "OpenAI API",
    status: "unconfigured",
    media_types: ["image", "text"],
    capabilities: [],
    configured_keys: [],
    missing_keys: ["api_key"],
    models: {},
  },
];

const MOCK_SYSTEM_CONFIG: GetSystemConfigResponse = {
  settings: {
    default_video_backend: "gemini/veo-3",
    default_image_backend: "gemini/imagen-4",
    default_text_backend: "",
    text_backend_script: "",
    text_backend_overview: "",
    text_backend_style: "",
    video_generate_audio: true,
    anthropic_api_key: { is_set: true, masked: "sk-ant-***" },
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
    video_backends: ["gemini/veo-3"],
    image_backends_t2i: ["gemini/imagen-4"],
    image_backends_i2i: ["gemini/imagen-4"],
    text_backends: ["gemini/gemini-2.5-pro"],
    audio_backends: [],
    provider_names: { gemini: "Google Gemini" },
  },
};

const MOCK_CUSTOM_PROVIDERS: CustomProviderInfo[] = [
  {
    id: 1,
    display_name: "srd",
    discovery_format: "openai",
    base_url: "https://api.example.com",
    api_key_masked: "sk-***",
    models: [],
    created_at: "2026-01-01T00:00:00Z",
  },
];

describe("WorkspaceV2SettingsModal", () => {
  beforeEach(() => {
    useWorkspaceV2ConfigStatusStore.setState(useWorkspaceV2ConfigStatusStore.getInitialState(), true);
    vi.restoreAllMocks();
    vi.spyOn(WorkspaceV2SettingsAPI, "getProviders").mockResolvedValue({ providers: MOCK_PROVIDERS });
    vi.spyOn(WorkspaceV2SettingsAPI, "listCustomProviders").mockResolvedValue({
      providers: MOCK_CUSTOM_PROVIDERS,
    });
    vi.spyOn(WorkspaceV2SettingsAPI, "getSystemConfig").mockResolvedValue(MOCK_SYSTEM_CONFIG);
    vi.spyOn(WorkspaceV2SettingsAPI, "getProviderConfig").mockResolvedValue({
      id: "gemini",
      display_name: "AI Studio",
      description: "Google AI Studio",
      status: "ready",
      media_types: ["image", "video", "text"],
      fields: [],
      supports_base_url: false,
      secret_fields: [{ key: "api_key", label: "API Key" }],
    });
    vi.spyOn(WorkspaceV2SettingsAPI, "listCredentials").mockResolvedValue({ credentials: [] });
    vi.spyOn(WorkspaceV2SettingsAPI, "getCustomProvider").mockResolvedValue(MOCK_CUSTOM_PROVIDERS[0]);
    vi.spyOn(WorkspaceV2SettingsAPI, "listEndpointCatalog").mockResolvedValue({ endpoints: [] });
  });

  it("opens with provider nav and preset tab selected", () => {
    render(<WorkspaceV2SettingsModal open onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "设置" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "供应商" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("tab", { name: "预置供应商" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches nav and provider tabs", async () => {
    const user = userEvent.setup();
    render(<WorkspaceV2SettingsModal open onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "模型配置" }));
    expect(screen.getByRole("button", { name: "模型配置" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("tab", { name: "预置供应商" })).toHaveAttribute("aria-selected", "false");

    await user.click(screen.getByRole("button", { name: "供应商" }));
    await user.click(screen.getByRole("tab", { name: "自定义供应商" }));
    expect(screen.getByRole("tab", { name: "自定义供应商" })).toHaveAttribute("aria-selected", "true");
  });

  it("selects custom sub-tab when clicking providers nav", async () => {
    const user = userEvent.setup();
    render(<WorkspaceV2SettingsModal open onClose={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: "自定义供应商" }));
    expect(screen.getByRole("tab", { name: "自定义供应商" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: "供应商" }));
    expect(screen.getByRole("tab", { name: "预置供应商" })).toHaveAttribute("aria-selected", "true");
  });

  it("loads preset providers and shows detail panel", async () => {
    render(<WorkspaceV2SettingsModal open onClose={vi.fn()} />);

    await waitFor(() => {
      expect(WorkspaceV2SettingsAPI.getProviders).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByRole("tab", { name: /AI Studio/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByRole("heading", { name: "AI Studio" })).toBeInTheDocument();
    expect(WorkspaceV2SettingsAPI.getProviderConfig).toHaveBeenCalledTimes(1);
    expect(WorkspaceV2SettingsAPI.getProviderConfig).toHaveBeenCalledWith("gemini");
  });

  it("switches preset provider detail when selecting another provider", async () => {
    const user = userEvent.setup();
    vi.spyOn(WorkspaceV2SettingsAPI, "getProviderConfig").mockImplementation(async (providerId) => ({
      id: providerId,
      display_name: providerId === "openai" ? "OpenAI" : "AI Studio",
      description: "",
      status: "ready",
      media_types: ["text"],
      fields: [],
      supports_base_url: false,
      secret_fields: [],
    }));

    render(<WorkspaceV2SettingsModal open onClose={vi.fn()} />);
    await screen.findByRole("heading", { name: "AI Studio" });

    await user.click(screen.getByRole("tab", { name: /OpenAI/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "OpenAI" })).toBeInTheDocument();
    });
    expect(WorkspaceV2SettingsAPI.getProviderConfig).toHaveBeenCalledWith("openai");
  });

  it("loads custom providers and shows detail panel", async () => {
    const user = userEvent.setup();
    render(<WorkspaceV2SettingsModal open onClose={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: "自定义供应商" }));

    expect(await screen.findByRole("tab", { name: /srd/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(await screen.findByRole("heading", { name: "srd" })).toBeInTheDocument();
    expect(WorkspaceV2SettingsAPI.listCustomProviders).toHaveBeenCalled();
    expect(WorkspaceV2SettingsAPI.getCustomProvider).toHaveBeenCalledWith(1);
  });

  it("loads model list panel from system config", async () => {
    const user = userEvent.setup();
    render(<WorkspaceV2SettingsModal open onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "模型配置" }));

    expect(await screen.findByRole("heading", { name: "模型配置" })).toBeInTheDocument();
    expect(screen.getByText("默认视频模型")).toBeInTheDocument();
    expect(await screen.findByText("文生图（T2I）")).toBeInTheDocument();
    expect(screen.getByText("图生图（I2I）")).toBeInTheDocument();
    await waitFor(() => {
      expect(WorkspaceV2SettingsAPI.getSystemConfig).toHaveBeenCalled();
    });
  });

  it("opens custom provider create form from sidebar", async () => {
    const user = userEvent.setup();
    render(<WorkspaceV2SettingsModal open onClose={vi.fn()} />);

    await user.click(screen.getByRole("tab", { name: "自定义供应商" }));
    await screen.findByRole("tab", { name: /srd/i });
    await user.click(screen.getByRole("tab", { name: "添加供应商" }));

    expect(screen.getByRole("tab", { name: "添加供应商" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("heading", { name: "添加自定义供应商" })).toBeInTheDocument();
  });
});
