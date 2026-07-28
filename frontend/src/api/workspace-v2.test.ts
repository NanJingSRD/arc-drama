import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildWorkspaceV2CreatePayload,
  buildWorkspaceV2UpdatePayload,
  createWorkspaceV2Project,
  deleteWorkspaceV2Project,
  deleteWorkspaceV2SourceFile,
  countWorkspaceV2ExtractedAssets,
  extractWorkspaceV2Assets,
  fetchWorkspaceV2ProjectDetail,
  resolveWorkspaceV2ExtractAssetsTaskId,
  resolveWorkspaceV2BatchGenerateTaskIds,
  fetchWorkspaceV2Projects,
  fetchWorkspaceV2StyleTemplates,
  generateWorkspaceV2CharacterBatch,
  generateWorkspaceV2Overview,
  deleteWorkspaceV2Episode,
  createWorkspaceV2ExportToken,
  getWorkspaceV2MergedVideoDownloadUrl,
  generateWorkspaceV2Storyboard,
  generateWorkspaceV2StoryboardBatch,
  generateWorkspaceV2Video,
  generateWorkspaceV2VideoBatch,
  insertWorkspaceV2Episode,
  uploadWorkspaceV2Storyboard,
  uploadWorkspaceV2StoryboardsBatch,
  listWorkspaceV2ProjectFiles,
  mapWorkspaceV2ProjectDetail,
  mapWorkspaceV2EpisodeConfigShots,
  mapWorkspaceV2ProductionEpisodes,
  normalizeWorkspaceV2CostEstimate,
  fetchWorkspaceV2CostEstimate,
  workspaceV2ProductionHasEpisodeConfigs,
  episodeNumberFromSceneId,
  filterShotsForEpisode,
  formatWorkspaceV2DialogueLines,
  parseWorkspaceV2DialogueEntries,
  parseWorkspaceV2ListedScripts,
  parseWorkspaceV2ScriptEpisodes,
  processWorkspaceV2Script,
  listWorkspaceV2Scripts,
  resolveWorkspaceV2EpisodeCharacters,
  resolveWorkspaceV2EpisodeName,
  resolveWorkspaceV2ProcessedScriptContent,
  resolveWorkspaceV2SceneVisualDescription,
  resolveWorkspaceV2ScriptEpisodeMetadata,
  resolveWorkspaceV2ScriptProcessTaskId,
  resolveWorkspaceV2ShotDurationSec,
  resolveWorkspaceV2ShotMediaUrl,
  setWorkspaceV2ProjectSource,
  updateWorkspaceV2Overview,
  updateWorkspaceV2Project,
  fetchWorkspaceV2ProjectOverview,
  mapWorkspaceV2ScriptImportOverview,
  workspaceV2ScriptImportHasOverview,
  fetchWorkspaceV2ProjectAssets,
  mapWorkspaceV2ProjectAssets,
  updateWorkspaceV2Script,
  updateWorkspaceV2ScriptScene,
  workspaceV2EpisodeScriptFile,
  workspaceV2FormFromProject,
  workspaceV2NeedsWelcomeUpload,
} from "@/api/workspace-v2";
import type { WorkspaceV2CreateForm } from "@/components/workspace-v2/WorkspaceV2CreateProjectModal";

const API_PROJECT = {
  project_id: "proj-ws2-demo",
  title: "演示项目",
  style: "国风 3D",
  thumbnail: null,
  content_mode: "drama",
  content_mode_label: "剧集模式",
  episodes_count: 3,
  current_phase_label: "剧本分集",
  status: { current_phase: "script_episoding" },
  metadata: { updated_at: "2026-07-07T00:00:00Z" },
};

function mockFetchResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Bad Request",
    json: vi.fn().mockResolvedValue(data),
  } as unknown as Response;
}

describe("fetchWorkspaceV2Projects", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps backend projects and passes query filters", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ projects: [API_PROJECT] }),
    );

    const result = await fetchWorkspaceV2Projects({
      keyword: "演示",
      style: "国风 3D",
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects?query=%E6%BC%94%E7%A4%BA&style=%E5%9B%BD%E9%A3%8E+3D"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: "proj-ws2-demo",
      name: "演示项目",
      dramaType: "series",
      contentModeLabel: "剧集模式",
      episodeCount: 3,
      progress: "script_episoding",
    });
  });

  it("rewrites list thumbnail /api/v1/files onto /api/ws2 coverUrl", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        projects: [
          {
            ...API_PROJECT,
            thumbnail: "/api/v1/files/test-ece6bad2/characters/帐下诸将.png",
          },
        ],
      }),
    );

    const result = await fetchWorkspaceV2Projects();
    expect(result.items[0]?.coverUrl).toBe(
      "/api/ws2/v1/files/test-ece6bad2/characters/帐下诸将.png",
    );
  });

  it("filters progress on the client", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        projects: [
          API_PROJECT,
          {
            ...API_PROJECT,
            project_id: "proj-ws2-done",
            title: "已完成项目",
            current_phase_label: "已完成",
          },
        ],
      }),
    );

    const result = await fetchWorkspaceV2Projects({ progress: "completed" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects?status=completed"),
      expect.anything(),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.progress).toBe("completed");
  });
});

describe("createWorkspaceV2Project", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts create payload to workspace v2 backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, project_id: "proj-ws2-new" }),
    );

    const form: WorkspaceV2CreateForm = {
      projectName: "新项目",
      creationMode: "series",
      scriptAdaptation: "ai_rewrite",
      aspectRatio: "16:9",
      visualStyleId: "live_premium_drama",
      textModel: "custom-1/minimax-m2.7",
      imageModel: "custom-2/qwen-image",
      imageModelI2I: "custom-2/hidream-o1-image",
      videoModel: "custom-3/doubao-seedance-2.0",
      imageResolution: "1k",
      videoResolution: "1080p",
      shotDurationSec: 9,
    };

    const payload = buildWorkspaceV2CreatePayload(form);
    const result = await createWorkspaceV2Project(payload);

    expect(payload).toMatchObject({
      title: "新项目",
      content_mode: "drama",
      episode_rewrite_mode: "ai_rewrite",
      aspect_ratio: "16:9",
      style_template_id: "live_premium_drama",
      image_provider_t2i: "custom-2/qwen-image",
      image_provider_i2i: "custom-2/hidream-o1-image",
    });
    expect(payload).not.toHaveProperty("generation_mode");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    expect(result.project_id).toBe("proj-ws2-new");
  });

  it("omits image_provider_i2i when I2I model is not selected", () => {
    const payload = buildWorkspaceV2CreatePayload({
      projectName: "新项目",
      creationMode: "series",
      scriptAdaptation: "ai_rewrite",
      aspectRatio: "16:9",
      visualStyleId: "live_premium_drama",
      textModel: "custom-1/minimax-m2.7",
      imageModel: "custom-2/qwen-image",
      imageModelI2I: "",
      videoModel: "custom-3/doubao-seedance-2.0",
      imageResolution: "1k",
      videoResolution: "1080p",
      shotDurationSec: 9,
    });

    expect(payload).not.toHaveProperty("image_provider_i2i");
    expect(payload.image_provider_t2i).toBe("custom-2/qwen-image");
  });
});

