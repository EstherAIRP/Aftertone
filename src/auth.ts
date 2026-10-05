import { defineStore } from "pinia";

const TRUSTED_DEVICE_KEY = "aftertone:previous-login";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    ready: false,
    authenticated: false,
    offline: false,
    preview: false,
    loginAvailable: false,
    login: "",
    error: "",
  }),
  actions: {
    async check() {
      const authError = new URLSearchParams(window.location.search).get(
        "auth_error",
      );
      this.error = authError
        ? ((
            {
              setup: "登入尚未設定完成。",
              state: "登入驗證已失效，請重試。",
              account: "此 GitHub 帳號沒有使用權限。",
              github: "GitHub 登入失敗，請重試。",
            } as Record<string, string>
          )[authError] ?? "登入失敗，請重試。")
        : "";
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Session endpoint unavailable");
        const data = (await response.json()) as {
          authenticated: boolean;
          login?: string;
          loginAvailable?: boolean;
        };
        this.loginAvailable = data.loginAvailable === true;
        this.authenticated = data.authenticated;
        this.login = data.login ?? "";
        this.offline = false;
        if (this.authenticated) localStorage.setItem(TRUSTED_DEVICE_KEY, "yes");
      } catch {
        this.loginAvailable = false;
        this.offline =
          !navigator.onLine &&
          localStorage.getItem(TRUSTED_DEVICE_KEY) === "yes";
        this.authenticated = this.offline;
        if (!this.offline)
          this.error = import.meta.env.DEV
            ? "GitHub 登入服務尚未啟動，可先使用本機預覽。"
            : "目前無法驗證登入。請確認網路或稍後重試。";
      } finally {
        this.ready = true;
      }
    },
    startPreview() {
      if (!import.meta.env.DEV) return;
      this.preview = true;
      this.authenticated = true;
      this.error = "";
    },
    async logout() {
      if (this.preview) {
        this.preview = false;
        this.authenticated = false;
        return;
      }
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
