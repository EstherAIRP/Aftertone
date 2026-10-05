<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import InsightsHeatmap from "../components/InsightsHeatmap.vue";
import IntensityTrend from "../components/IntensityTrend.vue";
import StatusWords from "../components/StatusWords.vue";
import VoiceHalos from "../components/VoiceHalos.vue";
import { getInsightsData } from "../db";
import { localDateKey, type DailyArtwork, type TinnitusEvent } from "../domain";
import {
  INSIGHT_RANGES,
  describeTiming,
  parseInsightRange,
  summarizeRange,
  type InsightRange,
} from "../insights";

const route = useRoute();
const router = useRouter();
const events = ref<TinnitusEvent[]>([]);
const artworks = ref<DailyArtwork[]>([]);
const error = ref("");
const loading = ref(true);
const today = ref(localDateKey(new Date()));

function refreshToday() {
  today.value = localDateKey(new Date());
}

function refreshTodayWhenVisible() {
  if (document.visibilityState === "visible") refreshToday();
}

onMounted(async () => {
  refreshToday();
  document.addEventListener("visibilitychange", refreshTodayWhenVisible);
  window.addEventListener("pageshow", refreshToday);
  try {
    ({ events: events.value, artworks: artworks.value } =
      await getInsightsData());
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "無法讀取紀錄。";
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", refreshTodayWhenVisible);
  window.removeEventListener("pageshow", refreshToday);
});

// The range lives in the URL (`/insights`, `/insights?range=7`).
const range = computed(() => parseInsightRange(route.query.range));
function show(next: InsightRange) {
  void router.replace({ query: next === 30 ? {} : { range: String(next) } });
}
const summary = computed(() =>
  summarizeRange(events.value, artworks.value, range.value, today.value),
);
const enough = computed(() => summary.value.eventCount >= 3);
const timing = computed(() => describeTiming(summary.value.heatmap));
</script>

<template>
  <main class="page insights-page">
    <p class="eyebrow">LOOKING BACK</p>
    <h1>回望</h1>
    <div
      class="archive-switch insights-range"
      role="group"
      aria-label="回望期間"
    >
      <button
        v-for="days in INSIGHT_RANGES"
        :key="days"
        type="button"
        :aria-pressed="range === days"
        @click="show(days)"
      >
        {{ days }} 天
      </button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">正在讀取…</p>
    <template v-else-if="!error">
      <p class="insights-overview">
        這 {{ range }} 天裡<br />
        有 <strong>{{ summary.activeDays }}</strong> 天留下了殘響<br />
        共 <strong>{{ summary.eventCount }}</strong> 段<template
          v-if="summary.artworkCount"
          >，化成 <strong>{{ summary.artworkCount }}</strong> 幅意象</template
        >
        <small v-if="enough && summary.averageIntensity !== null">
          平均強度約 {{ summary.averageIntensity }}
        </small>
      </p>

      <p v-if="!enough" class="insights-note">資料還不多，先安心記錄就好。</p>
      <template v-else>
        <section class="insights-section">
          <p class="insights-section-en">when it lingers</p>
          <h2>什麼時候出現</h2>
          <InsightsHeatmap :heatmap="summary.heatmap" />
          <p class="insights-note">{{ timing }}</p>
        </section>

        <section class="insights-section">
          <p class="insights-section-en">its weight</p>
          <h2>強度的樣子</h2>
          <IntensityTrend
            :points="summary.intensity"
            :start="summary.start"
            :end="summary.end"
          />
        </section>

        <section class="insights-section">
          <p class="insights-section-en">its voice</p>
          <h2>聲音與耳側</h2>
          <VoiceHalos
            :sounds="summary.sounds"
            :ears="summary.ears"
            :total="summary.eventCount"
          />
        </section>

        <section v-if="summary.statuses.length" class="insights-section">
          <p class="insights-section-en">what was near</p>
          <h2>常一起被記下的</h2>
          <StatusWords
            :statuses="summary.statuses"
            :total="summary.eventCount"
          />
        </section>

        <div class="insights-works">
          <RouterLink to="/gallery">
            <strong>{{ summary.artworkCount }}</strong
            >已完成的意象 ›
          </RouterLink>
          <RouterLink to="/gallery?view=calendar">
            <strong>{{ summary.pendingImageCount }}</strong
            >等待一張圖 ›
          </RouterLink>
        </div>
      </template>
    </template>
    <p class="insights-disclaimer">
      Aftertone 為個人紀錄與創作工具<br />不提供醫療診斷或治療建議
    </p>
  </main>
</template>
