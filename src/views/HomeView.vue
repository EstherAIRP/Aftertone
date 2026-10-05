<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { getDay } from "../db";
import {
  CATEGORY_LABELS,
  CORE_CATEGORIES,
  formatDateLabel,
  localDateKey,
  type PromptFragment,
} from "../domain";

const today = localDateKey(new Date());
const count = ref(0);
const fragments = ref<PromptFragment[]>([]);
const presentCategories = ref<Set<string>>(new Set());
const error = ref("");
const dateLabel = formatDateLabel(today);
const categoryArtwork: Record<PromptFragment["category"], string> = {
  person: "person",
  clothing: "clothing",
  background: "background",
  atmosphere: "atmosphere",
  composition: "composition",
  color: "color",
  pose: "pose",
  light: "atmosphere",
  texture: "clothing",
  object: "composition",
};

// A fragment keeps the same visual between visits while different fragments
// can use one of three compositions for their category artwork.
function artworkVariant(id: string): number {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 3;
}

onMounted(async () => {
  try {
    const day = await getDay(today);
    count.value = day.events.length;
    fragments.value = [...day.fragments].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    presentCategories.value = new Set(
      day.fragments.map((fragment) => fragment.category),
    );
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "無法讀取資料。";
  }
});
</script>

<template>
  <main class="page home-page">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="hero-intro">
        <p class="hero-date">{{ dateLabel }}</p>
        <span class="hero-divider" aria-hidden="true"></span>
        <h1 id="home-title">
          今天留下了 <span>{{ count }}</span> 段殘響。
        </h1>
      </div>
      <RouterLink class="record-orbit" to="/record" aria-label="記下一次耳鳴">
        <span class="orbit-light" aria-hidden="true"></span>
        <span class="orbit-core" aria-hidden="true"
          ><span class="record-mark"></span
        ></span>
        <span class="orbit-caption">記下一次</span>
      </RouterLink>
    </section>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <section class="today-imagery" aria-labelledby="imagery-heading">
      <div class="section-heading">
        <h2 id="imagery-heading">今日意象</h2>
        <span aria-hidden="true"></span>
      </div>
      <ul class="imagery-categories" aria-label="意象類別">
        <li
          v-for="category in CORE_CATEGORIES"
          :key="category"
          :class="[
            `category-${category}`,
            { active: presentCategories.has(category) },
          ]"
          :aria-label="`${CATEGORY_LABELS[category]}，${presentCategories.has(category) ? '已有片段' : '尚未出現'}`"
        >
          <span class="category-orb" aria-hidden="true">
            <img
              v-if="presentCategories.has(category)"
              :src="`/images/categories/${category}.webp`"
              alt=""
              width="320"
              height="320"
            />
          </span>
          <span aria-hidden="true">{{ CATEGORY_LABELS[category] }}</span>
        </li>
      </ul>
      <template v-if="fragments.length">
        <div
          class="imagery-fragments"
          role="region"
          aria-label="已收集的意象"
          tabindex="0"
        >
          <article
            v-for="fragment in fragments"
            :key="fragment.id"
            class="fragment-card"
            :class="[
              `category-${categoryArtwork[fragment.category]}`,
              `fragment-card--variant-${artworkVariant(fragment.id)}`,
            ]"
          >
            <img
              class="fragment-card-art"
              :src="`/images/categories/${categoryArtwork[fragment.category]}.webp`"
              alt=""
              loading="lazy"
              width="320"
              height="320"
            />
            <div class="fragment-card-content">
              <span class="fragment-card-category">{{ CATEGORY_LABELS[fragment.category] }}</span>
              <p>{{ fragment.zh }}</p>
            </div>
          </article>
        </div>
        <p v-if="fragments.length > 1" class="imagery-scroll-hint">
          左右滑動，查看每段意象
        </p>
      </template>
      <p v-else class="imagery-empty">每段意象，都從一次安靜的記錄開始。</p>
      <RouterLink :to="`/day/${today}`" class="imagery-link"
        >查看今日意象 <span aria-hidden="true">→</span></RouterLink
      >
    </section>
  </main>
</template>
