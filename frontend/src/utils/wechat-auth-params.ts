/** 从 OAuth 回调 URL 参数中读取微信头像地址 */
export function readWeChatAvatarFromParams(
  params: URLSearchParams,
  hashParams: URLSearchParams,
): string | null {
  const keys = ["avatar", "avatar_url", "avatarUrl", "headimgurl", "head_img", "headImgUrl"];
  for (const key of keys) {
    const value = params.get(key) || hashParams.get(key);
    if (value?.trim()) return value.trim();
  }
  return null;
}
