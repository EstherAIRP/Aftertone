# Welcome Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the entry page with a full-screen welcome screen (window light + ripple + per-character title + "用 GitHub 登入") and remove the local preview mode and all test copy.

**Architecture:** App.vue still switches on auth state (no new route). A new `WelcomeScreen.vue` renders alone when signed out; header and bottom nav only render when signed in. `auth.ts` loses preview mode and gains a pure, tested `consumeAuthError(href)` that also strips `auth_error` from the URL.

**Tech Stack:** Vue 3 `<script setup>`, Pinia, Vitest, plain CSS in `src/style.css`.

Spec: `docs/superpowers/specs/2026-10-05-welcome-screen-design.md`. Visual reference: `docs/ui-concepts/welcome-demo.html`, variant E2.

## Global Constraints

- Outside `:root`, `font-family` / `font-weight` / `font-size` / `letter-spacing` / `line-height` must use the typography tokens in `src/style.css` (em-relative sizes allowed).
- All styles live in `src/style.css`; components have no `<style>` blocks.
- Animations must use `animation-fill-mode: both` with the hidden state only inside `from` keyframes, so the global `prefers-reduced-motion` rule (`animation: none !important`) leaves everything visible in its final state.
- Timeline (E2): ripple settles at 0.5s over 1s; brand chars start 800ms, subtitle 1300ms, slogan lines 1500ms / 1800ms, 90ms per char; login button and error fade in at 2.5s.
- Copy is exact: 「Aftertone」「殘響日誌」「把今天的殘響，」「輕輕留在這裡。」「用 GitHub 登入」「登出」.

---

### Task 1: auth store — remove preview, clean auth_error from the URL

**Files:**
- Create: `src/auth.test.ts`
- Modify: `src/auth.ts` (full rewrite below)

**Interfaces:**
- Produces: `export function consumeAuthError(href: string): { message: string; cleanUrl: string | null }`. The store state becomes `{ ready, authenticated, offline, login, error }`, and the actions are `check()` and `logout()`. `preview`, `startPreview` and `loginAvailable` no longer exist.

- [ ] **Step 1: Write the failing test** — `src/auth.test.ts`

```ts
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/auth.test.ts`
Expected: FAIL, because `consumeAuthError` is not exported.

- [ ] **Step 3: Rewrite `src/auth.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/auth.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Do not commit yet**

App.vue still references `auth.preview`, `startPreview` and `loginAvailable` until Task 2, so the build is broken until then. Leave these changes uncommitted and commit them together with Task 2, so that every commit builds.

---

### Task 2: WelcomeScreen, App shell, styles, README

**Files:**
- Create: `src/components/WelcomeScreen.vue`
- Modify: `src/App.vue` (full rewrite below)
- Modify: `src/style.css`: delete the `.center-panel` rules (around lines 307-322) and the `.login-orbit` rules (around lines 2092-2109), then add the welcome block where `.login-orbit` was.
- Modify: `README.md`: delete the paragraph starting 「若只想試操作流程」 (line 21) and its following blank line.

**Interfaces:**
- Consumes: `useAuthStore()` with `ready`, `authenticated`, `offline`, `error`, `logout()` (from Task 1).

- [ ] **Step 1: Create `src/components/WelcomeScreen.vue`**

```vue
<script setup lang="ts">
import { useAuthStore } from "../auth";

const auth = useAuthStore();
const chars = (text: string) => [...text];
</script>

