<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import ArchiveCalendar from "../components/ArchiveCalendar.vue";
import ArchiveMasonry from "../components/ArchiveMasonry.vue";
import { getArchive } from "../db";
import { localDateKey, type ArchiveDay, type DailyArtwork } from "../domain";

const route = useRoute();
const router = useRouter();
const archive = ref<ArchiveDay[]>([]);
const error = ref("");
const loading = ref(true);
const today = localDateKey(new Date());

onMounted(async () => {
  try {
    archive.value = await getArchive();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "無法讀取收藏。";
  } finally {
    loading.value = false;
  }
});

// The layout lives in the URL (`/gallery`, `/gallery?view=calendar&month=…`)
// so returning from a detail page restores it.
const view = computed(() =>
  route.query.view === "calendar" ? "calendar" : "gallery",
);
const month = computed(() =>
  typeof route.query.month === "string" ? route.query.month : "",
);
const from = computed(() =>
  view.value === "calendar"
    ? new URLSearchParams({
        view: "calendar",
        ...(month.value ? { month: month.value } : {}),
      }).toString()
    : "",
);
function show(next: "gallery" | "calendar") {
  void router.replace({
    query:
      next === "calendar"
        ? { view: "calendar", ...(month.value ? { month: month.value } : {}) }
        : {},
  });
}
function changeMonth(next: string) {
  void router.replace({ query: { view: "calendar", month: next } });
}

const artworkDays = computed(() =>
  archive.value.flatMap((day) =>
    day.artwork ? [{ ...day, artwork: day.artwork }] : [],
  ),
);
function replaceArtwork(artwork: DailyArtwork) {
  archive.value = archive.value.map((day) =>
    day.date === artwork.date ? { ...day, artwork } : day,
  );
}
</script>

<template>
  <main class="page">
    <p class="eyebrow">YOUR ARCHIVE</p>
    <h1>你的意象收藏</h1>
    <p class="muted">留在這裡的每一天，都有自己的形狀。</p>
    <div class="archive-switch" role="group" aria-label="收藏版面">
      <button
        type="button"
        :aria-pressed="view === 'gallery'"
        @click="show('gallery')"
      >
        畫廊
      </button>
      <button
        type="button"
        :aria-pressed="view === 'calendar'"
        @click="show('calendar')"
      >
        月曆
      </button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">正在讀取…</p>
    <template v-else-if="!error">
      <ArchiveCalendar
        v-if="view === 'calendar'"
        :archive="archive"
        :month="month"
        :today="today"
        :from="from"
        @update:month="changeMonth"
      />
      <ArchiveMasonry
        v-else-if="artworkDays.length"
        :days="artworkDays"
        :from="from"
        @updated="replaceArtwork"
      />
      <div v-else class="card empty-gallery">
        <div class="empty-symbol" aria-hidden="true">＋</div>
        <h2>收藏還是空的</h2>
        <p class="muted">
          日期結束後，可以整理 Prompt，將那一天的意象留在這裡。
        </p>
        <RouterLink class="button secondary" to="/">回到首頁</RouterLink>
      </div>
    </template>
  </main>
</template>
