import { createPinia, setActivePinia } from "pinia";
import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeAuthError, useAuthStore } from "./auth";

describe("consumeAuthError", () => {
  it("leaves the URL alone when there is no auth_error", () => {
    expect(consumeAuthError("https://a.example/gallery?x=1")).toEqual({
      message: "",
      cleanUrl: null,
    });
  });

  it("maps a known code and strips it from the URL", () => {
    expect(consumeAuthError("https://a.example/?auth_error=account")).toEqual({
      message: "此 GitHub 帳號沒有使用權限。",
      cleanUrl: "/",
    });
  });

  it("keeps the path, other query params and hash", () => {
    expect(
      consumeAuthError("https://a.example/gallery?a=1&auth_error=state#top"),
    ).toEqual({
      message: "登入驗證已失效，請重試。",
      cleanUrl: "/gallery?a=1#top",
    });
  });

  it("falls back for unknown codes", () => {
    expect(consumeAuthError("https://a.example/?auth_error=weird").message).toBe(
      "登入失敗，請重試。",
    );
  });
});

describe("dev login skip", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("signs in locally and logs out without calling the API", async () => {
    setActivePinia(createPinia());
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const auth = useAuthStore();
    auth.error = "目前無法驗證登入。請確認網路或稍後重試。";

    expect(auth.skipLoginForDev).toBeTypeOf("function");
    auth.skipLoginForDev!();
    expect(auth.authenticated).toBe(true);
    expect(auth.devSkipped).toBe(true);
    expect(auth.error).toBe("");

    await auth.logout();
    expect(auth.authenticated).toBe(false);
    expect(auth.devSkipped).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