<template>
  <main class="welcome">
    <div class="welcome-light" aria-hidden="true"></div>
    <div class="welcome-content">
      <div class="welcome-ripple" aria-hidden="true">
        <span v-for="n in 4" :key="n" class="welcome-ring"></span>
        <span class="welcome-core"></span>
      </div>
      <h1 class="welcome-brand">
        <span class="visually-hidden">Aftertone 殘響日誌</span>
        <span class="welcome-brand-name" aria-hidden="true" style="--base: 800ms">
          <span v-for="(ch, i) in chars('Aftertone')" :key="i" class="welcome-char" :style="{ '--i': i }">{{ ch }}</span>
        </span>
        <span class="welcome-brand-sub" aria-hidden="true" style="--base: 1300ms">
          <span v-for="(ch, i) in chars('殘響日誌')" :key="i" class="welcome-char" :style="{ '--i': i }">{{ ch }}</span>
        </span>
      </h1>
      <p class="welcome-slogan">
        <span class="visually-hidden">把今天的殘響，輕輕留在這裡。</span>
        <span aria-hidden="true" style="--base: 1500ms">
          <span v-for="(ch, i) in chars('把今天的殘響，')" :key="i" class="welcome-char" :style="{ '--i': i }">{{ ch }}</span>
        </span>
        <br aria-hidden="true" />
        <span aria-hidden="true" style="--base: 1800ms">
          <span v-for="(ch, i) in chars('輕輕留在這裡。')" :key="i" class="welcome-char" :style="{ '--i': i }">{{ ch }}</span>
        </span>
      </p>
      <a class="button primary welcome-login" href="/api/auth/login">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.88.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>
        用 GitHub 登入
      </a>
      <p v-if="auth.error" class="welcome-error" role="alert">{{ auth.error }}</p>
    </div>
  </main>
</template>
```

- [ ] **Step 2: Rewrite `src/App.vue`**

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { useAuthStore } from "./auth";
import WelcomeScreen from "./components/WelcomeScreen.vue";

const auth = useAuthStore();
onMounted(() => auth.check());
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--bare': !auth.authenticated }">
    <main v-if="!auth.ready" class="welcome-pending" aria-busy="true"></main>
    <WelcomeScreen v-else-if="!auth.authenticated" />
    <template v-else>
      <header class="site-header">
        <RouterLink class="brand" to="/" aria-label="Aftertone 首頁">
          <span class="brand-name">Aftertone</span>
          <small>殘響日誌</small>
        </RouterLink>
        <button class="text-button" type="button" @click="auth.logout()">登出</button>
      </header>
      <div v-if="auth.offline" class="status-banner" role="status">
        目前離線，紀錄會先保存在這台裝置。
      </div>
      <RouterView />
      <!-- keep the existing <nav class="bottom-nav"> … </nav> block exactly as it is today -->
    </template>
  </div>
</template>
```

Copy the existing `<nav class="bottom-nav" aria-label="主要導覽">…</nav>` block (four RouterLinks with their SVGs) from the current `src/App.vue` unchanged into the marked spot. Do not leave the comment in.

- [ ] **Step 3: Edit `src/style.css`**

Delete these four rules completely: `.center-panel`, `.center-panel h1`, `.center-panel .button` and `.center-panel .footnote`. Then delete `.login-orbit` and `.login-orbit span`, and put this block in their place:

