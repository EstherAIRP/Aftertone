<script setup lang="ts">
import { computed } from "vue";
import { STATUS_LABELS, type StatusTag } from "../domain";
import type { Counted } from "../insights";

const props = defineProps<{ statuses: Counted<StatusTag>[]; total: number }>();
const most = computed(() => Math.max(1, ...props.statuses.map((s) => s.count)));
// Four quiet steps of size and depth instead of raw font sizes.
const level = (count: number) => Math.max(1, Math.ceil((count / most.value) * 4));
</script>

<template>
  <ul class="status-words">
    <li
      v-for="status in statuses"
      :key="status.key"
      :class="['status-word', `status-word--${level(status.count)}`]"
      :aria-label="`${STATUS_LABELS[status.key]}，${total} 段中有 ${status.count} 段`"
    >
      {{ STATUS_LABELS[status.key] }}<span aria-hidden="true">{{ status.count }}</span>
    </li>
  </ul>
  <p class="insights-note">只是同時被記下，不代表原因。</p>
</template>
