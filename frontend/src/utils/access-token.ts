/** HTTP Header 仅允许 ISO-8859-1（ByteString），JWT 应为 ASCII。 */
export function isHttpHeaderSafe(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0xff) return false;
  }
  return true;
}

/** 规范化 access token；含中文等非法字符时返回 null。 */
export function normalizeAccessToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed || !isHttpHeaderSafe(trimmed)) return null;
  return trimmed;
}
