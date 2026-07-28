import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCarouselVideos } from "./resource";

describe("fetchCarouselVideos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns videos from a successful response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        message: "获取成功",
        data: {
          videos: [
            {
              id: "sample_000",
              url: "http://example.com/a.mp4",
              duration: 4,
              ratio: "16:9",
            },
          ],
          total: 1,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const videos = await fetchCarouselVideos(5);

    expect(videos).toHaveLength(1);
    expect(videos[0]?.id).toBe("sample_000");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/resource/carousel?limit=5",
      expect.objectContaining({ headers: { Accept: "application/json" } }),
    );
  });

  it("throws when response code is not 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 500, message: "服务异常", data: {} }),
      }),
    );

    await expect(fetchCarouselVideos()).rejects.toThrow("服务异常");
  });
});
