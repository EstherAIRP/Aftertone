<script setup lang="ts">
import { computed } from "vue";
import {
  EAR_LABELS,
  SOUND_LABELS,
  type EarSide,
  type SoundType,
} from "../domain";
import type { Counted } from "../insights";

const props = defineProps<{
  sounds: Counted<SoundType>[];
  ears: Record<EarSide, number>;
  total: number;
}>();

// Halo centres (% of the field), biggest first; up to all six sound types.
const SLOTS = [
  [36, 44],
  [68, 32],
  [84, 70],
  [14, 68],
  [54, 80],
  [30, 88],
];
// Each sound borrows one of the seven imagery category tints.
const TINTS: Record<SoundType, string> = {
  high_pitch: "var(--category-background)",
  low_pitch: "var(--category-person)",
  hum: "var(--category-atmosphere)",
  sharp: "var(--category-clothing)",
  pulsing: "var(--category-pose)",
  other: "var(--category-color)",
};
const most = computed(() => Math.max(1, ...props.sounds.map((s) => s.count)));
const halos = computed(() =>
  props.sounds.map((sound, index) => {
    const size = 44 + Math.round((sound.count / most.value) * 56);
    const [x, y] = SLOTS[index];
    return {
      ...sound,
      style: {
        "--tint": TINTS[sound.key],
        width: `${size}px`,
        height: `${size}px`,
        left: `calc(${x}% - ${size / 2}px)`,
        top: `calc(${y}% - ${size / 2}px)`,
      },
    };
  }),
);
const percent = (count: number) =>
  props.total ? Math.round((count / props.total) * 100) : 0;
// 1–3 lit arcs per side, by how often that ear was involved (incl. both).
function litArcs(side: "left" | "right") {
  if (!props.total) return 0;
  return 1 + Math.round(((props.ears[side] + props.ears.both) / props.total) * 2);
}
const arcs = [0, 1, 2];
const soundLabel = computed(() =>
  props.sounds.map((s) => `${SOUND_LABELS[s.key]} ${s.count} 段`).join("、"),
);
</script>

<template>
  <div class="voice-halos" role="img" :aria-label="`聲音類型：${soundLabel}`">
    <div
      v-for="halo in halos"
      :key="halo.key"
      class="voice-halo"
      :style="halo.style"
      aria-hidden="true"
    >
      {{ SOUND_LABELS[halo.key] }}<span>{{ halo.count }}</span>
    </div>
  </div>
  <div class="voice-divider" aria-hidden="true"></div>
  <div class="ear-ripples">
    <svg
      v-for="side in ['left', 'right'] as const"
      :key="side"
      :class="['ear-ripple', `ear-ripple--${side}`]"
      viewBox="0 0 70 70"
      aria-hidden="true"
    >
      <path
        v-for="i in arcs"
        :key="i"
        :d="`M${20 + i * 14} ${12 - i * 2} Q${36 + i * 18} 35 ${20 + i * 14} ${58 + i * 2}`"
        :opacity="i < litArcs(side) ? 0.85 - i * 0.2 : 0.15"
      />
      <circle cx="12" cy="35" r="5" />
    </svg>
    <p class="ear-shares">
      <span>左 {{ percent(ears.left) }}%</span>
      <span>{{ EAR_LABELS.both }} {{ percent(ears.both) }}%</span>
      <span>右 {{ percent(ears.right) }}%</span>
    </p>
  </div>
</template>