```css
/* Welcome (entry): window light breathes; ripple settles, title rises
   char by char, login last. Hidden states live only in `from` keyframes
   so reduced motion (animation: none) shows the finished screen. */
.app-shell--bare {
  padding-bottom: 0;
}
.app-shell--bare::before {
  display: none;
}
.welcome-pending {
  min-height: 100dvh;
}
.welcome {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 48px 24px calc(56px + env(safe-area-inset-bottom));
  text-align: center;
}
.welcome-light {
  position: absolute;
  inset: -6%;
  background: url("/images/window-light.webp") center 40% / cover no-repeat;
  opacity: 0.55;
  animation: welcome-light 9s ease-in-out infinite;
  pointer-events: none;
}
.welcome::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(245, 248, 252, 0.15),
    rgba(245, 248, 252, 0.7) 70%
  );
  pointer-events: none;
}
.welcome-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.welcome-ripple {
  position: relative;
  width: 200px;
  height: 200px;
  margin-bottom: 36px;
  display: grid;
  place-items: center;
  animation: welcome-settle 1s ease-out 0.5s both;
}
.welcome-ring {
  position: absolute;
  inset: 0;
  border: 1px solid rgba(113, 145, 183, 0.55);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    transparent 60%,
    rgba(147, 177, 211, 0.12)
  );
  opacity: 0.35;
  transform: scale(0.3);
  animation: welcome-ripple 4.8s cubic-bezier(0.2, 0.6, 0.3, 1) infinite both;
}
.welcome-ring:nth-child(2) {
  transform: scale(0.55);
  animation-delay: 1.2s;
}
.welcome-ring:nth-child(3) {
  transform: scale(0.8);
  animation-delay: 2.4s;
}
.welcome-ring:nth-child(4) {
  transform: scale(1.05);
  animation-delay: 3.6s;
}
.welcome-core {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(circle, #fff 0 30%, var(--outline) 100%);
  box-shadow: 0 0 18px 6px rgba(143, 168, 200, 0.35);
  animation: welcome-core 4.8s ease-in-out infinite;
}
.welcome-brand {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #5d708b;
  font-weight: var(--weight-regular);
}
.welcome-brand-name {
  padding-left: 0.18em;
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  line-height: var(--leading-none);
  letter-spacing: var(--tracking-wide);
}
.welcome-brand-sub {
  margin-top: 6px;
  padding-left: 0.48em;
  font-family: var(--font-serif);
  font-size: var(--text-xs);
  line-height: var(--leading-body);
  letter-spacing: var(--tracking-wider);
}
.welcome-slogan {
  margin: 22px 0 0;
  color: var(--text);
  font-family: var(--font-serif);
  font-size: var(--text-md);
  font-weight: var(--weight-regular);
  line-height: var(--leading-loose);
  letter-spacing: var(--tracking-heading);
}
.welcome-char {
  display: inline-block;
  animation: welcome-char 0.9s ease-out both;
  animation-delay: calc(var(--i) * 90ms + var(--base, 0ms));
}
.welcome-login {
  margin-top: 40px;
  animation: welcome-fade 0.9s ease-out 2.5s both;
}
.welcome-login svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
.welcome-error {
  max-width: 320px;
  margin: 18px 0 0;
  color: #842e36;
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  animation: welcome-fade 0.9s ease-out 2.5s both;
}
@keyframes welcome-light {
  0%,
  100% {
    opacity: 0.4;
    transform: none;
  }
  50% {
    opacity: 0.75;
    transform: scale(1.04) translateX(-1.5%);
  }
}
@keyframes welcome-settle {
  from {
    transform: translateY(40px);
  }
}
@keyframes welcome-ripple {
  0% {
    opacity: 0;
    transform: scale(0.08);
  }
  15% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: scale(1.25);
  }
}
@keyframes welcome-core {
  50% {
    transform: scale(1.3);
  }
}
@keyframes welcome-char {
  from {
    opacity: 0;
    transform: translateY(10px);
    filter: blur(4px);
  }
}
@keyframes welcome-fade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

Before deleting, run `git grep -n "center-panel\|login-orbit" -- src` and confirm that the only hits are these CSS rules and the old App.vue markup.

- [ ] **Step 4: Edit README.md**

Delete the paragraph beginning 「若只想試操作流程，單獨執行 `npm run dev`」 and the blank line after it.

- [ ] **Step 5: Run tests and the build**

Run: `npm test`, then `npm run build`.
Expected: all tests pass. The build (vue-tsc + vite) succeeds, with no references to `preview`, `startPreview` or `loginAvailable` left in `src/`. Check with `git grep -n "startPreview\|loginAvailable\|auth.preview" -- src`, which should print nothing.

- [ ] **Step 6: Browser verification** (preview_start `aftertone-dev`, viewport 375×812)

Without `vercel dev`, `/api/auth/session` fails, so the welcome screen shows the error line. Check:
1. There is no `.site-header` and no `.bottom-nav` in the DOM. `document.documentElement.scrollWidth === 375`.
2. At about 3s, `.welcome-login` has computed opacity 1, and its text is 「用 GitHub 登入」 with `href` `/api/auth/login`.
3. `.welcome-error` shows 「目前無法驗證登入。請確認網路或稍後重試。」
4. Navigate to `/?auth_error=account`. The error shows 「此 GitHub 帳號沒有使用權限。」, then the session failure overrides it. After load, `location.search` is `""`. (Expected: the session failure message replaces it when the API is down. The key check is that the URL is clean.)
5. Emulate reduced motion (`matchMedia`, or check the CSS by reasoning): all chars and the button are visible, because `animation: none` removes the `from` state.
6. Take a screenshot.

- [ ] **Step 7: Commit**

```bash
git add src/auth.ts src/auth.test.ts src/components/WelcomeScreen.vue src/App.vue src/style.css README.md
git commit -m "feat: full-screen welcome screen with GitHub login only

Drops local preview mode and test copy; auth_error is cleared from the URL."
```
