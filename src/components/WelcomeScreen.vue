<script setup lang="ts">
import { useAuthStore } from "../auth";

const auth = useAuthStore();
// Compile-time constant: false in production, so the skip button is dropped.
// The `!!` makes Vue bind it as a plain const (not unref()), which lets the
// bundler fold the v-if and strip the button from production builds.
const devSkip = !!import.meta.env.DEV;
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
      <button v-if="devSkip" class="welcome-dev-skip" type="button" @click="auth.skipLoginForDev?.()">跳過登入（開發）</button>
    </div>
  </main>
</template>
