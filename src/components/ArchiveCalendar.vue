<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink, useRouter } from "vue-router";
import ArtworkThumb from "./ArtworkThumb.vue";
import {
  buildMonthGrid,
  formatMonthLabel,
  shiftMonth,
  type ArchiveDay,
  type CalendarCell,
} from "../domain";

// `month` comes from the URL and may be missing or out of range.
const props = defineProps<{
  archive: ArchiveDay[];
  month: string;
  today: string;
  from: string;
}>();
const emit = defineEmits<{ "update:month": [month: string] }>();
const router = useRouter();

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// Paging runs from the earliest month with data up to the current month.
const latest = computed(() => props.today.slice(0, 7));
const earliest = computed(() => {
  const oldest = props.archive.at(-1)?.date.slice(0, 7);
  return oldest && oldest < latest.value ? oldest : latest.value;
});
const shown = computed(() => {
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(props.month)
    ? props.month
    : latest.value;
  return month > latest.value
    ? latest.value
    : month < earliest.value
      ? earliest.value
      : month;
});
const cells = computed(() =>
  buildMonthGrid(shown.value, props.archive, props.today),
);

const selected = ref<string | null>(null);
watch(shown, () => (selected.value = null));
const preview = computed(
  () => cells.value.find((cell) => cell.date === selected.value) ?? null,
);

function link(date: string) {
  return { path: `/day/${date}`, query: { from: props.from } };
}
function dayOf(date: string) {
  return Number(date.slice(8));
}
function spoken(date: string) {
  return `${Number(date.slice(5, 7))}月${dayOf(date)}日`;
}
function labelFor(cell: CalendarCell & { date: string }) {
  const parts = [spoken(cell.date)];
  if (cell.isToday) parts.unshift("今天");
  if (cell.state === "artwork")
    parts.push(`作品「${cell.artwork?.title ?? ""}」`);
  if (cell.state === "pending") parts.push("作品待加入圖片");
  if (cell.state === "open")
    parts.push(`${cell.eventCount} 次紀錄，尚未完成意象`);
  return parts.join("，");
}
// Clicking an artwork shows its preview first; a second click opens it.
function chooseArtwork(date: string) {
  if (selected.value === date) void router.push(link(date));
  else selected.value = date;
}
function page(delta: number) {
  emit("update:month", shiftMonth(shown.value, delta));
}
</script>

<template>
  <section class="archive-calendar" aria-label="作品月曆">
    <div class="calendar-head">
      <button
        class="calendar-nav"
        type="button"
        aria-label="上個月"
        :disabled="shown <= earliest"
        @click="page(-1)"
      >
        ‹
      </button>
      <h2 aria-live="polite">{{ formatMonthLabel(shown) }}</h2>
      <button
        class="calendar-nav"
        type="button"
        aria-label="下個月"
        :disabled="shown >= latest"
        @click="page(1)"
      >
        ›
      </button>
    </div>
    <div class="calendar-weekdays" aria-hidden="true">
      <span v-for="weekday in WEEKDAYS" :key="weekday">{{ weekday }}</span>
    </div>
    <div class="calendar-grid">
      <template
        v-for="(cell, index) in cells"
        :key="cell.date ?? `blank-${index}`"
      >
        <span
          v-if="!cell.date"
          class="calendar-cell calendar-cell--blank"
          aria-hidden="true"
        ></span>
        <button
          v-else-if="cell.state === 'artwork'"
          class="calendar-cell calendar-cell--artwork"
          :class="{ 'calendar-cell--today': cell.isToday }"
          type="button"
          :aria-label="labelFor(cell as CalendarCell & { date: string })"
          :aria-pressed="selected === cell.date"
          :aria-current="cell.isToday ? 'date' : undefined"
          @click="chooseArtwork(cell.date)"
        >
          <ArtworkThumb
            :date="cell.date"
            :version="cell.artwork?.updatedAt ?? ''"
            alt=""
          />
          <span class="calendar-day">{{ dayOf(cell.date) }}</span>
        </button>
        <RouterLink
          v-else-if="cell.state !== 'empty' || cell.isToday"
          class="calendar-cell"
          :class="[
            `calendar-cell--${cell.state}`,
            { 'calendar-cell--today': cell.isToday },
          ]"
          :to="link(cell.date)"
          :aria-label="labelFor(cell as CalendarCell & { date: string })"
          :aria-current="cell.isToday ? 'date' : undefined"
        >
          <span class="calendar-day">{{ dayOf(cell.date) }}</span>
          <span
            v-if="cell.state === 'pending'"
            class="calendar-plus"
            aria-hidden="true"
            >＋</span
          >
          <span
            v-if="cell.state === 'open'"
            class="calendar-dots"
            aria-hidden="true"
            ><i v-for="dot in Math.min(cell.eventCount, 3)" :key="dot"></i
          ></span>
        </RouterLink>
        <span v-else class="calendar-cell calendar-cell--empty">
          <span class="calendar-day">{{ dayOf(cell.date) }}</span>
        </span>
      </template>
    </div>
    <div class="calendar-preview-region" aria-live="polite">
      <article
        v-if="preview?.date && preview.artwork"
        class="card calendar-preview"
      >
        <div class="calendar-preview-thumb">
          <ArtworkThumb
            :date="preview.date"
            :version="preview.artwork.updatedAt"
            alt=""
          />
        </div>
        <div>
          <small
            >{{ preview.date.slice(5).replace("-", "/") }} ·
            {{ preview.eventCount }} 次</small
          >
          <h3>{{ preview.artwork.title }}</h3>
          <RouterLink class="calendar-preview-link" :to="link(preview.date)"
            >查看作品 ›</RouterLink
          >
        </div>
      </article>
    </div>
  </section>
</template>
