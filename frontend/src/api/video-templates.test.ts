import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFeaturedVideoTemplates } from "./video-templates";

describe("fetchFeaturedVideoTemplates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns featured templates from a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        message: "获取成功",
        data: [
          {
            id: 1,
            type: "video",
            category: "青春爱情",
            title: "少年纵横宇宙",
            url: "http://example.com/a.mp4",
            prompt: null,
            sort: 0,
            likes: 0,
            copys: 0,
            is_featured: 1,
            created_at: "2026-07-02T15:07:07",
            updated_at: "2026-07-02T08:45:43",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const templates = await fetchFeaturedVideoTemplates({
      type: "video",
      keyword: "宇宙",
    });

    expect(templates).toHaveLength(1);
    expect(templates[0]?.title).toBe("少年纵横宇宙");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/video-templates/featured?type=video&keyword=%E5%AE%87%E5%AE%99",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });
});
