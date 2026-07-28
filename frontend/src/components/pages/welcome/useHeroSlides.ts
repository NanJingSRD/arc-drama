import { useEffect, useState } from "react";
import { fetchCarouselVideos } from "@/api/resource";
import { resolveMediaUrl } from "@/utils/app-base";
import { HERO_SLIDE_COPY, type HeroSlide } from "./welcome-data";

export function useHeroSlides(limit = 8) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const videos = await fetchCarouselVideos(limit);
        if (cancelled) return;

        setSlides(
          videos.map((video, index) => {
            const copy = HERO_SLIDE_COPY[index % HERO_SLIDE_COPY.length];
            return {
              id: video.id,
              title: copy.title,
              subtitle: copy.subtitle,
              tagline: copy.tagline,
              video: resolveMediaUrl(video.url) ?? video.url,
            };
          }),
        );
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "轮播资源加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return { slides, loading, error };
}
