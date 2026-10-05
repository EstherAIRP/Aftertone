import { describe, expect, it } from "vitest";
import { consumeAuthError } from "./auth";

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
