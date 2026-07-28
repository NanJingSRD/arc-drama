import { useEffect, useRef, useState } from "react";
import {
  fetchFeaturedVideoTemplates,
  type TemplateType,
  type VideoTemplate,
} from "@/api/video-templates";
import { resolveMediaUrl } from "@/utils/app-base";
import type { FeaturedWork } from "./welcome-data";

function mapToFeaturedWork(template: VideoTemplate): FeaturedWork {
  return {
    id: String(template.id),
    title: template.title,
    author: template.category,
    video: resolveMediaUrl(template.url) ?? template.url,
    featured: template.is_featured === 1 || template.is_featured === true,
  };
}

export interface UseFeaturedWorksOptions {
  keyword?: string;
  type?: TemplateType;
}

export function useFeaturedWorks(options: UseFeaturedWorksOptions = {}) {
  const { keyword = "", type = "video" } = options;
  const [works, setWorks] = useState<FeaturedWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = `${type}|${keyword.trim()}`;
  const filterKeyRef = useRef(filterKey);
  filterKeyRef.current = filterKey;

  useEffect(() => {
    let cancelled = false;
    const requestKey = filterKey;

    void (async () => {
      setLoading(true);
      try {
        const records = await fetchFeaturedVideoTemplates({
          type,
          keyword: keyword.trim() || undefined,
        });
        if (cancelled || filterKeyRef.current !== requestKey) return;

        if (records.length === 0) {
          setWorks([]);
          setError(keyword.trim() ? "未找到匹配的作品" : "暂无作品");
          return;
        }

        setWorks(records.map(mapToFeaturedWork));
        setError(null);
      } catch (err) {
        if (cancelled || filterKeyRef.current !== requestKey) return;
        setWorks([]);
        setError(err instanceof Error ? err.message : "作品加载失败");
      } finally {
        if (!cancelled && filterKeyRef.current === requestKey) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filterKey, type, keyword]);

  return { works, loading, error };
}
