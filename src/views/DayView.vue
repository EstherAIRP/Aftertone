<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import ArtworkImagePanel from "../components/ArtworkImagePanel.vue";
import ArtworkNextSteps from "../components/ArtworkNextSteps.vue";
import { getDay, completeDay } from "../db";
import {
  CATEGORY_LABELS,
  CORE_CATEGORIES,
  composePrompt,
  formatDateLabel,
  localDateKey,
  type DailyArtwork,
  type PromptFragment,
  type TinnitusEvent,
} from "../domain";

const props = defineProps<{ date: string }>();
const route = useRoute();
// Set when arriving from the archive: the gallery query to return to.
const archiveBack = computed(() =>
  typeof route.query.from === "string"
    ? {
        path: "/gallery",
        query: Object.fromEntries(new URLSearchParams(route.query.from)),
      }
    : null,
);
const events = ref<TinnitusEvent[]>([]);
const fragments = ref<PromptFragment[]>([]);
const artwork = ref<DailyArtwork | null>(null);
const title = ref("今日殘響");
const promptZh = ref("");
const promptEn = ref("");
const error = ref("");
const loading = ref(true);
const saving = ref(false);
const isPast = computed(() => props.date < localDateKey(new Date()));
// Completed but no image yet: the next-steps block takes the complete
// button's place, and its copy buttons replace the prompt-grid ones.
const needsImage = computed(() => !!artwork.value && !artwork.value.imagePath);
const filled = computed(
  () => new Set(fragments.value.map((fragment) => fragment.category)),
);
watch(
  () => props.date,
  async (date) => {
    loading.value = true;
    error.value = "";
    try {
      const day = await getDay(date);
      events.value = day.events;
      fragments.value = day.fragments;
      artwork.value = day.artwork;
      const draft = composePrompt(day.fragments);
      promptZh.value = day.artwork?.finalZh ?? draft.zh;
      promptEn.value = day.artwork?.finalEn ?? draft.en;
      title.value = day.artwork?.title ?? "今日殘響";
    } catch (cause) {
      error.value =
        cause instanceof Error ? cause.message : "無法讀取日期資料。";
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

// Which Prompt was just copied, for the brief 「已複製」 feedback.
const copied = ref<"zh" | "en" | "">("");
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(copiedTimer));
async function copy(lang: "zh" | "en") {
  try {
    await navigator.clipboard.writeText(
      lang === "zh" ? promptZh.value : promptEn.value,
    );
    copied.value = lang;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => (copied.value = ""), 2000);
  } catch {
    error.value = "複製失敗，請手動選取文字。";
  }
}

const nextSteps = ref<InstanceType<typeof ArtworkNextSteps> | null>(null);
const imagePanel = ref<InstanceType<typeof ArtworkImagePanel> | null>(null);
// An oversize warning from the next-steps upload, shown by the image panel.
const imageWarning = ref("");
function scrollBehavior(): ScrollBehavior {
  return matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}
function updateArtwork(next: DailyArtwork) {
  artwork.value = next;
  if (!next.imagePath) imageWarning.value = "";
}
async function imageAdded(next: DailyArtwork, warning: string) {
  imageWarning.value = warning;
  artwork.value = next;
  await nextTick();
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
  imagePanel.value?.focus();
}
async function complete() {
  if (saving.value) return;
  saving.value = true;
  error.value = "";
  try {
    const draft = composePrompt(fragments.value);
    artwork.value = await completeDay(
      props.date,
      title.value,
      draft.zh,
      draft.en,
      promptZh.value,
      promptEn.value,
    );
    await nextTick();
    nextSteps.value?.heading?.focus({ preventScroll: true });
    nextSteps.value?.root?.scrollIntoView({
      behavior: scrollBehavior(),
      block: "start",
    });
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "完成意象失敗。";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="page">
    <RouterLink v-if="archiveBack" class="back-link" :to="archiveBack"
      >‹ 收藏</RouterLink
    >
    <ArtworkImagePanel
      v-if="!loading && artwork?.imagePath"
      ref="imagePanel"
      :artwork="artwork"
      :initial-warning="imageWarning"
      @updated="updateArtwork"
    />
    <p class="eyebrow">{{ formatDateLabel(date) }} · DAILY IMAGE</p>
    <h1>{{ artwork ? artwork.title : "這一天的意象" }}</h1>
    <p v-if="loading" role="status">正在讀取…</p>
    <p v-else-if="error" class="error" role="alert">{{ error }}</p>
    <template v-if="!loading">
      <p class="muted">
        {{ events.length }} 筆耳鳴紀錄 ·
        {{
          artwork
            ? "意象已完成"
            : isPast
              ? "可以整理這一天的 Prompt"
              : "今天可以預覽，明天起可以完成"
        }}
      </p>
      <div class="two-column day-grid">
        <section class="card info-card">
          <h2>意象片段</h2>
          <p v-if="!fragments.length" class="muted">這一天還沒有片段。</p>
          <div
            v-for="fragment in fragments"
            :key="fragment.id"
            class="fragment-item"
          >
            <span class="tag">{{ CATEGORY_LABELS[fragment.category] }}</span>
            <p>{{ fragment.zh }}</p>
            <small>{{ fragment.en }}</small>
          </div>
        </section>
        <section class="card info-card">
          <h2>七個基礎類別</h2>
          <div class="category-list">
            <div v-for="category in CORE_CATEGORIES" :key="category">
              <span>{{ CATEGORY_LABELS[category] }}</span
              ><span>{{ filled.has(category) ? "已有片段" : "尚未出現" }}</span>
            </div>
          </div>
          <p class="hint">
            每次新增紀錄會取得一段描述。無須為了補齊類別而增加紀錄。
          </p>
        </section>
      </div>
      <section v-if="events.length" class="card prompt-section">
        <p class="eyebrow">YOUR PROMPT</p>
        <h2>完整 Prompt</h2>
        <p class="muted">
          片段會組成草稿。過去日期可修改中英文版本，再複製到你選擇的圖像工具。
        </p>
        <label v-if="isPast && !artwork" class="field title-field"
          ><span>作品標題</span><input v-model="title" maxlength="60"
        /></label>
        <div class="prompt-grid">
          <div>
            <label class="field"
              ><span>繁體中文</span
              ><textarea
                v-model="promptZh"
                rows="9"
                :readonly="!isPast || !!artwork"
              ></textarea></label
            ><button
              v-if="!needsImage"
              class="button secondary"
              type="button"
              @click="copy('zh')"
            >
              {{ copied === "zh" ? "已複製" : "複製中文" }}
            </button>
          </div>
          <div>
            <label class="field"
              ><span>English</span
              ><textarea
                v-model="promptEn"
                rows="9"
                :readonly="!isPast || !!artwork"
              ></textarea></label
            ><button
              v-if="!needsImage"
              class="button secondary"
              type="button"
              @click="copy('en')"
            >
              {{ copied === "en" ? "已複製" : "Copy English" }}
            </button>
          </div>
        </div>
        <button
          v-if="isPast && !artwork"
          class="button primary complete-button"
          type="button"
          :disabled="saving"
          @click="complete"
        >
          {{ saving ? "正在保存…" : "完成這一天的意象" }}
        </button>
        <ArtworkNextSteps
          v-if="artwork && needsImage"
          ref="nextSteps"
          :artwork="artwork"
          :copied="copied"
          @copy="copy"
          @updated="imageAdded"
        />
      </section>
      <section v-if="events.length" class="section-block">
        <h2>原始紀錄</h2>
        <div class="event-list">
          <article
            v-for="event in events"
            :key="event.id"
            class="card event-card"
          >
            <strong>{{
              new Date(event.occurredAt).toLocaleTimeString("zh-TW", {
                hour: "2-digit",
                minute: "2-digit",
              })
            }}</strong
            ><span>強度 {{ event.intensity }}／5</span>
            <p v-if="event.note">{{ event.note }}</p>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>
