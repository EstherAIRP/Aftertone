<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";
import { useAuthStore } from "./auth";

const auth = useAuthStore();
const isDev = import.meta.env.DEV;
onMounted(() => auth.check());
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/" aria-label="Aftertone 首頁">
        <span class="brand-name">Aftertone</span>
        <small>殘響日誌</small>
      </RouterLink>
      <button
        v-if="auth.authenticated"
        class="text-button"
        type="button"
        @click="auth.logout()"
      >
        {{ auth.preview ? "離開預覽" : "登出" }}
      </button>
    </header>

    <main v-if="!auth.ready" class="center-panel" aria-live="polite">
      正在確認登入…
    </main>
    <main v-else-if="!auth.authenticated" class="center-panel">
      <div class="login-orbit" aria-hidden="true"><span>＋</span></div>
      <p class="eyebrow">PRIVATE JOURNAL</p>
      <h1>把今天的殘響，<br />輕輕留在這裡。</h1>
      <p class="muted">
        這是一份只屬於你的耳鳴與意象日誌。
      </p>
      <p v-if="auth.error" class="error" role="alert">{{ auth.error }}</p>
      <a v-if="auth.loginAvailable" class="button primary" href="/api/auth/login">使用 GitHub 登入</a>
      <button v-if="isDev" class="button primary" type="button" @click="auth.startPreview()">進入本機預覽</button>
      <p v-if="isDev" class="footnote">本機預覽會將測試紀錄保存在這台裝置；GitHub 登入與跨裝置同步尚未設定。</p>
      <p class="footnote">
        Aftertone 是個人紀錄與創作工具，不提供醫療診斷或治療建議。
      </p>
    </main>
    <template v-else>
      <div v-if="auth.preview" class="status-banner" role="status">本機預覽模式 · 測試資料只保存在這台裝置</div>
      <div v-else-if="auth.offline" class="status-banner" role="status">
        目前離線，紀錄會先保存在這台裝置。
      </div>
      <RouterView />
      <nav class="bottom-nav" aria-label="主要導覽">
        <RouterLink to="/">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 10.5 12 4l7.5 6.5V20H4.5v-9.5Z"/><path d="M9.5 20v-6h5v6"/></svg>
          首頁
        </RouterLink>
        <RouterLink to="/record">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v16M4 12h16"/></svg>
          記錄
        </RouterLink>
        <RouterLink to="/gallery">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m6.5 17 4.7-5 3 2.5 3.3-4 2.5 3"/><circle cx="8.5" cy="8.5" r="1"/></svg>
          收藏
        </RouterLink>
      </nav>
    </template>
  </div>
</template>
