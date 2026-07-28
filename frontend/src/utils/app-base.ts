/** Vite `base` / 部署子路径（如 `/aigc/`），开发环境为 `/`。 */
export function getAppBase(): string {
  return (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
}

/** 去掉部署子路径前缀，得到 wouter 使用的 router 相对路径。 */
export function toRouterPath(pathname: string): string {
  const base = getAppBase();
  if (base && pathname.startsWith(base)) {
    const rest = pathname.slice(base.length);
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return pathname;
}

export function isAppPath(pathname: string | undefined | null): boolean {
  if (!pathname) return false;
  return toRouterPath(pathname).startsWith("/app/");
}

export const API_BASE = `${getAppBase()}/api/v1`;

/** 工作空间 2.0 独立后端（默认 1242，dev 经 Vite `/api/ws2` 代理）。 */
export const WORKSPACE_V2_API_BASE = `${getAppBase()}/api/ws2/v1`;

/** public/ 目录下的静态资源 URL（自动带上 Vite base，如 /aigc/）。 */
export function publicAssetUrl(path: string): string {
  const normalized = path.replace(/^\//, "");
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${normalized}`;
}

/**
 * 解析后端或静态资源 URL，补上部署子路径（如 /aigc）。
 * 后端常返回 `/api/v1/files/...`，在子路径部署下须变为 `/aigc/api/v1/files/...`。
 */
export function resolveMediaUrl(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const base = getAppBase();

  // MinIO HTTP 直链 → 同源 /media 代理，避免 HTTPS 页面 Mixed Content 拦截
  const minioPath = trimmed.match(
    /^https?:\/\/(?:58\.222\.41\.68|218\.93\.211\.227):9000\/(.+)$/i,
  )?.[1];
  if (minioPath) {
    return `${base}/media/${minioPath}`;
  }

  if (/^(blob:|data:|https?:)/i.test(trimmed)) return trimmed;

  if (base && (trimmed === base || trimmed.startsWith(`${base}/`))) {
    return trimmed;
  }

  if (trimmed.startsWith("/api/")) {
    return `${base}${trimmed}`;
  }

  if (trimmed.startsWith("/")) {
    return publicAssetUrl(trimmed.slice(1));
  }

  return trimmed;
}

/**
 * 工作空间 2.0 媒体 URL。
 * WS2 后端常把 thumbnail 写成 `/api/v1/files/...`，但资产在 ws2 服务（dev: `/api/ws2` → 1242）。
 * 若原样交给 `<img>`，Vite `/api` 会代理到旧工作空间（1240）导致 404。
 */
export function resolveWorkspaceV2MediaUrl(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const base = getAppBase();
  const rewriteV1ToWs2 = (path: string): string => {
    if (path.startsWith("/api/ws2/")) return path;
    if (path.startsWith("/api/v1/")) return `/api/ws2/v1/${path.slice("/api/v1/".length)}`;
    if (base && path.startsWith(`${base}/api/v1/`)) {
      return `${base}/api/ws2/v1/${path.slice(`${base}/api/v1/`.length)}`;
    }
    return path;
  };

  return resolveMediaUrl(rewriteV1ToWs2(trimmed));
}

/**
 * wouter 以 `~` 开头的路径会跳过 nest，但不会自动加 Vite 部署子路径。
 * 子路径部署（如 /aigc/）时必须经此函数生成，否则会跳到站点根导致黑屏。
 */
export function absoluteAppPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `~${getAppBase()}${normalized}`;
}