describe("buildWorkspaceV2UpdatePayload", () => {
  it("omits title from create payload", () => {
    const form: WorkspaceV2CreateForm = {
      projectName: "不可改名",
      creationMode: "narration",
      scriptAdaptation: "ai_rewrite",
      aspectRatio: "9:16",
      visualStyleId: "live_premium_drama",
      textModel: "custom-1/minimax-m2.7",
      imageModel: "custom-2/qwen-image",
      imageModelI2I: "custom-2/hidream-o1-image",
      videoModel: "custom-3/doubao-seedance-2.0",
      imageResolution: "2k",
      videoResolution: "720p",
      shotDurationSec: 6,
    };

    const payload = buildWorkspaceV2UpdatePayload(form);

    expect(payload).not.toHaveProperty("title");
    expect(payload).not.toHaveProperty("content_mode");
    expect(payload).not.toHaveProperty("generation_mode");
    expect(payload).toMatchObject({
      aspect_ratio: "9:16",
    });
  });
});

describe("workspaceV2FormFromProject", () => {
  it("maps project data to edit form", () => {
    const form = workspaceV2FormFromProject({
      title: "测试4",
      content_mode: "narration",
      source_kind: "novel",
      style: "国风",
      style_template_id: "live_premium_drama",
      aspect_ratio: "16:9",
      generation_mode: "reference_video",
      default_duration: 9,
      text_backend_script: "custom-1/minimax-m2.7",
      image_provider_t2i: "custom-2/qwen-image",
      image_provider_i2i: "custom-2/hidream-o1-image",
      video_backend: "custom-3/doubao-seedance-2.0",
      model_settings: {
        "custom-2/qwen-image": { resolution: "1k" },
        "custom-3/doubao-seedance-2.0": { resolution: "1080p" },
      },
      episodes: [],
      characters: {},
      metadata: { created_at: "", updated_at: "" },
    });

    expect(form).toMatchObject({
      projectName: "测试4",
      creationMode: "narration",
      aspectRatio: "16:9",
      visualStyleId: "live_premium_drama",
      imageModel: "custom-2/qwen-image",
      imageModelI2I: "custom-2/hidream-o1-image",
      shotDurationSec: 9,
    });
  });
});

describe("updateWorkspaceV2Project", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("patches project without title", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        success: true,
        project: { title: "测试", content_mode: "narration", style: "", episodes: [], characters: {} },
      }),
    );

    const payload = buildWorkspaceV2UpdatePayload({
      projectName: "测试",
      creationMode: "narration",
      scriptAdaptation: "ai_rewrite",
      aspectRatio: "16:9",
      visualStyleId: "live_premium_drama",
      textModel: "custom-1/minimax-m2.7",
      imageModel: "custom-2/qwen-image",
      imageModelI2I: "custom-2/hidream-o1-image",
      videoModel: "custom-3/doubao-seedance-2.0",
      imageResolution: "1k",
      videoResolution: "1080p",
      shotDurationSec: 9,
    });

    const result = await updateWorkspaceV2Project("proj-demo", payload);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
    expect(result.success).toBe(true);
    expect(payload).not.toHaveProperty("title");
  });
});

describe("fetchWorkspaceV2StyleTemplates", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps grouped style templates from backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        live: [{ id: "live_premium_drama", name: "精品短剧", prompt: "真人电视剧风格" }],
        anim: [{ id: "anim_kyoto", name: "商业动画 京都", prompt: "商业动画画风" }],
      }),
    );

    const result = await fetchWorkspaceV2StyleTemplates();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/style-templates"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(result.live).toEqual([
      {
        id: "live_premium_drama",
        category: "live",
        name: "精品短剧",
        prompt: "真人电视剧风格",
      },
    ]);
    expect(result.anim).toEqual([
      { id: "anim_kyoto", category: "anim", name: "商业动画 京都", prompt: "商业动画画风" },
    ]);
  });

  it("falls back to id when name is missing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        live: [{ id: "live_noir_sci-fi", prompt: "noir sci-fi look" }],
        anim: [],
      }),
    );

    const result = await fetchWorkspaceV2StyleTemplates();

    expect(result.live).toEqual([
      {
        id: "live_noir_sci-fi",
        category: "live",
        name: "live_noir_sci-fi",
        prompt: "noir sci-fi look",
      },
    ]);
  });
});

describe("mapWorkspaceV2ProjectDetail", () => {
  it("maps project without overview as welcome state", () => {
    const detail = mapWorkspaceV2ProjectDetail("proj-demo", {
      project: {
        title: "测试剧情",
        content_mode: "drama",
        style: "国风",
        episodes: [],
        characters: {},
        metadata: { created_at: "", updated_at: "" },
        status: {
          current_phase: "setup",
          phase_progress: 0,
          characters: { total: 0, completed: 0 },
          scenes: { total: 0, completed: 0 },
          props: { total: 0, completed: 0 },
          episodes_summary: { total: 0, scripted: 0, in_production: 0, completed: 0 },
        },
      },
      scripts: {},
    });

    expect(detail.hasOverview).toBe(false);
    expect(detail.overview).toBeNull();
    expect(detail.contentModeLabel).toBe("剧集模式");
    expect(detail.progress).toBe("script_import");
    expect(workspaceV2NeedsWelcomeUpload(detail)).toBe(true);
  });

  it("maps project with overview", () => {
    const detail = mapWorkspaceV2ProjectDetail("proj-demo", {
      project: {
        title: "测试剧情",
        content_mode: "drama",
        style: "国风",
        episodes: [],
        characters: {},
        metadata: { created_at: "", updated_at: "" },
        overview: {
          synopsis: "故事简介",
          genre: "穿越,逆袭",
          theme: "成长",
          world_setting: "架空王朝",
        },
        status: {
          current_phase: "worldbuilding",
          phase_progress: 0.2,
          characters: { total: 8, completed: 3 },
          scenes: { total: 6, completed: 2 },
          props: { total: 10, completed: 5 },
          episodes_summary: { total: 0, scripted: 0, in_production: 0, completed: 0 },
        },
      },
      scripts: {},
    });

    expect(detail.hasOverview).toBe(true);
    expect(detail.overview?.description).toBe("故事简介");
    expect(detail.overview?.genre).toBe("穿越,逆袭");
    expect(detail.overview?.theme).toBe("成长");
    expect(detail.progress).toBe("asset_generation");
    expect(workspaceV2NeedsWelcomeUpload(detail)).toBe(false);
  });

  it("maps progress from status.current_phase for new phase keys", () => {
    const detail = mapWorkspaceV2ProjectDetail("proj-demo", {
      project: {
        title: "测试剧情",
        content_mode: "drama",
        style: "国风",
        episodes: [],
        characters: {},
        metadata: { created_at: "", updated_at: "" },
        overview: {
          synopsis: "故事简介",
          genre: "神话",
          theme: "成长",
          world_setting: "唐",
        },
        status: {
          current_phase: "script_import" as never,
          phase_progress: 0,
          characters: { total: 0, completed: 0 },
          scenes: { total: 0, completed: 0 },
          props: { total: 0, completed: 0 },
          episodes_summary: { total: 0, scripted: 0, in_production: 0, completed: 0 },
        },
      },
      scripts: {},
    });

    expect(detail.progress).toBe("script_import");
  });
});

