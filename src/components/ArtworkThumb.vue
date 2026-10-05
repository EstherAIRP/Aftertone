<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { getArtworkImage } from "../db";

// Shows a stored image filling its container (the parent sets the size).
// `version` changes when the image is replaced, so the Blob is read again.
const props = defineProps<{ date: string; version: string; alt: string }>();
const emit = defineEmits<{ failed: [] }>();
const url = ref("");
const failed = ref(false);
let loads = 0;

function release() {
  if (url.value) URL.revokeObjectURL(url.value);
  url.value = "";
}
function fail() {
  release();
  failed.value = true;
  emit("failed");
}

watch(
  () => [props.date, props.version],
  async () => {
    release();
    failed.value = false;
    const load = ++loads;
    try {
      const image = await getArtworkImage(props.date);
      // A newer load (or unmount) has taken over.
      if (load !== loads) return;
      if (!image) return fail();
      url.value = URL.createObjectURL(image.blob);
    } catch {
      if (load === loads) fail();
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  loads++;
  release();
});
</script>

<template>
  <img v-if="url" class="artwork-thumb" :src="url" :alt="alt" @error="fail" />
  <span v-else-if="failed" class="artwork-thumb artwork-thumb--failed"
    >圖片無法顯示</span
  >
  <span
    v-else
    class="artwork-thumb artwork-thumb--loading"
    aria-hidden="true"
  ></span>
</template>
