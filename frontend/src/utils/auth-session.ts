/** 与 api.ts handleUnauthorized 抛出的错误文案保持一致 */
export const AUTH_EXPIRED_MESSAGE = "认证已过期，请重新登录";

let sessionExpired = false;

export function markAuthSessionExpired(): void {
  sessionExpired = true;
}

export function resetAuthSessionExpired(): void {
  sessionExpired = false;
}

export function isAuthSessionExpired(): boolean {
  return sessionExpired;
}

export function isAuthExpiredError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message === AUTH_EXPIRED_MESSAGE ||
    error.message === "登录凭证无效，请重新登录"
  );
}
