<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { getArtworkImage, removeArtworkImage } from "../db";
import {
  IMAGE_ACCEPT,
  useArtworkImageUpload,
} from "../composables/useArtworkImageUpload";
import type { DailyArtwork } from "../domain";

// Rendered only once the artwork has an image; before that, DayView shows
// ArtworkNextSteps under the Prompt instead.
const props = defineProps<{ artwork: DailyArtwork; initialWarning?: string }>();
const emit = defineEmits<{ updated: [artwork: DailyArtwork] }>();

const SYNC_LABELS = { local: "僅存在此裝置", synced: "已同步" } as const;

// The object URL of the stored original, released whenever it changes.
const url = ref("");
const failed = ref(false);
let loads = 0;
function release() {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = "";
}
watch(
  () => [props.artwork.date, props.artwork.imagePath, props.artwork.updatedAt],
  async () => {
    const load = ++loads;
    release();
    failed.value = false;
    if (!props.artwork.imagePath) return;
    try {
      const image = await getArtworkImage(props.artwork.date);
      if (load !== loads) return;
      if (image) url.value = URL.createObjectURL(image.blob);
      else failed.value = true;
    } catch {
      if (load === loads) failed.value = true;
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  loads++;
  release();
});

const { saving, error, warning, upload } = useArtworkImageUpload();
// Carries an oversize warning from the upload that brought this panel in.
warning.value = props.initialWarning ?? "";
const root = ref<HTMLElement | null>(null);
defineExpose({ focus: () => root.value?.focus({ preventScroll: true }) });
const input = ref<HTMLInputElement | null>(null);
function pick() {
  menuOpen.value = false;
  input.value?.click();
}
async function picked() {
  const file = input.value?.files?.[0];
  if (input.value) input.value.value = "";
  if (!file) return;
  const artwork = await upload(props.artwork.date, file, true);
  if (artwork) emit("updated", artwork);
}

// "⋯" options, closed by Escape, an outside click, or choosing an item.
const menuOpen = ref(false);
const menu = ref<HTMLElement | null>(null);
const toggle = ref<HTMLButtonElement | null>(null);
function closeOnOutside(event: PointerEvent) {
  if (menuOpen.value && !menu.value?.contains(event.target as Node))
    menuOpen.value = false;
}
function closeMenu() {
  menuOpen.value = false;
  toggle.value?.focus();
}
onMounted(() => document.addEventListener("pointerdown", closeOnOutside));
onBeforeUnmount(() =>
  document.removeEventListener("pointerdown", closeOnOutside),
);

const confirm = ref<HTMLDialogElement | null>(null);
const removing = ref(false);
function askRemove() {
  menuOpen.value = false;
  confirm.value?.showModal();
}
async function remove() {
  if (removing.value) return;
  removing.value = true;
  error.value = "";
  warning.value = "";
  try {
    emit("updated", await removeArtworkImage(props.artwork.date));
    confirm.value?.close();
  } catch {
    confirm.value?.close();
    error.value = "刪除失敗，圖片仍保留。";
  } finally {
    removing.value = false;
  }
}
</script>

<template>
  <section
    ref="root"
    class="card artwork-panel"
    aria-label="作品圖片"
    tabindex="-1"
  >
    <div class="artwork-panel-image">
      <img
        v-if="url && !failed"
        :src="url"
        :alt="`${artwork.title}的作品圖片`"
        @error="failed = true"
      />
      <p v-if="failed" class="artwork-panel-failed">
        圖片無法顯示。可以重新上傳，或從右上角選單刪除這張圖片。
      </p>
      <div ref="menu" class="artwork-menu" @keydown.esc="closeMenu">
        <button
          ref="toggle"
          class="artwork-menu-toggle"
          type="button"
          aria-label="圖片選項"
          :aria-expanded="menuOpen"
          aria-controls="artwork-menu-items"
          :disabled="saving || removing"
          @click="menuOpen = !menuOpen"
        >
          ⋯
        </button>
        <div
          v-if="menuOpen"
          id="artwork-menu-items"
          class="artwork-menu-items"
        >
          <a
            v-if="url && !failed"
            :href="url"
            target="_blank"
            rel="noopener"
            @click="menuOpen = false"
            >查看原圖</a
          >
          <button type="button" @click="askRemove">刪除圖片</button>
        </div>
      </div>
    </div>
    <div class="artwork-panel-footer">
      <p class="sync-label">
        {{ SYNC_LABELS[artwork.imageSync ?? "local"] }}
      </p>
      <button
        class="button secondary"
        type="button"
        :disabled="saving || removing"
        @click="pick"
      >
        重新上傳
      </button>
    </div>
    <p v-if="saving" class="muted" role="status">正在保存…</p>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="warning" class="notice" role="status">{{ warning }}</p>
    <input
      ref="input"
      type="file"
      :accept="IMAGE_ACCEPT"
      hidden
      @change="picked"
    />
    <dialog
      ref="confirm"
      class="card confirm-dialog"
      aria-labelledby="remove-image-title"
    >
      <h2 id="remove-image-title">刪除圖片？</h2>
      <p>只刪除這張圖片，作品、Prompt 和原始紀錄都會保留。</p>
      <div class="actions">
        <button
          class="button secondary"
          type="button"
          :disabled="removing"
          @click="confirm?.close()"
        >
          取消
        </button>
        <button
          class="button primary"
          type="button"
          :disabled="removing"
          @click="remove"
        >
          {{ removing ? "正在刪除…" : "刪除圖片" }}
        </button>
      </div>
    </dialog>
  </section>
</template>
