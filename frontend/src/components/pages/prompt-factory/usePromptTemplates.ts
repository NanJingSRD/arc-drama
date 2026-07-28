import { useCallback, useEffect, useRef, useState } from "react";
import {
  copyVideoTemplate,
  fetchTemplateCategories,
  fetchVideoTemplates,
  likeVideoTemplate,
  type TemplateType,
  type VideoTemplate,
} from "@/api/video-templates";

/** 大屏（≥1536px） */
export const PROMPT_TEMPLATE_PAGE_SIZE_VIDEO_LG = 20;
export const PROMPT_TEMPLATE_PAGE_SIZE_IMAGE_LG = 14;

/** 笔记本及以下（<1536px） */
export const PROMPT_TEMPLATE_PAGE_SIZE_VIDEO_SM = 16;
export const PROMPT_TEMPLATE_PAGE_SIZE_IMAGE_SM = 10;

const PROMPT_COMPACT_VIEWPORT_MQ = "(max-width: 1535px)";

function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(PROMPT_COMPACT_VIEWPORT_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(PROMPT_COMPACT_VIEWPORT_MQ);
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return compact;
}

export function getPromptTemplatePageSize(
  type: TemplateType,
  compactViewport = false,
): number {
  if (type === "image") {
    return compactViewport
      ? PROMPT_TEMPLATE_PAGE_SIZE_IMAGE_SM
      : PROMPT_TEMPLATE_PAGE_SIZE_IMAGE_LG;
  }
  return compactViewport
    ? PROMPT_TEMPLATE_PAGE_SIZE_VIDEO_SM
    : PROMPT_TEMPLATE_PAGE_SIZE_VIDEO_LG;
}

/** @deprecated 使用 getPromptTemplatePageSize */
export const PROMPT_TEMPLATE_PAGE_SIZE = PROMPT_TEMPLATE_PAGE_SIZE_VIDEO_LG;
export const PROMPT_TEMPLATE_PAGE_SIZE_VIDEO = PROMPT_TEMPLATE_PAGE_SIZE_VIDEO_LG;
export const PROMPT_TEMPLATE_PAGE_SIZE_IMAGE = PROMPT_TEMPLATE_PAGE_SIZE_IMAGE_LG;

function extractCategories(records: VideoTemplate[]): string[] {
  const set = new Set<string>();
  for (const item of records) {
    if (item.category) set.add(item.category);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

export function usePromptTemplates() {
  const [templateType, setTemplateType] = useState<TemplateType>("video");
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [categories, setCategories] = useState<string[]>([]);
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = `${templateType}|${category ?? ""}|${debouncedSearch}`;
  const activeRequestRef = useRef("");
  const compactViewport = useCompactViewport();
  const pageSize = getPromptTemplatePageSize(templateType, compactViewport);

  const getRequestKey = (pageNum: number) => `${filterKey}|${pageNum}|${pageSize}`;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCategory(null);
    setCategories([]);
    setPage(1);
  }, [templateType]);

  useEffect(() => {
    setPage(1);
  }, [category, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const cats = await fetchTemplateCategories(templateType);
        if (!cancelled && cats.length > 0) setCategories(cats);
      } catch {
        // categories 接口不可用时，由下方列表首屏响应补充分类
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [templateType]);

  useEffect(() => {
    let cancelled = false;
    const requestKey = getRequestKey(page);
    activeRequestRef.current = requestKey;

    void (async () => {
      setLoading(true);

      try {
        const data = await fetchVideoTemplates({
          pageNum: page,
          pageSize,
          type: templateType,
          category: category ?? undefined,
          title: debouncedSearch || undefined,
        });

        if (cancelled || activeRequestRef.current !== requestKey) return;

        setTotal(data.total);
        setTotalPages(
          data.pages > 0
            ? data.pages
            : Math.max(1, Math.ceil(data.total / pageSize)),
        );
        setTemplates(data.records);
        setError(null);

        if (
          page === 1 &&
          !category &&
          !debouncedSearch &&
          data.records.length > 0
        ) {
          setCategories((prev) => {
            if (prev.length > 0) return prev;
            return extractCategories(data.records);
          });
        }
      } catch (err) {
        if (cancelled || activeRequestRef.current !== requestKey) return;
        setTemplates([]);
        setTotal(0);
        setTotalPages(1);
        setError(err instanceof Error ? err.message : "模板加载失败");
      } finally {
        if (cancelled || activeRequestRef.current !== requestKey) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [templateType, category, debouncedSearch, page, pageSize]);

  const patchTemplate = (fresh: VideoTemplate) => {
    setTemplates((prev) =>
      prev.map((item) => (item.id === fresh.id ? fresh : item)),
    );
  };

  const handleLike = async (templateId: number) => {
    const fresh = await likeVideoTemplate(templateId);
    patchTemplate(fresh);
    return fresh;
  };

  const handleCopy = async (template: VideoTemplate) => {
    const prompt = template.prompt?.trim() ?? "";
    if (prompt) {
      await navigator.clipboard.writeText(prompt);
    }
    const fresh = await copyVideoTemplate(template.id);
    patchTemplate(fresh);
    return fresh;
  };

  const goToPage = useCallback(
    (nextPage: number) => {
      setPage((current) => {
        const clamped = Math.min(Math.max(1, nextPage), totalPages);
        return clamped === current ? current : clamped;
      });
    },
    [totalPages],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    templateType,
    setTemplateType,
    category,
    setCategory,
    search,
    setSearch,
    debouncedSearch,
    categories,
    templates,
    loading,
    error,
    page,
    total,
    totalPages,
    pageSize,
    setPage: goToPage,
    handleLike,
    handleCopy,
  };
}
