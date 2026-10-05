<script setup lang="ts">
import { computed } from "vue";
import { TIME_SLOTS, TIME_SLOT_LABELS, WEEKDAY_LABELS } from "../insights";

const props = defineProps<{ heatmap: number[][] }>();
const most = computed(() => Math.max(1, ...props.heatmap.flat()));
// Soft dot: an empty cell keeps a tiny pale dot so the grid stays readable.
function dotStyle(count: number) {
  if (!count) return { width: "4px", height: "4px" };
  const size = 10 + Math.round((count / most.value) * 20);
  return {
    width: `${size}px`,
    height: `${size}px`,
    opacity: String(0.45 + (count / most.value) * 0.55),
  };
}
</script>

<template>
  <div class="insights-heatmap" role="table" aria-label="星期與時段的紀錄次數">
    <div class="insights-heatmap-row" role="row">
      <span role="columnheader"></span>
      <span v-for="slot in TIME_SLOTS" :key="slot" role="columnheader">
        {{ TIME_SLOT_LABELS[slot] }}
      </span>
    </div>
    <div
      v-for="(row, day) in heatmap"
      :key="day"
      class="insights-heatmap-row"
      role="row"
    >
      <span role="rowheader">{{ WEEKDAY_LABELS[day] }}</span>
      <span
        v-for="(count, slot) in row"
        :key="slot"
        class="insights-heatmap-cell"
        role="cell"
        :aria-label="`週${WEEKDAY_LABELS[day]}${TIME_SLOT_LABELS[TIME_SLOTS[slot]]}，${count} 段`"
      >
        <span
          class="insights-dot"
          :class="{ 'insights-dot--empty': !count }"
          :style="dotStyle(count)"
          aria-hidden="true"
        ></span>
      </span>
    </div>
  </div>
</template>
