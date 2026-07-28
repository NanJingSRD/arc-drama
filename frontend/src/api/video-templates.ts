import { getAppBase } from "@/utils/app-base";

export type TemplateType = "video" | "image";

export interface VideoTemplate {
  id: number;
  type: TemplateType;
  category: string;
  title: string;
  url: string;
  prompt: string | null;
  sort: number;
  likes: number;
  copys: number;
  is_featured?: number | boolean;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface ListData {
  total: number;
  pages: number;
  current: number;
  size: number;
  records: VideoTemplate[];
}

export interface ListTemplatesParams {
  pageNum?: number;
  pageSize?: number;
  type?: TemplateType;
  category?: string;
  title?: string;
}

export interface FeaturedTemplatesParams {
  type?: TemplateType;
  keyword?: string;
}

const BASE = `${getAppBase()}/api/video-templates`;

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`请求失败 (${response.status})`);
  }
  const body = (await response.json()) as ApiResponse<T> & { detail?: unknown };
  if (body.code !== 200) {
    throw new Error(body.message || "请求失败");
  }
  return body.data;
}

/** GET /api/video-templates — 分页查询模板列表 */
export async function fetchVideoTemplates(
  params: ListTemplatesParams = {},
): Promise<ListData> {
  const search = new URLSearchParams();
  if (params.pageNum != null) search.set("pageNum", String(params.pageNum));
  if (params.pageSize != null) search.set("pageSize", String(params.pageSize));
  if (params.type) search.set("type", params.type);
  if (params.category) search.set("category", params.category);
  if (params.title) search.set("title", params.title);

  const qs = search.toString();
  const url = qs ? `${BASE}?${qs}` : BASE;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  return parseJson<ListData>(response);
}

/** GET /api/video-templates/featured — 精选视频模板列表 */
export async function fetchFeaturedVideoTemplates(
  params: FeaturedTemplatesParams = {},
): Promise<VideoTemplate[]> {
  const search = new URLSearchParams();
  if (params.type) search.set("type", params.type);
  if (params.keyword) search.set("keyword", params.keyword);

  const qs = search.toString();
  const url = qs ? `${BASE}/featured?${qs}` : `${BASE}/featured`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  return parseJson<VideoTemplate[]>(response);
}

/** GET /api/video-templates/{id} — 获取单个模板详情 */
export async function fetchVideoTemplate(templateId: number): Promise<VideoTemplate> {
  const response = await fetch(`${BASE}/${templateId}`, {
    headers: { Accept: "application/json" },
  });
  return parseJson<VideoTemplate>(response);
}

/** GET /api/video-templates/categories — 获取分类列表（后端路由异常时由调用方降级） */
export async function fetchTemplateCategories(type: TemplateType): Promise<string[]> {
  const url = `${BASE}/categories?type=${encodeURIComponent(type)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`分类加载失败 (${response.status})`);
  }
  const body = (await response.json()) as ApiResponse<string[] | { categories?: string[] }>;
  if (body.code !== 200) {
    throw new Error(body.message || "分类加载失败");
  }
  if (Array.isArray(body.data)) return body.data;
  if (body.data && Array.isArray(body.data.categories)) return body.data.categories;
  return [];
}

async function postTemplateAction(templateId: number, action: "like" | "copy"): Promise<void> {
  const response = await fetch(`${BASE}/${templateId}/${action}`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  await parseJson<unknown>(response);
}

/** POST /api/video-templates/{id}/like — 点赞后拉取最新详情 */
export async function likeVideoTemplate(templateId: number): Promise<VideoTemplate> {
  await postTemplateAction(templateId, "like");
  return fetchVideoTemplate(templateId);
}

/** POST /api/video-templates/{id}/copy — 复制计数后拉取最新详情 */
export async function copyVideoTemplate(templateId: number): Promise<VideoTemplate> {
  await postTemplateAction(templateId, "copy");
  return fetchVideoTemplate(templateId);
}
