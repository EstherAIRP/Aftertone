<script setup lang="ts">
import { computed, useId } from "vue";
import { formatDateLabel } from "../domain";
import {
  plotIntensity,
  smoothPath,
  splitSegments,
  type IntensityPoint,
} from "../insights";

const props = defineProps<{
  points: (IntensityPoint | null)[];
  start: string;
  end: string;
}>();
const WIDTH = 330;
const HEIGHT = 110;
const PAD = 10;
const id = useId();
const detailsId = `${id}-details`;
const segments = computed(() =>
  splitSegments(plotIntensity(props.points, WIDTH, HEIGHT, PAD)),
);
const label = computed(() => {
  const values = props.points.flatMap((p) => (p ? [p.average] : []));
  return values.length
    ? `強度起伏，介於 ${Math.min(...values)} 到 ${Math.max(...values)} 之間（1–5）`
    : "這段期間沒有強度紀錄";
});
const shortDate = (key: string) => formatDateLabel(key).slice(5);
const pointDescriptions = computed(() =>
  props.points.flatMap((point) => {
    if (!point) return [];
    const dates =
      point.start === point.end
        ? shortDate(point.start)
        : `${shortDate(point.start)}–${shortDate(point.end)}`;
    return [
      `${dates}：平均 ${point.average}（最低 ${point.min}、最高 ${point.max}）`,
    ];
  }),
);
</script>

<template>
  <figure class="insights-trend">
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      role="img"
      :aria-label="label"
      :aria-describedby="detailsId"
    >
      <defs>
        <linearGradient :id="`${id}-area`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b9c9f0" stop-opacity="0.55" />
          <stop offset="1" stop-color="#e4eefa" stop-opacity="0" />
        </linearGradient>
        <linearGradient :id="`${id}-line`" x1="0" x2="1">
          <stop offset="0" stop-color="#6d86a8" />
          <stop offset="0.5" stop-color="#8a72b5" />
          <stop offset="1" stop-color="#4f8f9c" />
        </linearGradient>
      </defs>
      <g v-for="(segment, index) in segments" :key="index">
        <path
          v-if="segment.length > 1"
          :d="`${smoothPath(segment)} L${segment[segment.length - 1].x} ${HEIGHT - 2} L${segment[0].x} ${HEIGHT - 2} Z`"
          :fill="`url(#${id}-area)`"
        />
        <path
          v-if="segment.length > 1"
          :d="smoothPath(segment)"
          fill="none"
          :stroke="`url(#${id}-line)`"
          stroke-width="2"
          stroke-linecap="round"
        />
        <g v-for="point in segment" :key="point.x">
          <circle :cx="point.x" :cy="point.y" r="5" fill="#fff" opacity="0.7" />
          <circle :cx="point.x" :cy="point.y" r="2.2" fill="#6d86a8" />
        </g>
      </g>
    </svg>
    <ul :id="detailsId" class="visually-hidden">
      <li v-for="description in pointDescriptions" :key="description">
        {{ description }}
      </li>
    </ul>
    <figcaption class="insights-trend-dates">
      <span>{{ shortDate(start) }}</span
      ><span>{{ shortDate(end) }}</span>
    </figcaption>
  </figure>
</template>