describe("fetchWorkspaceV2ProjectDetail", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches project detail from workspace v2 backend", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        project: {
          project_id: "proj-demo",
          title: "测试",
          content_mode: "drama",
          style: "国风",
          episodes: [],
          characters: {},
          metadata: { created_at: "", updated_at: "" },
        },
        scripts: {},
      }),
    );

    const detail = await fetchWorkspaceV2ProjectDetail("proj-demo");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    expect(detail.id).toBe("proj-demo");
    expect(detail.name).toBe("测试");
  });
});

describe("workspace v2 source and overview APIs", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads source via POST /source without triggering overview", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, filename: "novel.txt" }),
    );

    const file = new File(["hello"], "novel.txt", { type: "text/plain" });
    const result = await setWorkspaceV2ProjectSource("proj-demo", file);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/source"),
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init?.body as FormData;
    expect(body.get("file")).toBeInstanceOf(File);
    expect(body.get("generate_overview")).toBeNull();
    expect(result.filename).toBe("novel.txt");
  });

  it("generates overview via POST /generate-overview", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        success: true,
        overview: { synopsis: "简介", genre: "穿越", theme: "成长", world_setting: "架空" },
      }),
    );

    const result = await generateWorkspaceV2Overview("proj-demo");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/generate-overview"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.overview.synopsis).toBe("简介");
  });

  it("updates overview via PATCH /overview", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ success: true }));

    const result = await updateWorkspaceV2Overview("proj-demo", { synopsis: "新简介" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/overview"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ synopsis: "新简介" }),
      }),
    );
    expect(result.success).toBe(true);
  });

  it("fetches script-import overview via GET /overview", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        title: "刘姥姥逛大观园",
        overview: {
          synopsis: "故事简介",
          genre: "古典",
          theme: "反差",
          world_setting: "大观园",
        },
        world_setting: "大观园",
        source_files: [{ name: "novel.txt", size: 12, url: "/files/novel.txt" }],
        source_text: "原文",
      }),
    );

    const result = await fetchWorkspaceV2ProjectOverview("proj-demo");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/overview"),
      expect.any(Object),
    );
    expect(result.title).toBe("刘姥姥逛大观园");
    expect(workspaceV2ScriptImportHasOverview(result)).toBe(true);
    expect(mapWorkspaceV2ScriptImportOverview(result)).toMatchObject({
      description: "故事简介",
      genre: "古典",
      theme: "反差",
      worldviewSetting: "大观园",
      sourceText: "原文",
    });
  });

  it("treats empty overview object as no overview content", () => {
    expect(
      workspaceV2ScriptImportHasOverview({
        title: "",
        overview: {},
        world_setting: "",
        source_files: [{ name: "a.txt", size: 1, url: "/a.txt" }],
        source_text: "x",
      }),
    ).toBe(false);
  });

  it("fetches project assets via GET /assets", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        characters: [
          {
            name: "哪吒",
            description: "少年",
            character_sheet: "characters/哪吒.png",
            status: "generated",
          },
        ],
        scenes: [{ name: "陈塘关", description: "城墙", scene_sheet: "scenes/a.png" }],
        props: [{ name: "风火轮", description: "法器", prop_sheet: "props/a.png" }],
      }),
    );

    const result = await fetchWorkspaceV2ProjectAssets("proj-demo");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/assets"),
      expect.any(Object),
    );
    const mapped = mapWorkspaceV2ProjectAssets(result);
    expect(mapped.characters["哪吒"]?.description).toBe("少年");
    expect(mapped.characters["哪吒"]?.status).toBe("generated");
    expect(mapped.scenes["陈塘关"]?.scene_sheet).toBe("scenes/a.png");
    expect(mapped.props["风火轮"]?.prop_sheet).toBe("props/a.png");
  });

  it("fetches project assets with search query", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ characters: [], scenes: [], props: [] }));

    await fetchWorkspaceV2ProjectAssets("proj-demo", { search: "刘姥姥" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/assets?search="),
      expect.any(Object),
    );
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain(encodeURIComponent("刘姥姥"));
  });

  it("patches script-scene asset bindings", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ success: true }));

    await updateWorkspaceV2ScriptScene("proj-demo", "E1S01", {
      characters_in_scene: ["袁世凯"],
      scenes: [],
      props: ["密信", "油灯"],
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/script-scenes/E1S01"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          characters_in_scene: ["袁世凯"],
          scenes: [],
          props: ["密信", "油灯"],
        }),
      }),
    );
  });

  it("puts script scene field updates (mode 3)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ success: true }));

    await updateWorkspaceV2Script("proj-demo", 1, {
      scene_id: "E1S01",
      fields: {
        visual_description: "济南府衙深夜",
        dialogue: [{ speaker: "袁世凯", line: "练得如何了？" }],
      },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/scripts/1"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          scene_id: "E1S01",
          fields: {
            visual_description: "济南府衙深夜",
            dialogue: [{ speaker: "袁世凯", line: "练得如何了？" }],
          },
        }),
      }),
    );
  });

  it("maps draft and failed asset statuses", () => {
    const mapped = mapWorkspaceV2ProjectAssets({
      characters: [
        { name: "甲", description: "d", status: "draft" },
        { name: "乙", description: "d", status: "failed" },
      ],
      scenes: [],
      props: [],
    });
    expect(mapped.characters["甲"]?.status).toBe("draft");
    expect(mapped.characters["乙"]?.status).toBe("failed");
  });

  it("maps asset prompt_template", () => {
    const mapped = mapWorkspaceV2ProjectAssets({
      characters: [],
      scenes: [
        {
          name: "关羽营帐",
          description: "提示词",
          prompt_template: {
            layout: "wide shot",
            guard: "keep armor",
            negative_tail: "blurry",
          },
        },
      ],
      props: [],
    });
    expect(mapped.scenes["关羽营帐"]?.prompt_template).toEqual({
      layout: "wide shot",
      guard: "keep armor",
      negative_tail: "blurry",
    });
  });

  it("lists project files via GET /files", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        files: { source: [{ name: "novel.txt", size: 12, url: "/files/novel.txt" }] },
      }),
    );

    const result = await listWorkspaceV2ProjectFiles("proj-demo");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/files"),
      expect.any(Object),
    );
    expect(result.files.source?.[0]?.name).toBe("novel.txt");
  });

  it("deletes source file via DELETE /source/{filename}", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ success: true }));

    const result = await deleteWorkspaceV2SourceFile("proj-demo", "高老庄.txt");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/ws2/v1/projects/proj-demo/source/%E9%AB%98%E8%80%81%E5%BA%84.txt",
      ),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result.success).toBe(true);
  });

  it("extracts assets via POST /auto-assets/generate", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        success: true,
        message: "ok",
        characters: [{ name: "主角", description: "少年" }],
        scenes: [],
        props: [],
      }),
    );

    const result = await extractWorkspaceV2Assets("proj-demo", { asset_type: "character" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/auto-assets/generate"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ asset_type: "character" }),
      }),
    );
    expect(result.characters).toHaveLength(1);
    expect(countWorkspaceV2ExtractedAssets(result, "character")).toBe(1);
  });

  it("resolves async auto-assets generate task id without requiring asset arrays", () => {
    expect(
      resolveWorkspaceV2ExtractAssetsTaskId({
        success: true,
        message: "任务已入队，正在生成资产",
        task_id: "98c70819613c4e2aa9b92a3e9fc11f",
      }),
    ).toBe("98c70819613c4e2aa9b92a3e9fc11f");
    expect(
      resolveWorkspaceV2ExtractAssetsTaskId({
        success: true,
        message: "ok",
        taskId: "camel-task",
      }),
    ).toBe("camel-task");
    expect(
      countWorkspaceV2ExtractedAssets(
        { success: true, message: "queued" },
        "scene",
      ),
    ).toBe(0);
  });

  it("resolves batch generate task ids from singular or plural fields", () => {
    expect(
      resolveWorkspaceV2BatchGenerateTaskIds({
        success: true,
        task_id: "a",
        task_ids: ["b", "a", ""],
      }),
    ).toEqual(["a", "b"]);
  });

  it("posts character-batch without body when names are omitted", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, message: "batch_tasks_submitted", submitted: [] }),
    );

    await generateWorkspaceV2CharacterBatch("proj-demo");

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/ws2/v1/projects/proj-demo/generate/character-batch");
    expect(init).toMatchObject({ method: "POST" });
    expect(init && "body" in init ? init.body : undefined).toBeUndefined();
  });

  it("posts character-batch with names when provided", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, message: "batch_tasks_submitted", submitted: [] }),
    );

    await generateWorkspaceV2CharacterBatch("proj-demo", { names: ["吕布", ""] });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/generate/character-batch"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ names: ["吕布"] }),
      }),
    );
  });

  it("posts storyboard generate with prompt and script_file", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, task_id: "sb-1", message: "queued" }),
    );

    await generateWorkspaceV2Storyboard("proj-demo", "E1S01", "虎牢关前", "episode_1.json");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/generate/storyboard/E1S01"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ prompt: "虎牢关前", script_file: "episode_1.json" }),
      }),
    );
  });

  it("posts video generate with prompt, script_file and duration", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, task_id: "vid-1", message: "queued" }),
    );

    await generateWorkspaceV2Video(
      "proj-demo",
      "E1S01",
      { action: "吕布出阵" },
      "episode_1.json",
      5,
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/generate/video/E1S01"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          prompt: { action: "吕布出阵" },
          script_file: "episode_1.json",
          duration_seconds: 5,
        }),
      }),
    );
  });

  it("posts storyboard upload for a single segment", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, task_id: "up-1", message: "queued" }),
    );

    await uploadWorkspaceV2Storyboard("proj-demo", "E1S01");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/storyboards/E1S01/upload"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("posts storyboard upload batch with segment_ids", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, task_ids: ["up-1", "up-2"], message: "queued" }),
    );

    await uploadWorkspaceV2StoryboardsBatch("proj-demo", ["E1S01", "E1S02"]);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/storyboards/upload"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ segment_ids: ["E1S01", "E1S02"] }),
      }),
    );
  });

  it("posts storyboard-batch with episode and segment_ids", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, task_ids: ["sb-1", "sb-2"], message: "queued" }),
    );

    await generateWorkspaceV2StoryboardBatch("proj-demo", {
      episode: 1,
      script_file: "episode_1.json",
      segment_ids: ["E1S01", "E1S02"],
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/generate/storyboard-batch"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          episode: 1,
          script_file: "episode_1.json",
          segment_ids: ["E1S01", "E1S02"],
        }),
      }),
    );
  });

  it("posts video-batch with episode and segment_ids", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, task_ids: ["vid-1"], message: "queued" }),
    );

    await generateWorkspaceV2VideoBatch("proj-demo", {
      episode: 1,
      script_file: "episode_1.json",
      segment_ids: ["E1S01"],
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/generate/video-batch"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          episode: 1,
          script_file: "episode_1.json",
          segment_ids: ["E1S01"],
        }),
      }),
    );
  });

  it("builds episode script file names like the legacy API", () => {
    expect(workspaceV2EpisodeScriptFile(1)).toBe("episode_1.json");
    expect(workspaceV2EpisodeScriptFile(12)).toBe("episode_12.json");
  });

  it("posts insert episode with title, file_path and index", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ success: true }));

    await insertWorkspaceV2Episode("proj-demo", {
      title: "青龙出海",
      file_path: "uploads/ep3.txt",
      index: 3,
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/episodes"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "青龙出海",
          file_path: "uploads/ep3.txt",
          index: 3,
        }),
      }),
    );
  });

  it("deletes episode by number", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ success: true }));

    await deleteWorkspaceV2Episode("proj-demo", 3);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/episodes/3"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("posts export token with name and scope query params", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ download_token: "tok-abc", expires_in: 60 }),
    );

    const result = await createWorkspaceV2ExportToken("proj-demo", "演示项目", "current");

    expect(result.download_token).toBe("tok-abc");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/api/ws2/v1/projects/proj-demo/export/token?name=%E6%BC%94%E7%A4%BA%E9%A1%B9%E7%9B%AE&scope=current",
      ),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("builds merged video download url", () => {
    const url = getWorkspaceV2MergedVideoDownloadUrl("proj-demo", "演示项目", 2, "tok-abc");
    expect(url).toContain("/api/ws2/v1/projects/proj-demo/export/merged-video?");
    expect(url).toContain("episode=2");
    expect(url).toContain("download_token=tok-abc");
  });

  it("processes script via POST /script/process", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ processed_content: "第一场\n诸葛亮登城" }),
    );

    const result = await processWorkspaceV2Script("proj-demo");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/script/process"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    expect(resolveWorkspaceV2ProcessedScriptContent(result)).toBe("第一场\n诸葛亮登城");
  });

  it("resolves script process task id from snake_case or camelCase", () => {
    expect(
      resolveWorkspaceV2ScriptProcessTaskId({ task_id: "abc" }),
    ).toBe("abc");
    expect(
      resolveWorkspaceV2ScriptProcessTaskId({ taskId: "def" }),
    ).toBe("def");
    expect(resolveWorkspaceV2ScriptProcessTaskId({})).toBeNull();
  });

  it("lists scripts via GET /scripts", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        success: true,
        scripts: [
          {
            title: "空城计",
            episode_number: 1,
            scenes: [{ scene_id: "S01", visual_description: "城楼之上" }],
          },
        ],
      }),
    );

    const result = await listWorkspaceV2Scripts("proj-demo");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-demo/scripts"),
      expect.any(Object),
    );
    expect(parseWorkspaceV2ListedScripts(result)).toEqual([
      expect.objectContaining({
        title: "空城计",
        episode_number: 1,
        scenes: [{ scene_id: "S01", visual_description: "城楼之上" }],
      }),
    ]);
  });

  it("parses empty scripts list as empty episodes", () => {
    expect(parseWorkspaceV2ListedScripts({ success: true, scripts: [] })).toEqual([]);
    expect(parseWorkspaceV2ListedScripts({ success: true, scripts: {} })).toEqual([]);
  });

  it("sorts listed scripts by episode_number", () => {
    const episodes = parseWorkspaceV2ListedScripts({
      success: true,
      scripts: [
        { title: "第二集", episode_number: 2, scenes: [] },
        { title: "第一集", episode_number: 1, scenes: [{ visual_description: "开场" }] },
      ],
    });

    expect(episodes.map((episode) => episode.title)).toEqual(["第一集", "第二集"]);
    expect(resolveWorkspaceV2EpisodeName(episodes[0]!, 0)).toBe("第一集");
  });

  it("parses scripts map with metadata for table columns", () => {
    const episodes = parseWorkspaceV2ListedScripts({
      success: true,
      scripts: {
        "episode_2.json": {
          title: "第二集",
          episode: 2,
          scenes: [{ scene_id: "S01" }],
          metadata: {
            created_at: "2026-07-14T09:38:42.358406+00:00",
            status: "draft",
            updated_at: "2026-07-14T09:38:42.358406+00:00",
            total_scenes: 1,
            estimated_duration_seconds: 12,
          },
        },
        "episode_1.json": {
          title: "乌斯藏国界遇妖讽",
          episode: 1,
          scenes: [{ scene_id: "S01" }, { scene_id: "S02" }, { scene_id: "S03" }],
          metadata: {
            created_at: "2026-07-14T09:38:42.358406+00:00",
            status: "draft",
            updated_at: "2026-07-14T09:38:42.358406+00:00",
            total_scenes: 3,
            estimated_duration_seconds: 24,
          },
        },
      },
    });

    expect(episodes).toHaveLength(2);
    expect(resolveWorkspaceV2EpisodeName(episodes[0]!, 0)).toBe("乌斯藏国界遇妖讽");
    expect(resolveWorkspaceV2ScriptEpisodeMetadata(episodes[0]!)).toEqual({
      createdAt: "2026-07-14T09:38:42.358406+00:00",
      updatedAt: "2026-07-14T09:38:42.358406+00:00",
      status: "draft",
      totalScenes: 3,
      estimatedDurationSeconds: 24,
    });
  });

  it("unwraps scripts array items shaped as { episode_n.json: chapter }", () => {
    const episodes = parseWorkspaceV2ListedScripts({
      success: true,
      scripts: [
        {
          "episode_1.json": {
            title: "乌斯藏国界遇妖讯",
            episode: 1,
            content_mode: "drama",
            scenes: [{ scene_id: "S01" }, { scene_id: "S02" }, { scene_id: "S03" }],
            metadata: {
              created_at: "2026-07-14T09:38:42.358406+00:00",
              status: "draft",
              updated_at: "2026-07-14T09:38:42.358406+00:00",
              total_scenes: 3,
              estimated_duration_seconds: 24,
            },
            duration_seconds: 24,
            scenes_in_episode: [],
          },
        },
        {
          "episode_2.json": {
            title: "高老庄降妖",
            episode: 2,
            scenes: [{ scene_id: "S01" }],
            metadata: {
              created_at: "2026-07-14T10:00:00Z",
              status: "draft",
              updated_at: "2026-07-14T10:00:00Z",
              total_scenes: 1,
              estimated_duration_seconds: 8,
            },
          },
        },
      ],
    });

    expect(episodes).toHaveLength(2);
    expect(resolveWorkspaceV2EpisodeName(episodes[0]!, 0)).toBe("乌斯藏国界遇妖讯");
    expect(episodes[0]!.scenes).toHaveLength(3);
    expect(resolveWorkspaceV2ScriptEpisodeMetadata(episodes[0]!)).toEqual({
      createdAt: "2026-07-14T09:38:42.358406+00:00",
      updatedAt: "2026-07-14T09:38:42.358406+00:00",
      status: "draft",
      totalScenes: 3,
      estimatedDurationSeconds: 24,
    });
    expect(resolveWorkspaceV2EpisodeName(episodes[1]!, 1)).toBe("高老庄降妖");
    expect(resolveWorkspaceV2ScriptEpisodeMetadata(episodes[1]!).totalScenes).toBe(1);
  });

  it("unwraps scripts map values that are JSON strings", () => {
    const payload = {
      title: "乌斯藏国界遇妖讽",
      episode: 1,
      scenes: [{ scene_id: "S01" }, { scene_id: "S02" }, { scene_id: "S03" }],
      metadata: {
        created_at: "2026-07-14T09:38:42.358406+00:00",
        status: "draft",
        updated_at: "2026-07-14T09:38:42.358406+00:00",
        total_scenes: 3,
        estimated_duration_seconds: 24,
      },
    };

    const fromString = parseWorkspaceV2ListedScripts({
      scripts: { "episode_1.json": JSON.stringify(payload) },
    });
    expect(resolveWorkspaceV2EpisodeName(fromString[0]!, 0)).toBe("乌斯藏国界遇妖讽");
    expect(resolveWorkspaceV2ScriptEpisodeMetadata(fromString[0]!).totalScenes).toBe(3);
    expect(resolveWorkspaceV2ScriptEpisodeMetadata(fromString[0]!).status).toBe("draft");
  });

  it("formats structured script scenes from process response", () => {
    const text = resolveWorkspaceV2ProcessedScriptContent({
      title: "空城计",
      scenes: [
        {
          scene_id: "S01",
          characters_in_scene: ["诸葛亮", "传令兵"],
          visual_description: "城楼之上，旗帜飘扬",
          dialogue: [{ speaker: "诸葛亮", line: "大开城门" }],
        },
      ],
    });

    expect(text).toContain("【空城计】");
    expect(text).toContain("【S01】");
    expect(text).toContain("诸葛亮：大开城门");
  });

  it("parses episodes table rows from process response", () => {
    const episodes = parseWorkspaceV2ScriptEpisodes({
      title: "虎牢关三英战吕布",
      episodes: [
        {
          episode_1: "飞将横行，诸侯胆寒",
          scenes: [{ scene_id: "S01", visual_描述: "虎牢关前，狂风呼啸" }],
        },
        {
          episode_2: "第二集标题",
          scenes: [{ visual_description: "军营议事" }],
        },
      ],
    });

    expect(episodes).toHaveLength(2);
    expect(resolveWorkspaceV2EpisodeName(episodes[0]!, 0)).toBe("飞将横行，诸侯胆寒");
    expect(resolveWorkspaceV2EpisodeName(episodes[1]!, 1)).toBe("第二集标题");
    expect(resolveWorkspaceV2SceneVisualDescription(episodes[0]!.scenes?.[0])).toBe(
      "虎牢关前，狂风呼啸",
    );
  });

  it("prefers scripts map over episodes for table rows", () => {
    const episodes = parseWorkspaceV2ScriptEpisodes({
      episodes: [{ episode_1: "旧结构", scenes: [] }],
      scripts: {
        "episode_1.json": {
          title: "乌斯藏国界遇妖讽",
          episode: 1,
          scenes: [
            {
              scene_id: "S01",
              visual_description: "荒漠戈壁，夕阳西下",
              dialogue: [{ speaker: "唐僧", line: "悟空，前面是何去处？" }],
            },
          ],
        },
        "episode_2.json": {
          title: "第二集",
          episode: 2,
          scenes: [{ visual_description: "山洞之中" }],
        },
      },
    });

    expect(episodes).toHaveLength(2);
    expect(resolveWorkspaceV2EpisodeName(episodes[0]!, 0)).toBe("乌斯藏国界遇妖讽");
    expect(resolveWorkspaceV2SceneVisualDescription(episodes[0]!.scenes?.[0])).toBe(
      "荒漠戈壁，夕阳西下",
    );
    expect(resolveWorkspaceV2EpisodeName(episodes[1]!, 1)).toBe("第二集");
  });

  it("resolves script episode metadata for table columns", () => {
    const meta = resolveWorkspaceV2ScriptEpisodeMetadata({
      title: "乌斯藏国界遇妖讽",
      episode: 1,
      duration_seconds: 24,
      scenes: [{ scene_id: "S01" }, { scene_id: "S02" }, { scene_id: "S03" }],
      metadata: {
        created_at: "2026-07-14T09:38:42Z",
        status: "draft",
        updated_at: "2026-07-14T09:38:42Z",
        total_scenes: 3,
        estimated_duration_seconds: 24,
      },
    });

    expect(meta).toEqual({
      createdAt: "2026-07-14T09:38:42Z",
      updatedAt: "2026-07-14T09:38:42Z",
      status: "draft",
      totalScenes: 3,
      estimatedDurationSeconds: 24,
    });
  });

  it("resolves characters_in_episode for table tags", () => {
    expect(
      resolveWorkspaceV2EpisodeCharacters({
        title: "乌斯藏国界遇妖讯",
        characters_in_episode: ["唐僧", "孙悟空", "高才", "唐僧", "  "],
      }),
    ).toEqual(["唐僧", "孙悟空", "高才"]);
    expect(resolveWorkspaceV2EpisodeCharacters({ title: "空" })).toEqual([]);
  });

  it("formats dialogue entries keyed by character name", () => {
    const entries = parseWorkspaceV2DialogueEntries([
      { 吕布: "公孙伯珪，找死！" },
      { speaker: "诸葛亮", line: "大开城门" },
    ]);

    expect(entries).toEqual([
      { speaker: "吕布", line: "公孙伯珪，找死！" },
      { speaker: "诸葛亮", line: "大开城门" },
    ]);
    expect(formatWorkspaceV2DialogueLines([{ 吕布: "公孙伯珪，找死！" }])).toEqual([
      "  吕布：公孙伯珪，找死！",
    ]);
  });
});

