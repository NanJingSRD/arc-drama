import { describe, expect, it } from "vitest";
import {
  canSubmitWorkspaceV2CreateProject,
  canSubmitWorkspaceV2EditProject,
  isWorkspaceV2GlobalModelConfigReady,
  mergeWorkspaceV2ModelConfigWithForm,
  snapshotFromSystemConfig,
} from "./workspace-v2-model-config";
import type { GetSystemConfigResponse } from "@/types/system";
import type { WorkspaceV2CreateForm } from "./WorkspaceV2CreateProjectModal";

const MOCK_CONFIG: GetSystemConfigResponse = {
  settings: {
    default_video_backend: "custom-3/doubao-seedance-2.0",
    default_image_backend: "custom-2/qwen-image",
    default_image_backend_t2i: "custom-2/qwen-image",
    default_image_backend_i2i: "custom-2/qwen-image",
    text_backend_script: "custom-1/minimax-m2.7",
    default_text_backend: "",
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
    provider_names: { "custom-3": "图生视频" },
  },
};

const BASE_FORM: WorkspaceV2CreateForm = {
  projectName: "测试项目",
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
};

describe("workspace-v2-model-config", () => {
  it("detects ready global model config from system settings", () => {
    const snapshot = snapshotFromSystemConfig(MOCK_CONFIG);
    expect(isWorkspaceV2GlobalModelConfigReady(snapshot)).toBe(true);
  });

  it("rejects submit when global defaults are missing", () => {
    const snapshot = snapshotFromSystemConfig({
      ...MOCK_CONFIG,
      settings: { ...MOCK_CONFIG.settings, default_video_backend: "" },
    });
    expect(
      canSubmitWorkspaceV2CreateProject(BASE_FORM, snapshot, ["live_premium_drama"]),
    ).toBe(false);
  });

  it("rejects submit when any required model field is empty", () => {
    const snapshot = snapshotFromSystemConfig(MOCK_CONFIG);
    expect(
      canSubmitWorkspaceV2CreateProject(
        { ...BASE_FORM, videoModel: "" },
        snapshot,
        ["live_premium_drama"],
      ),
    ).toBe(false);
  });

  it("allows create submit when I2I model is left empty", () => {
    const snapshot = snapshotFromSystemConfig(MOCK_CONFIG);
    expect(
      canSubmitWorkspaceV2CreateProject(
        { ...BASE_FORM, imageModelI2I: "" },
        snapshot,
        ["live_premium_drama"],
      ),
    ).toBe(true);
  });

  it("rejects create submit when I2I model is set but not in options", () => {
    const snapshot = snapshotFromSystemConfig(MOCK_CONFIG);
    expect(
      canSubmitWorkspaceV2CreateProject(
        { ...BASE_FORM, imageModelI2I: "custom-2/unknown-i2i" },
        snapshot,
        ["live_premium_drama"],
      ),
    ).toBe(false);
  });

  it("allows edit submit without global defaults when project models are valid", () => {
    const snapshot = snapshotFromSystemConfig({
      ...MOCK_CONFIG,
      settings: { ...MOCK_CONFIG.settings, default_video_backend: "" },
    });
    const merged = mergeWorkspaceV2ModelConfigWithForm(snapshot, {
      ...BASE_FORM,
      imageModel: "custom-2/qwen-image-2512",
    });
    const form = { ...BASE_FORM, imageModel: "custom-2/qwen-image-2512" };

    expect(canSubmitWorkspaceV2CreateProject(form, merged, ["live_premium_drama"])).toBe(false);
    expect(canSubmitWorkspaceV2EditProject(form, merged, ["live_premium_drama"])).toBe(true);
  });
});
