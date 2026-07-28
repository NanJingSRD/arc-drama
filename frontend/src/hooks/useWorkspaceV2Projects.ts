import { useCallback, useEffect, useState } from "react";
import { fetchWorkspaceV2Projects } from "@/api/workspace-v2";
import type { WorkspaceV2Filters } from "@/components/workspace-v2";
import type { WorkspaceV2ListResult } from "@/types/workspace-v2";

interface UseWorkspaceV2ProjectsResult {
  data: WorkspaceV2ListResult | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWorkspaceV2Projects(
  filters: WorkspaceV2Filters,
): UseWorkspaceV2ProjectsResult {
  const [data, setData] = useState<WorkspaceV2ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchWorkspaceV2Projects({
      keyword: filters.keyword,
      progress: filters.progress,
      style: filters.style,
    })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.keyword, filters.progress, filters.style, reloadToken]);

  return { data, loading, error, refetch };
}
