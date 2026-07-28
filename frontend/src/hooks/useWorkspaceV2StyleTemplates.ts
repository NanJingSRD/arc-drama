import { useEffect, useState } from "react";
import {
  fetchWorkspaceV2StyleTemplates,
  type WorkspaceV2StyleTemplatesResult,
} from "@/api/workspace-v2";

interface UseWorkspaceV2StyleTemplatesResult {
  data: WorkspaceV2StyleTemplatesResult | null;
  loading: boolean;
  error: string | null;
}

let cachedData: WorkspaceV2StyleTemplatesResult | null = null;
let inflight: Promise<WorkspaceV2StyleTemplatesResult> | null = null;

function loadWorkspaceV2StyleTemplates(): Promise<WorkspaceV2StyleTemplatesResult> {
  if (cachedData) return Promise.resolve(cachedData);
  if (inflight) return inflight;

  inflight = fetchWorkspaceV2StyleTemplates()
    .then((result) => {
      cachedData = result;
      return result;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** 页面级拉取风格模板，同一会话内复用缓存，避免筛选栏与新建弹框重复请求。 */
export function useWorkspaceV2StyleTemplates(): UseWorkspaceV2StyleTemplatesResult {
  const [data, setData] = useState<WorkspaceV2StyleTemplatesResult | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadWorkspaceV2StyleTemplates()
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
  }, []);

  return { data, loading, error };
}
