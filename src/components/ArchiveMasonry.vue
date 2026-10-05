<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import ArtworkThumb from "./ArtworkThumb.vue";
import {
  IMAGE_ACCEPT,
  useArtworkImageUpload,
} from "../composables/useArtworkImageUpload";
import {
  displayRatio,
  distributeMasonry,
  formatMonthLabel,
  type ArchiveDay,
  type DailyArtwork,
} from "../domain";

type ArtworkDay = ArchiveDay & { artwork: DailyArtwork };

// `days` are completed artworks only, newest first.
const props = defineProps<{ days: ArtworkDay[]; from: string }>();
const emit = defineEmits<{ updated: [artwork: DailyArtwork] }>();

// Two columns on phones, three from tablet width.
const wide = window.matchMedia("(min-width: 768px)");
const columnCount = ref(wide.matches ? 3 : 2);
const onWidth = () => (columnCount.value = wide.matches ? 3 : 2);
wide.addEventListener("change", onWidth);
onBeforeUnmount(() => wide.removeEventListener("change", onWidth));

// Images that could not be shown fall back to the square pending size.
const failed = reactive(new Set<string>());
function ratioOf(day: ArtworkDay) {
  return failed.has(day.date) ? 1 : displayRatio(day.artwork);
}
// The caption under each image adds roughly a third of the card width.
const CAPTION_RATIO = 0.35;

const months = computed(() => {
  const groups = new Map<string, ArtworkDay[]>();
  for (const day of props.days) {
    const month = day.date.slice(0, 7);
    groups.set(month, [...(groups.get(month) ?? []), day]);
  }
  return [...groups].map(([month, days]) => ({
    month,
    columns: distributeMasonry(
      days,
      columnCount.value,
      (day) => ratioOf(day) + CAPTION_RATIO,
    ),
  }));
});

function shortDate(date: string) {
  return date.slice(5).replace("-", "/");
}

const { saving, error, warning, upload } = useArtworkImageUpload();
const input = ref<HTMLInputElement | null>(null);
const pickingDate = ref("");
function pick(date: string) {
  pickingDate.value = date;
  input.value?.click();
}
async function picked() {
  const file = input.value?.files?.[0];
  if (input.value) input.value.value = "";
  if (!file || !pickingDate.value) return;
  const artwork = await upload(pickingDate.value, file);
  if (artwork) {
    failed.delete(artwork.date);
    emit("updated", artwork);
  }
}
</script>

<template>
  <div class="archive-masonry">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="warning" class="notice" role="status">{{ warning }}</p>
    <input
      ref="input"
      type="file"
      :accept="IMAGE_ACCEPT"
      hidden
      @change="picked"
    />
    <section
      v-for="group in months"
      :key="group.month"
      class="archive-month"
      :aria-label="formatMonthLabel(group.month)"
    >
      <h2 class="archive-month-title">{{ formatMonthLabel(group.month) }}</h2>
      <div
        class="archive-columns"
        :style="{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }"
      >
        <div
          v-for="(column, index) in group.columns"
          :key="index"
          class="archive-column"
        >
          <article
            v-for="day in column"
            :key="day.date"
            class="card archive-card"
          >
            <div
              class="archive-frame"
              :class="{
                'archive-frame--empty':
                  !day.artwork.imagePath || failed.has(day.date),
              }"
              :style="{ aspectRatio: `1 / ${ratioOf(day)}` }"
            >
              <ArtworkThumb
                v-if="day.artwork.imagePath"
                :date="day.date"
                :version="day.artwork.updatedAt"
                alt=""
                @failed="failed.add(day.date)"
              />
              <template v-else>
                <span>尚未加入圖片</span>
                <button
                  class="archive-add"
                  type="button"
                  :disabled="saving"
                  :aria-label="`為 ${shortDate(day.date)} 加入圖片`"
                  @click="pick(day.date)"
                >
                  {{
                    saving && pickingDate === day.date ? "正在保存…" : "＋ 加入"
                  }}
                </button>
              </template>
            </div>
            <div class="archive-meta">
              <small>{{ shortDate(day.date) }} · {{ day.eventCount }} 次</small>
              <h3>
                <RouterLink
                  class="archive-card-link"
                  :to="{ path: `/day/${day.date}`, query: { from } }"
                  >{{ day.artwork.title }}</RouterLink
                >
              </h3>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>