describe("mapWorkspaceV2EpisodeConfigShots", () => {
  it("uses scene.action only for 动作, not text or video_prompt.action", () => {
    const shots = mapWorkspaceV2EpisodeConfigShots(
      {
        scenes: [
          {
            scene_id: "E1S02",
            action: "",
            text: "ddddddd",
            video_prompt: { action: "ddddddd", camera_motion: "推" },
          },
        ],
      },
      "demo",
    );

    expect(shots).toHaveLength(1);
    expect(shots[0]?.action).toBeUndefined();
    expect(shots[0]?.videoPrompt).toEqual({ action: "ddddddd", camera_motion: "推" });
  });

  it("does not fall back display fields from video_prompt or aliases", () => {
    const shots = mapWorkspaceV2EpisodeConfigShots(
      {
        scenes: [
          {
            scene_id: "E1S03",
            visual_description: "",
            action: "",
            dialogue: "",
            narration: "",
            text: "原文不应展示为动作",
            dialog: "旧字段不应作为对白",
            voiceover: "voiceover 不应作为旁白",
            video_prompt: {
              action: "视频提示动作",
              dialogue: "视频提示对白",
            },
            image_prompt: { scene: "不应作为描述" },
          },
        ],
      },
      "demo",
    );

    expect(shots[0]?.visual).toBe("");
    expect(shots[0]?.action).toBeUndefined();
    expect(shots[0]?.dialogue).toBeUndefined();
    expect(shots[0]?.narration).toBeUndefined();
  });

  it("keeps structured dialogue entries from scene objects", () => {
    const shots = mapWorkspaceV2EpisodeConfigShots(
      {
        scenes: [
          {
            scene_id: "E1S01",
            visual_description: "虎牢关前，狂风裹挟沙砾",
            action: "吕布骑马出阵",
            narration: "虎牢关前",
            characters_in_scene: ["吕布"],
            scenes: ["虎牢关"],
            props: ["方天画戟", "赤兔"],
            dialogue: [{ speaker: "吕布", line: "袁本初，曹孟德！" }],
            image_prompt: { scene: "虎牢关前" },
            video_prompt: { action: "吕布骑马出阵", camera_motion: "推" },
            generated_assets: {
              storyboard_image: "/api/v1/files/demo/E1S01.png",
              video_clip: "/api/v1/files/demo/E1S01.mp4",
              authorized: true,
            },
          },
        ],
      },
      "demo",
    );

    expect(shots).toHaveLength(1);
    expect(shots[0]?.sceneId).toBe("E1S01");
    expect(shots[0]?.visual).toBe("虎牢关前，狂风裹挟沙砾");
    expect(shots[0]?.characters).toEqual(["吕布"]);
    expect(shots[0]?.scenes).toEqual(["虎牢关"]);
    expect(shots[0]?.props).toEqual(["方天画戟", "赤兔"]);
    expect(shots[0]?.dialogueEntries).toEqual([
      { speaker: "吕布", line: "袁本初，曹孟德！" },
    ]);
    expect(shots[0]?.dialogue).toContain("吕布：袁本初，曹孟德！");
    expect(shots[0]?.imagePrompt).toEqual({ scene: "虎牢关前" });
    expect(shots[0]?.videoPrompt).toEqual({ action: "吕布骑马出阵", camera_motion: "推" });
    expect(shots[0]?.storyboardImageUrl).toContain("/api/ws2/v1/files/demo/E1S01.png");
    expect(shots[0]?.storyboardVideoUrl).toContain("/api/ws2/v1/files/demo/E1S01.mp4");
    expect(shots[0]?.authorized).toBe(true);
  });

  it("prefers structured dialogue from video_prompt over top-level scene.dialogue", () => {
    const shots = mapWorkspaceV2EpisodeConfigShots(
      {
        scenes: [
          {
            scene_id: "E1S01",
            dialogue: [{ speaker: "旧角色", line: "旧台词" }],
            video_prompt: {
              action: "推进",
              dialogue: [{ speaker: "袁世凯", line: "招募的新军，练得如何了？" }],
            },
          },
        ],
      },
      "demo",
    );

    expect(shots[0]?.dialogueEntries).toEqual([
      { speaker: "袁世凯", line: "招募的新军，练得如何了？" },
    ]);
  });

  it("reads structured dialogue from video_prompt when scene top-level is missing", () => {
    const shots = mapWorkspaceV2EpisodeConfigShots(
      {
        scenes: [
          {
            scene_id: "E1S01",
            video_prompt: {
              action: "推进",
              dialogue: [{ speaker: "袁世凯", line: "招募的新军，练得如何了？" }],
            },
          },
        ],
      },
      "demo",
    );

    expect(shots[0]?.dialogueEntries).toEqual([
      { speaker: "袁世凯", line: "招募的新军，练得如何了？" },
    ]);
    expect(shots[0]?.dialogue).toContain("袁世凯：招募的新军，练得如何了？");
  });

  it("reads duration_seconds from video_prompt when scene top-level is missing", () => {
    const shots = mapWorkspaceV2EpisodeConfigShots(
      {
        scenes: [
          {
            scene_id: "E1S01",
            video_prompt: {
              action: "推进",
              camera_motion: "Zoom in",
              ambiance_audio: "环境音效",
              duration_seconds: 4,
            },
          },
        ],
      },
      "demo",
    );

    expect(shots[0]?.durationSec).toBe(4);
    expect(
      resolveWorkspaceV2ShotDurationSec({
        durationSec: shots[0]?.durationSec,
        videoPrompt: shots[0]?.videoPrompt,
      }),
    ).toBe(4);
  });

  it("builds file urls for relative storyboard paths like the legacy API", () => {
    const shots = mapWorkspaceV2EpisodeConfigShots(
      {
        scenes: [
          {
            scene_id: "E1S01",
            visual_description: "虎牢关前",
            generated_assets: {
              storyboard_image: "storyboards/E1S01.png",
              video_clip: "videos/E1S01.mp4",
            },
          },
        ],
      },
      "proj-demo",
    );

    expect(shots[0]?.storyboardImageUrl).toContain(
      "/api/ws2/v1/files/proj-demo/storyboards/E1S01.png",
    );
    expect(shots[0]?.storyboardVideoUrl).toContain(
      "/api/ws2/v1/files/proj-demo/videos/E1S01.mp4",
    );
    expect(shots[0]?.thumbnailUrl).toContain(
      "/api/ws2/v1/files/proj-demo/storyboards/E1S01.png",
    );
  });
});

