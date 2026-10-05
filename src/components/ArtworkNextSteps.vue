<script setup lang="ts">
import { ref } from "vue";
import {
  IMAGE_ACCEPT,
  useArtworkImageUpload,
} from "../composables/useArtworkImageUpload";
import type { DailyArtwork } from "../domain";

// Shown under the Prompt once a day is completed but has no image yet:
// copy the Prompt → generate elsewhere → add the image here.
const props = defineProps<{
  artwork: DailyArtwork;
  copied: "zh" | "en" | "";
}>();
const emit = defineEmits<{
  copy: [lang: "zh" | "en"];
  updated: [artwork: DailyArtwork, warning: string];
}>();

const root = ref<HTMLElement | null>(null);
const heading = ref<HTMLElement | null>(null);
defineExpose({ root, heading });

const { saving, error, warning, upload } = useArtworkImageUpload();
const input = ref<HTMLInputElement | null>(null);
async function picked() {
  const file = input.value?.files?.[0];
  if (input.value) input.value.value = "";
  if (!file) return;
  const artwork = await upload(props.artwork.date, file);
  if (artwork) emit("updated", artwork, warning.value);
}
</script>

<template>
  <section ref="root" class="next-steps" aria-labelledby="next-steps-title">
    <h3 id="next-steps-title" ref="heading" tabindex="-1">下一步</h3>
    <p class="muted">作品已加入收藏。照著三個步驟，為它加上一張圖片。</p>
    <ol class="next-steps-list">
      <li>
        <strong>複製 Prompt</strong>
        <div class="next-steps-actions">
          <button
            class="button secondary"
            type="button"
            @click="emit('copy', 'zh')"
          >
            {{ copied === "zh" ? "已複製" : "複製中文" }}
          </button>
          <button
            class="button secondary"
            type="button"
            @click="emit('copy', 'en')"
          >
            {{ copied === "en" ? "已複製" : "Copy English" }}
          </button>
        </div>
        <span class="visually-hidden" role="status">{{
          copied === "zh"
            ? "已複製中文 Prompt"
            : copied === "en"
              ? "已複製英文 Prompt"
              : ""
        }}</span>
      </li>
      <li>
        <strong>到你常用的生圖工具生成</strong>
        <p class="muted">把 Prompt 貼到任何生圖工具，挑一張最接近這一天的圖。</p>
      </li>
      <li>
        <strong>加入圖片</strong>
        <div class="next-steps-actions">
          <button
            class="button primary"
            type="button"
            :disabled="saving"
            @click="input?.click()"
          >
            {{ saving ? "正在保存…" : "選擇圖片" }}
          </button>
        </div>
        <p class="footnote">
          接受 JPG／PNG／WebP，保留原檔不壓縮。超過 4 MB
          也能存在此裝置，但之後無法自動同步。
        </p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </li>
    </ol>
    <input
      ref="input"
      type="file"
      :accept="IMAGE_ACCEPT"
      hidden
      @change="picked"
    />
  </section>
</template>
