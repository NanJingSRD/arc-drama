import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { API } from "@/api";
import { useConfigStatusStore } from "@/stores/config-status-store";
import { SystemConfigPage } from "@/components/pages/SystemConfigPage";
import type { GetSystemConfigResponse, ProviderInfo } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfigResponse(
  overrides?: Partial<GetSystemConfigResponse["settings"]>,
): GetSystemConfigResponse {
  return {
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
      ...overrides,
    },
    options: {
      video_backends: ["gemini/veo-3"],
      image_backends: ["gemini/imagen-4"],
      text_backends: [],
    },
  };
}

function makeProviders(overrides?: Partial<ProviderInfo>): { providers: ProviderInfo[] } {
  return {
    providers: [
      {
        id: "gemini",
        display_name: "Google Gemini",
        description: "Google Gemini API",
        status: "ready",
        media_types: ["image", "video", "text"],
        capabilities: [],
        configured_keys: ["api_key"],
        missing_keys: [],
        models: {},
        ...overrides,
      },
    ],
  };
}

function renderPage(path = "/app/settings") {
  const location = memoryLocation({ path, record: true });
  return render(
    <Router hook={location.hook}>
      <SystemConfigPage />
    </Router>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SystemConfigPage", () => {
  beforeEach(() => {
    useConfigStatusStore.setState(useConfigStatusStore.getInitialState(), true);
    vi.restoreAllMocks();

    // Default: silence child section network calls so tests don't hang
    vi.spyOn(API, "getSystemConfig").mockResolvedValue(makeConfigResponse());
    vi.spyOn(API, "getProviders").mockResolvedValue(makeProviders());
    vi.spyOn(API, "listCustomProviders").mockResolvedValue({ providers: [] });
    vi.spyOn(API, "getProviderConfig").mockResolvedValue({
      id: "gemini",
      display_name: "Google Gemini",
      status: "ready",
      media_types: ["image", "video"],
      capabilities: [],
      fields: [],
      supports_base_url: false,
    } as never);
    vi.spyOn(API, "listCredentials").mockResolvedValue({ credentials: [] });
  });

  it("renders the page header", () => {
    renderPage();
    expect(screen.getByText("设置")).toBeInTheDocument();
    expect(screen.getByText("系统配置与 API 访问管理")).toBeInTheDocument();
  });

  it("renders visible sidebar sections only", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /供应商/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /模型选择/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /智能体/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /用量统计/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /API 令牌/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /关于/ })).not.toBeInTheDocument();
  });

  it("defaults to the 供应商 section", () => {
    renderPage();
    const providersButton = screen.getByRole("button", { name: /供应商/ });
    // Active sidebar item carries aria-current="page" (Darkroom redesign)
    expect(providersButton).toHaveAttribute("aria-current", "page");
  });

  it("clicking 供应商 makes it the active section", async () => {
    renderPage();
    const providersButton = screen.getByRole("button", { name: /供应商/ });
    fireEvent.click(providersButton);
    await waitFor(() => {
      expect(providersButton).toHaveAttribute("aria-current", "page");
    });
  });

  it("clicking 模型选择 makes it the active section", async () => {
    renderPage();
    const mediaButton = screen.getByRole("button", { name: /模型选择/ });
    fireEvent.click(mediaButton);
    await waitFor(() => {
      expect(mediaButton).toHaveAttribute("aria-current", "page");
    });
  });

  it("redirects hidden sections to providers", async () => {
    for (const section of ["api-keys", "agent", "about"]) {
      const location = memoryLocation({
        path: `/app/settings?section=${section}`,
        record: true,
      });
      render(
        <Router hook={location.hook}>
          <SystemConfigPage />
        </Router>,
      );

      await waitFor(() => {
        expect(location.history).toContain("/app/settings?section=providers");
      });
    }
  });

  it("renders the back link that navigates to projects", () => {
    renderPage();
    const link = screen.getByRole("link", { name: "返回" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/app/projects");
  });
});