describe("resolveWorkspaceV2ShotMediaUrl", () => {
  it("rewrites absolute v1 file urls onto ws2", () => {
    expect(resolveWorkspaceV2ShotMediaUrl("proj", "/api/v1/files/proj/a.png")).toContain(
      "/api/ws2/v1/files/proj/a.png",
    );
  });

  it("joins relative project paths with files endpoint", () => {
    expect(resolveWorkspaceV2ShotMediaUrl("proj", "storyboards/E1S01.png")).toContain(
      "/api/ws2/v1/files/proj/storyboards/E1S01.png",
    );
  });
});

describe("mapWorkspaceV2ProductionEpisodes", () => {
  it("maps episodes[].scenes into sidebar + shot list", () => {
    const episodes = mapWorkspaceV2ProductionEpisodes(
      {
        episodes: [
          {
            episode: 2,
            title: "初战黄巾",
            status: "scripted",
            script_status: "generated",
            scenes: [],
          },
          {
            episode: 1,
            title: "桃园结义",
            status: "scripted",
            script_status: "generated",
            scenes: [
              {
                scene_id: "E1S01",
                visual_description: "春日桃园",
                duration_seconds: 4,
                characters_in_scene: ["刘备"],
                dialogue: [{ speaker: "刘备", line: "兄长请" }],
                image_prompt: { scene: "桃园外景" },
              },
            ],
          },
        ],
      },
      "proj-demo",
    );

    expect(episodes.map((ep) => ep.episodeNumber)).toEqual([1, 2]);
    expect(episodes[0]).toMatchObject({
      id: "ep-1",
      title: "桃园结义",
      scriptStatus: "generated",
    });
    expect(episodes[0]?.shots).toEqual([
      expect.objectContaining({
        sceneId: "E1S01",
        visual: "春日桃园",
        durationSec: 4,
        characters: ["刘备"],
        dialogue: "刘备：兄长请",
        imagePrompt: { scene: "桃园外景" },
      }),
    ]);
    expect(episodes[1]?.shots).toEqual([]);
  });

  it("reads image_prompt/video_prompt/dialogue from episodes scenes", () => {
    const episodes = mapWorkspaceV2ProductionEpisodes(
      {
        episodes: [
          {
            episode: 1,
            title: "兵败街亭",
            status: "scripted",
            script_status: "generated",
            scenes: [
              {
                scene_id: "E1S01",
                visual_description: "街亭败局",
                dialogue: [
                  { speaker: "传令兵", line: "街亭失守！" },
                  { speaker: "诸葛亮", line: "再探！" },
                ],
                image_prompt: {
                  scene: "电影级质感, 4K超清",
                  composition: {
                    shot_type: "Medium Shot",
                    lighting: "自然漫射天光",
                    ambiance: "真人电视剧风格",
                  },
                },
                video_prompt: {
                  action: "传令兵跪地禀报",
                  camera_motion: "Tilt Up",
                  ambiance_audio: "环境音效",
                  duration_seconds: 4,
                },
                generated_assets: {
                  storyboard_image: "storyboards/E1S01.png",
                  video_clip: "videos/E1S01.mp4",
                },
              },
            ],
          },
        ],
      },
      "proj-demo",
    );

    expect(episodes[0]?.shots[0]).toMatchObject({
      visual: "街亭败局",
      durationSec: 4,
      dialogueEntries: [
        { speaker: "传令兵", line: "街亭失守！" },
        { speaker: "诸葛亮", line: "再探！" },
      ],
      imagePrompt: expect.objectContaining({ scene: "电影级质感, 4K超清" }),
      videoPrompt: expect.objectContaining({ action: "传令兵跪地禀报" }),
    });
    expect(episodes[0]?.shots[0]?.storyboardImageUrl).toContain("E1S01.png");
    expect(episodes[0]?.shots[0]?.storyboardVideoUrl).toContain("E1S01.mp4");
  });

  it("ignores deprecated scripts when episodes is present", () => {
    const episodes = mapWorkspaceV2ProductionEpisodes(
      {
        scripts: [
          {
            episode: 1,
            title: "scripts 侧标题-勿用",
            scenes: [
              {
                scene_id: "E1S01",
                visual_description: "scripts 侧画面-勿用",
                image_prompt: { scene: "scripts-E1" },
              },
            ],
          },
          {
            episode: 2,
            title: "scripts 第二集-勿用",
            scenes: [
              {
                scene_id: "E2S01",
                visual_description: "二",
                image_prompt: { scene: "scripts-E2" },
              },
            ],
          },
        ],
        episodes: [
          {
            episode: 1,
            title: "episodes 标题",
            scenes: [
              {
                scene_id: "E1S01",
                visual_description: "episodes 画面",
                image_prompt: { scene: "episodes-E1" },
              },
            ],
          },
        ],
      },
      "proj-demo",
    );

    expect(episodes).toHaveLength(1);
    expect(episodes[0]?.title).toBe("episodes 标题");
    expect(episodes[0]?.shots[0]?.visual).toBe("episodes 画面");
    expect(episodes[0]?.shots[0]?.imagePrompt).toEqual({ scene: "episodes-E1" });
  });

  it("reads video_uri when video_clip is absent on episodes scene", () => {
    const episodes = mapWorkspaceV2ProductionEpisodes(
      {
        episodes: [
          {
            episode: 1,
            title: "兵败街亭",
            scenes: [
              {
                scene_id: "E1S01",
                visual_description: "街亭",
                generated_assets: {
                  video_uri: "videos/E1S01-uri.mp4",
                },
              },
            ],
          },
        ],
      },
      "proj-demo",
    );

    expect(episodes[0]?.shots[0]?.storyboardVideoUrl).toContain("E1S01-uri.mp4");
  });

  it("keeps episodes[].scenes even when scene_id prefix mismatches episode", () => {
    expect(episodeNumberFromSceneId("E6S02")).toBe(6);
    expect(episodeNumberFromSceneId("E06S02")).toBe(6);
    expect(episodeNumberFromSceneId("E1S01")).toBe(1);

    const episodes = mapWorkspaceV2ProductionEpisodes(
      {
        episodes: [
          {
            episode: 3,
            title: "逼宫退位",
            scenes: [
              { scene_id: "E3S07", visual_description: "本集镜头" },
              { scene_id: "E1S08", visual_description: "新增分镜误标 E1" },
              { scene_id: "E1S08", visual_description: "重复" },
              { scene_id: "E6S02", visual_description: "其它集号前缀" },
            ],
          },
        ],
      },
      "proj-demo",
    );

    // 主路径信任 episodes 归属，仅按 scene_id 去重
    expect(episodes[0]?.shots.map((shot) => shot.sceneId)).toEqual([
      "E3S07",
      "E1S08",
      "E6S02",
    ]);
  });

  it("dropCrossEpisode still strips mismatched prefixes when enabled", () => {
    const shots = filterShotsForEpisode(
      [
        { id: "E6S02", shotNumber: 1, title: "x", durationSec: 4, visual: "" },
        { id: "E1S01", sceneId: "E1S01", shotNumber: 2, title: "y", durationSec: 4, visual: "" },
        { id: "E1S01-dup", sceneId: "E1S01", shotNumber: 3, title: "z", durationSec: 4, visual: "" },
      ],
      1,
      { dropCrossEpisode: true },
    );
    expect(shots.map((s) => s.sceneId ?? s.id)).toEqual(["E1S01"]);
  });

  it("falls back to scripts when episodes is empty", () => {
    const episodes = mapWorkspaceV2ProductionEpisodes(
      {
        scripts: [
          {
            episode: 1,
            title: "桃园结义",
            status: "scripted",
            script_status: "generated",
            scenes: [
              {
                scene_id: "E1S01",
                visual_description: "春日桃园",
                image_prompt: { scene: "桃园外景" },
              },
            ],
          },
        ],
        episodes: [],
      },
      "proj-demo",
    );

    expect(episodes).toHaveLength(1);
    expect(episodes[0]?.shots[0]).toMatchObject({
      sceneId: "E1S01",
      visual: "春日桃园",
      imagePrompt: { scene: "桃园外景" },
    });
  });

  it("falls back to episodes_stats when episodes and scripts are empty", () => {
    const episodes = mapWorkspaceV2ProductionEpisodes({
      episodes_stats: [
        {
          episode: 2,
          title: "初战黄巾",
          status: "scripted",
          script_status: "generated",
          storyboards: [],
          videos: {},
        },
        {
          episode: 1,
          title: "桃园结义",
          status: "scripted",
          script_status: "generated",
          storyboards: [
            {
              shot_number: 1,
              title: "桃园外景",
              visual: "春日桃园",
              duration_sec: 4,
              characters: ["刘备"],
            },
          ],
          videos: {},
        },
      ],
    });

    expect(episodes.map((ep) => ep.episodeNumber)).toEqual([1, 2]);
    expect(episodes[0]).toMatchObject({
      id: "ep-1",
      title: "桃园结义",
      scriptStatus: "generated",
    });
    expect(episodes[0]?.shots).toEqual([
      expect.objectContaining({
        shotNumber: 1,
        title: "桃园外景",
        visual: "春日桃园",
        durationSec: 4,
        characters: ["刘备"],
      }),
    ]);
    expect(episodes[1]?.shots).toEqual([]);
  });

  it("reads system_prompt_templates from episodes[].scenes[] (per-shot)", () => {
    const episodes = mapWorkspaceV2ProductionEpisodes(
      {
        // 项目级 / 分集级旧字段：不应再被读取
        system_prompt_templates: {
          storyboard: { scene_writing_guide: "项目级-勿用" },
        },
        episodes: [
          {
            episode: 1,
            title: "桃园结义",
            system_prompt_templates: {
              storyboard: { scene_writing_guide: "分集级-勿用" },
            },
            scenes: [
              {
                scene_id: "E1S01",
                visual_description: "春日桃园",
                system_prompt_templates: {
                  storyboard: {
                    scene_writing_guide: "镜头1场景指南",
                    negative_tail: "watermark",
                  },
                  video: {
                    action_writing_guide: "镜头1动作指南",
                  },
                },
              },
              {
                scene_id: "E1S02",
                visual_description: "桃园内景",
                system_prompt_templates: {
                  storyboard: {
                    scene_writing_guide: "镜头2场景指南",
                  },
                  video: {
                    action_writing_guide: "镜头2动作指南",
                  },
                },
              },
            ],
          },
        ],
      },
      "proj-demo",
    );

    expect(episodes[0]?.shots[0]?.systemPromptTemplates).toEqual({
      storyboard: {
        scene_writing_guide: "镜头1场景指南",
        negative_tail: "watermark",
      },
      video: {
        action_writing_guide: "镜头1动作指南",
      },
    });
    expect(episodes[0]?.shots[1]?.systemPromptTemplates).toEqual({
      storyboard: {
        scene_writing_guide: "镜头2场景指南",
      },
      video: {
        action_writing_guide: "镜头2动作指南",
      },
    });
  });
});

