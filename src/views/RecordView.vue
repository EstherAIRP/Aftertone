<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import PromptReveal from "../components/PromptReveal.vue";
import { addEvent } from "../db";
import {
  DURATION_LABELS,
  DURATION_LEVELS,
  EAR_LABELS,
  EAR_SIDES,
  SOUND_LABELS,
  SOUND_TYPES,
  STATUS_LABELS,
  STATUS_TAGS,
  combineDateTime,
  formatOccurredDay,
  formatOccurredTime,
  localDateKey,
  presetOccurredAt,
  toOccurredValue,
  type DurationLevel,
  type EarSide,
  type OccurredPreset,
  type SoundType,
  type StatusTag,
} from "../domain";

const occurredAt = ref(toOccurredValue(new Date()));
const occurredPreset = ref<OccurredPreset>("now");
const customDate = ref("");
const customTime = ref("");
const todayKey = ref(localDateKey(new Date()));
const occurredPresets: { value: OccurredPreset; label: string }[] = [
  { value: "now", label: "現在" },
  { value: "15m", label: "15 分鐘前" },
  { value: "1h", label: "1 小時前" },
  { value: "custom", label: "自訂" },
];
const occurredPresetIndex = computed(() =>
  occurredPresets.findIndex((item) => item.value === occurredPreset.value),
);
const occurredDay = computed(() => formatOccurredDay(occurredAt.value));
const occurredTime = computed(() => formatOccurredTime(occurredAt.value));
function syncCustomInputs() {
  customDate.value = occurredAt.value.slice(0, 10);
  customTime.value = formatOccurredTime(occurredAt.value);
}
function selectPreset(preset: OccurredPreset) {
  if (preset === "custom") {
    todayKey.value = localDateKey(new Date());
    syncCustomInputs();
    return;
  }
  occurredAt.value = presetOccurredAt(preset);
}
// Editing the custom inputs updates the value; a future moment is clamped to
// now and written back so the inputs show what will be saved.
watch([customDate, customTime], ([date, time]) => {
  if (occurredPreset.value !== "custom" || !date || !time) return;
  occurredAt.value = combineDateTime(date, time);
  syncCustomInputs();
});
function resetOccurredAt() {
  occurredPreset.value = "now";
  occurredAt.value = toOccurredValue(new Date());
}
const earSide = ref<EarSide>("both");
const intensity = ref(2);
const soundType = ref<SoundType>("high_pitch");
const durationLevel = ref<DurationLevel>("brief");
const statusTags = ref<StatusTag[]>([]);
const note = ref("");
const saving = ref(false);
const error = ref("");
const result = ref<Awaited<ReturnType<typeof addEvent>> | null>(null);
const earSides = EAR_SIDES.map((value) => ({ value, label: EAR_LABELS[value] }));
const soundTypes = SOUND_TYPES.map((value) => ({
  value,
  label: SOUND_LABELS[value],
}));
const durations = DURATION_LEVELS.map((value) => ({
  value,
  label: DURATION_LABELS[value],
}));
const tags = STATUS_TAGS.map((value) => ({ value, label: STATUS_LABELS[value] }));
async function submit() {
  if (saving.value) return;
  saving.value = true;
  error.value = "";
  // Staying on 現在 means "the moment I saved", not when the form opened.
  if (occurredPreset.value === "now")
    occurredAt.value = toOccurredValue(new Date());
  try {
    result.value = await addEvent({
      occurredAt: occurredAt.value,
      earSide: earSide.value,
      intensity: intensity.value,
      soundType: soundType.value,
      durationLevel: durationLevel.value,
      statusTags: [...statusTags.value],
      note: note.value,
    });
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : "儲存失敗，請再試一次。";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="page narrow-page">
    <RouterLink class="back-link" to="/">← 回首頁</RouterLink>
    <PromptReveal
      v-if="result"
      :fragment="result.fragment"
      :date="result.event.date"
      @again="
        result = null;
        resetOccurredAt();
      "
    />
    <template v-else>
      <p class="eyebrow">NEW ENTRY</p>
      <h1>記錄一次耳鳴</h1>
      <p class="muted intro">把當下的感受留下來，稍後也能回頭看。</p>
      <form class="card record-form" @submit.prevent="submit">
        <section class="record-section" aria-labelledby="record-sound-heading">
          <div class="section-heading">
            <h2 id="record-sound-heading">這次的聲音</h2>
            <span aria-hidden="true"></span>
          </div>
          <fieldset>
            <legend>發生時間</legend>
            <div class="occurred">
              <div
                class="occurred__display"
                aria-live="polite"
                aria-atomic="true"
              >
                <span class="occurred__day">{{ occurredDay }}</span>
                <span class="occurred__time">{{ occurredTime }}</span>
              </div>
              <div
                class="segmented"
                :style="{
                  '--seg-count': occurredPresets.length,
                  '--seg-index': occurredPresetIndex,
                }"
              >
                <span class="segmented__thumb" aria-hidden="true"></span>
                <label
                  v-for="item in occurredPresets"
                  :key="item.value"
                  class="segmented__option"
                  ><input
                    v-model="occurredPreset"
                    type="radio"
                    name="occurredPreset"
                    :value="item.value"
                    @change="selectPreset(item.value)"
                  /><span>{{ item.label }}</span></label
                >
              </div>
            </div>
            <Transition name="occurred-custom">
              <div v-if="occurredPreset === 'custom'" class="occurred__custom">
                <div class="occurred__custom-inner">
                  <label class="field"
                    ><span>日期</span
                    ><input
                      v-model="customDate"
                      type="date"
                      :max="todayKey"
                      required
                  /></label>
                  <label class="field"
                    ><span>時間</span
                    ><input v-model="customTime" type="time" required
                  /></label>
                </div>
              </div>
            </Transition>
          </fieldset>
          <fieldset>
            <legend>耳側</legend>
            <div class="text-option-group">
              <label
                v-for="item in earSides"
                :key="item.value"
                class="text-option"
                ><input
                  v-model="earSide"
                  type="radio"
                  name="earSide"
                  :value="item.value"
                /><span class="text-option__label">{{ item.label }}</span></label
              >
            </div>
          </fieldset>
          <fieldset>
            <legend>強度</legend>
            <div class="intensity-scale">
              <div class="chip-group">
                <label
                  v-for="number in 5"
                  :key="number"
                  class="chip chip--circle"
                  :class="{ 'is-filled': number <= intensity }"
                  :data-level="number"
                  ><input
                    v-model.number="intensity"
                    type="radio"
                    name="intensity"
                    :value="number"
                    :aria-label="
                      number === 1
                        ? '1 輕微'
                        : number === 5
                          ? '5 明顯'
                          : undefined
                    "
                  /><span>{{ number }}</span></label
                >
              </div>
              <p class="intensity-scale__ends" aria-hidden="true">
                <span>輕微</span><span>明顯</span>
              </p>
            </div>
          </fieldset>
          <fieldset>
            <legend>聲音類型</legend>
            <div class="text-option-group">
              <label
                v-for="item in soundTypes"
                :key="item.value"
                class="text-option"
                ><input
                  v-model="soundType"
                  type="radio"
                  name="soundType"
                  :value="item.value"
                /><span class="text-option__label">{{ item.label }}</span></label
              >
            </div>
          </fieldset>
          <fieldset>
            <legend>持續時間</legend>
            <div class="text-option-group">
              <label
                v-for="item in durations"
                :key="item.value"
                class="text-option"
                ><input
                  v-model="durationLevel"
                  type="radio"
                  name="durationLevel"
                  :value="item.value"
                /><span class="text-option__label">{{ item.label }}</span></label
              >
            </div>
          </fieldset>
        </section>
        <section class="record-section" aria-labelledby="record-self-heading">
          <div class="section-heading">
            <h2 id="record-self-heading">
              當下的你 <small class="optional-tag">可略過</small>
            </h2>
            <span aria-hidden="true"></span>
          </div>
          <fieldset>
            <legend>當下狀態 <small class="optional-tag">可複選</small></legend>
            <div class="text-option-group">
              <label
                v-for="tag in tags"
                :key="tag.value"
                class="text-option"
                ><input
                  v-model="statusTags"
                  type="checkbox"
                  :value="tag.value"
                /><span class="text-option__label">{{ tag.label }}</span></label
              >
            </div>
          </fieldset>
          <label class="field"
            ><span>簡短備註</span
            ><textarea
              v-model="note"
              rows="3"
              maxlength="500"
              placeholder="想留下的其他感受…"
            ></textarea>
          </label>
        </section>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button
          class="button primary full-width record-submit"
          type="submit"
          :disabled="saving"
        >
          {{ saving ? "正在保存…" : "保存這次紀錄" }}
        </button>
      </form>
    </template>
  </main>
</template>
