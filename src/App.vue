<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, RouterView, useRouter } from "vue-router";
import { useAuthStore } from "./auth";
import WelcomeScreen from "./components/WelcomeScreen.vue";

const auth = useAuthStore();
const router = useRouter();
// After the router's initial navigation, which rewrites the URL with the
// original query; check() then strips auth_error for good.
onMounted(async () => {
  await router.isReady();
  await auth.check();
});
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
        <RouterLink to="/insights">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 7.5a6 6 0 0 1 0 9"/><path d="M12.5 5a9.5 9.5 0 0 1 0 14"/><circle cx="5.5" cy="12" r="1.3"/></svg>
          回望
        </RouterLink>
      </nav>
    </template>
  </div>
</template>
