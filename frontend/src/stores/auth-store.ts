import { create } from "zustand";
import { verifyArcReelAccessToken, fetchAuthStatus } from "@/api/arcreel-auth";
import {
  clearAuthUserProfile,
  clearExplicitLogout,
  clearToken,
  getAuthUserProfile,
  getToken,
  hasExplicitLogout,
  markExplicitLogout,
  normalizeAccessToken,
  setAuthUserProfile,
  setToken as saveToken,
  TOKEN_KEY,
} from "@/utils/auth";
import { resetAuthSessionExpired } from "@/utils/auth-session";
import { WORKSPACE_REQUIRES_WECHAT_AUTH } from "@/utils/workspace-auth";

interface AuthState {
  token: string | null;
  username: string | null;
  avatarUrl: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  wechatLoginOpen: boolean;
  wechatReturnTo: string | null;
  initialize: () => void;
  login: (token: string, username: string, avatarUrl?: string | null) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  openWeChatLogin: (returnTo?: string) => void;
  closeWeChatLogin: () => void;
  openWorkspaceLogin: (returnTo?: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  avatarUrl: null,
  isAuthenticated: false,
  isLoading: true,
  wechatLoginOpen: false,
  wechatReturnTo: null,

  initialize: () => {
    const rawToken = localStorage.getItem(TOKEN_KEY);
    const token = rawToken ? normalizeAccessToken(rawToken) : null;
    if (rawToken && !token) {
      clearToken();
      clearAuthUserProfile();
      set({
        token: null,
        username: null,
        avatarUrl: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }
    if (token) {
      clearExplicitLogout();
      const profile = getAuthUserProfile();
      void verifyArcReelAccessToken(token)
        .then((valid) => {
          if (!valid) {
            clearToken();
            clearAuthUserProfile();
            set({
              token: null,
              username: null,
              avatarUrl: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }
          set({
            token,
            username: profile?.username ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
            isAuthenticated: true,
            isLoading: false,
          });
        })
        .catch(() => {
          set({
            token,
            username: profile?.username ?? null,
            avatarUrl: profile?.avatarUrl ?? null,
            isAuthenticated: true,
            isLoading: false,
          });
        });
      return;
    }
    // 测试环境须手动 token 登录；用户主动退出后也不应再走后端「免登录」分支
    if (!WORKSPACE_REQUIRES_WECHAT_AUTH || hasExplicitLogout()) {
      set({ isLoading: false });
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    fetchAuthStatus(controller.signal)
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        const payload: unknown = await res.json();
        if (
          typeof payload !== "object" ||
          payload === null ||
          typeof (payload as { enabled?: unknown }).enabled !== "boolean"
        ) {
          throw new Error("invalid /auth/status payload");
        }
        const { enabled } = payload as { enabled: boolean };
        if (!enabled) {
          set({ isAuthenticated: true });
        }
      })
      .catch((err) => {
        console.warn("[auth] /auth/status fetch failed; defaulting to login", err);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        set({ isLoading: false });
      });
  },

  login: (token, username, avatarUrl = null) => {
    const normalized = normalizeAccessToken(token);
    if (!normalized) {
      console.warn("[auth] login rejected: invalid access token");
      return;
    }
    resetAuthSessionExpired();
    saveToken(normalized);
    clearExplicitLogout();
    setAuthUserProfile({ username, avatarUrl: avatarUrl ?? null });
    set({
      token: normalized,
      username,
      avatarUrl: avatarUrl ?? null,
      isAuthenticated: true,
      isLoading: false,
      wechatLoginOpen: false,
      wechatReturnTo: null,
    });
  },

  logout: () => {
    clearToken();
    clearAuthUserProfile();
    markExplicitLogout();
    set({
      token: null,
      username: null,
      avatarUrl: null,
      isAuthenticated: false,
      wechatLoginOpen: false,
      wechatReturnTo: null,
    });
  },

  setLoading: (isLoading) => set({ isLoading }),

  openWeChatLogin: (returnTo) =>
    set({
      wechatLoginOpen: true,
      wechatReturnTo: returnTo ?? null,
    }),

  closeWeChatLogin: () =>
    set({
      wechatLoginOpen: false,
      wechatReturnTo: null,
    }),

  openWorkspaceLogin: (returnTo) => {
    useAuthStore.getState().openWeChatLogin(returnTo);
  },
}));