describe("workspaceV2ProductionHasEpisodeConfigs", () => {
  it("is true only when episodes array is non-empty", () => {
    expect(workspaceV2ProductionHasEpisodeConfigs({ episodes: [] })).toBe(false);
    expect(workspaceV2ProductionHasEpisodeConfigs({ episodes: null })).toBe(false);
    expect(workspaceV2ProductionHasEpisodeConfigs({})).toBe(false);
    expect(workspaceV2ProductionHasEpisodeConfigs({ episodes: [{ episode: 1 }] })).toBe(true);
  });
});

describe("normalizeWorkspaceV2CostEstimate", () => {
  it("normalizes episode segments estimate/actual breakdowns", () => {
    const result = normalizeWorkspaceV2CostEstimate({
      episodes: [
        {
          episode: 1,
          title: "密信",
          segments: [
            {
              segment_id: "E1S01",
              duration_seconds: 4,
              estimate: { image: { CNY: 0.01 }, video: { USD: 1 }, audio: {} },
              actual: { image: { CNY: 0.01 }, video: { USD: 0.01 }, audio: {} },
            },
          ],
        },
      ],
    });

    expect(result.episodes).toHaveLength(1);
    expect(result.episodes[0]?.segments[0]).toEqual({
      segment_id: "E1S01",
      duration_seconds: 4,
      estimate: { image: { CNY: 0.01 }, video: { USD: 1 }, audio: {} },
      actual: { image: { CNY: 0.01 }, video: { USD: 0.01 }, audio: {} },
    });
  });
});

describe("fetchWorkspaceV2CostEstimate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs cost-estimate by project id", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({
        episodes: [
          {
            episode: 1,
            title: "密信",
            segments: [
              {
                segment_id: "E1S01",
                duration_seconds: 4,
                estimate: { image: { CNY: 0.01 }, video: { USD: 1 } },
                actual: { image: { CNY: 0.01 }, video: { USD: 0.01 } },
              },
            ],
          },
        ],
      }),
    );

    const result = await fetchWorkspaceV2CostEstimate("test-072205-7e4a6dcf");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects/test-072205-7e4a6dcf/cost-estimate"),
      expect.anything(),
    );
    expect(result.episodes[0]?.segments[0]?.segment_id).toBe("E1S01");
  });
});

describe("deleteWorkspaceV2Project", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes project by slug name", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockFetchResponse({ success: true, message: "deleted" }),
    );

    const result = await deleteWorkspaceV2Project("proj-ws2-demo");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/ws2/v1/projects/proj-ws2-demo"),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(result.success).toBe(true);
  });
});
