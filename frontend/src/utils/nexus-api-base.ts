import { getAppBase } from "@/utils/app-base";

const env = import.meta.env as Record<string, string | undefined>;

/** AI Token Nexus 平台 API 根路径（微信登录等） */
export const NEXUS_API_BASE =
  (env.VITE_NEXUS_API_BASE || `${getAppBase()}/nexus/api`).replace(/\/$/, "");
