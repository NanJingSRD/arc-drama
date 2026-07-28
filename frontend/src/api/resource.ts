import { getAppBase } from "@/utils/app-base";

export interface CarouselVideo {
  id: string;
  url: string;
  duration: number;
  ratio: string;
}

interface CarouselResponse {
  code: number;
  message: string;
  data: {
    videos: CarouselVideo[];
    total: number;
  };
}

/** GET /api/resource/carousel — 首页轮播视频资源 */
export async function fetchCarouselVideos(limit = 8): Promise<CarouselVideo[]> {
  const url = `${getAppBase()}/api/resource/carousel?limit=${limit}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`轮播资源加载失败 (${response.status})`);
  }

  const body = (await response.json()) as CarouselResponse;
  if (body.code !== 200 || !Array.isArray(body.data?.videos)) {
    throw new Error(body.message || "轮播资源加载失败");
  }

  return body.data.videos;
}
