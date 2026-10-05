import { defineStore } from "pinia";

const TRUSTED_DEVICE_KEY = "aftertone:previous-login";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  setup: "登入尚未設定完成。",
  state: "登入驗證已失效，請重試。",
  account: "此 GitHub 帳號沒有使用權限。",
  github: "GitHub 登入失敗，請重試。",
};

/** Reads the OAuth callback's auth_error and returns the URL without it. */
export function consumeAuthError(href: string): {
  message: string;
  cleanUrl: string | null;
} {
  const url = new URL(href);
  const code = url.searchParams.get("auth_error");
  if (code === null) return { message: "", cleanUrl: null };
  url.searchParams.delete("auth_error");
  return {
    message: AUTH_ERROR_MESSAGES[code] ?? "登入失敗，請重試。",
    cleanUrl: url.pathname + url.search + url.hash,
  };
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    ready: false,
    authenticated: false,
    offline: false,
    login: "",
    error: "",
  }),
  actions: {
    async check() {
      const { message, cleanUrl } = consumeAuthError(window.location.href);
      this.error = message;
      if (cleanUrl !== null) history.replaceState(history.state, "", cleanUrl);
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Session endpoint unavailable");
        const data = (await response.json()) as {
          authenticated: boolean;
          login?: string;
        };
        this.authenticated = data.authenticated;
        this.login = data.login ?? "";
        this.offline = false;
        if (this.authenticated) localStorage.setItem(TRUSTED_DEVICE_KEY, "yes");
      } catch {
        this.offline =
          !navigator.onLine &&
          localStorage.getItem(TRUSTED_DEVICE_KEY) === "yes";
        this.authenticated = this.offline;
        if (!this.offline)
          this.error = "目前無法驗證登入。請確認網路或稍後重試。";
      } finally {
        this.ready = true;
      }
    },
    async logout() {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        });
      } finally {
        localStorage.removeItem(TRUSTED_DEVICE_KEY);
        this.authenticated = false;
        this.offline = false;
        this.login = "";
      }
    },
  },
});
