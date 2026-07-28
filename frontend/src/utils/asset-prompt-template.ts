/** 资产 prompt_template 字段的读写格式化（详情展示 / 编辑回传）。 */

export const KNOWN_PROMPT_TEMPLATE_KEYS = ["layout", "guard", "negative_tail"] as const;

export type KnownPromptTemplateKey = (typeof KNOWN_PROMPT_TEMPLATE_KEYS)[number];

export type AssetPromptTemplate = Record<string, string>;

/** 展示用标签：API key → 本地化文案 */
export type PromptTemplateLabelMap = Partial<Record<string, string>>;

/** 从 i18n 构建展示标签（layout / guard / negative_tail） */
export function buildPromptTemplateLabels(
  t: (key: string) => string,
): PromptTemplateLabelMap {
  return {
    layout: t("ws2_asset_prompt_template_layout"),
    guard: t("ws2_asset_prompt_template_guard"),
    negative_tail: t("ws2_asset_prompt_template_negative_tail"),
  };
}

function asStringRecord(
  value: Record<string, unknown> | null | undefined,
): AssetPromptTemplate | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: AssetPromptTemplate = {};
  for (const [key, raw] of Object.entries(value)) {
    if (raw == null) continue;
    const text = String(raw).trim();
    if (!text) continue;
    out[key] = text;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function resolveSectionKey(
  labelOrKey: string,
  labels?: PromptTemplateLabelMap,
): string {
  if (!labels) return labelOrKey;
  for (const [apiKey, label] of Object.entries(labels)) {
    if (label === labelOrKey || apiKey === labelOrKey) return apiKey;
  }
  return labelOrKey;
}

/** 将接口返回的 prompt_template 规范为 string map */
export function normalizeAssetPromptTemplate(
  value: unknown,
): AssetPromptTemplate | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return asStringRecord(value as Record<string, unknown>);
}

/** 展示 / 编辑用文本（按已知字段顺序输出；可传入本地化标签） */
export function formatAssetPromptTemplate(
  template: AssetPromptTemplate | null | undefined,
  labels?: PromptTemplateLabelMap,
): string {
  if (!template) return "";
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const key of KNOWN_PROMPT_TEMPLATE_KEYS) {
    const text = template[key]?.trim();
    if (!text) continue;
    const label = labels?.[key] ?? key;
    lines.push(`【${label}】\n${text}`);
    seen.add(key);
  }
  for (const [key, text] of Object.entries(template)) {
    if (seen.has(key) || !text.trim()) continue;
    const label = labels?.[key] ?? key;
    lines.push(`【${label}】\n${text.trim()}`);
  }
  return lines.join("\n\n");
}

/** 将编辑文本解析回 prompt_template 对象，供 PATCH 提交 */
export function parseAssetPromptTemplate(
  text: string,
  labels?: PromptTemplateLabelMap,
): AssetPromptTemplate | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return asStringRecord(parsed as Record<string, unknown>);
      }
    } catch {
      // fall through to section / free-text parsing
    }
  }

  const sections = trimmed.split(/\n(?=【[^】]+】)/);
  const out: AssetPromptTemplate = {};
  let matched = false;
  for (const section of sections) {
    const match = section.match(/^【([^】]+)】\s*\n?([\s\S]*)$/);
    if (!match) continue;
    matched = true;
    const labelOrKey = match[1]?.trim();
    const value = match[2]?.trim() ?? "";
    if (!labelOrKey || !value) continue;
    out[resolveSectionKey(labelOrKey, labels)] = value;
  }
  if (matched) return Object.keys(out).length > 0 ? out : undefined;

  return { layout: trimmed };
}
