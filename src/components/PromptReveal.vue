<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import {
  CATEGORY_LABELS,
  hasCategoryArt,
  type PromptFragment,
} from "../domain";

const props = defineProps<{ fragment: PromptFragment; date: string }>();
defineEmits<{ again: [] }>();

const reduced =
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasArt = hasCategoryArt(props.fragment.category);
const label = CATEGORY_LABELS[props.fragment.category];
const revealed = ref(false);
const announcement = ref("");

const root = ref<HTMLElement>();
const eyebrow = ref<HTMLElement>();
const title = ref<HTMLElement>();
const card = ref<HTMLElement>();
const wash = ref<HTMLElement>();
const art = ref<HTMLElement>();
const tag = ref<HTMLElement>();
const tagDot = ref<HTMLElement>();
const zh = ref<HTMLElement>();
const en = ref<HTMLElement>();
const actions = ref<HTMLElement>();
const fx = ref<HTMLElement>();

// Timings, paths and keyframes are ported from the approved prototype
// (docs/ui-concepts/prompt-draw-demo.html); see the design spec for the why.
const GREY = "#9aabc2";
const FALL = 2600;
const LAND = FALL;
const STAR =
  "M0,-6 C0.7,-1.1 1.1,-0.7 6,0 C1.1,0.7 0.7,1.1 0,6 C-0.7,1.1 -1.1,0.7 -6,0 C-1.1,-0.7 -0.7,-1.1 0,-6Z";
const GLINT_FILLS = ["#ffffff", "#eef4ff", "#f3eeff", "#ecfbfb"];
const twinkle: Keyframe[] = [
  { opacity: 0, transform: "scale(.2) rotate(0deg)" },
  { opacity: 1, transform: "scale(1) rotate(25deg)", offset: 0.45 },
  { opacity: 0, transform: "scale(.3) rotate(45deg)" },
];

let animations: Animation[] = [];
let announceTimer = 0;

function animate(
  el: Element,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation {
  const animation = el.animate(frames, {
    fill: "both",
    easing: "ease-in-out",
    ...options,
  });
  animations.push(animation);
  return animation;
}

// Linear mix of two #rrggbb colours, for keyframes that need a concrete value.
function mix(from: string, to: string, amount: number): string {
  const channels = (hex: string) =>
    [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const a = channels(from);
  const b = channels(to);
  return `rgb(${a.map((value, index) => Math.round(value + (b[index] - value) * amount)).join(", ")})`;
}

function glint(x: number, y: number, size: number, fill: string) {
  const el = document.createElement("div");
  el.className = "reveal-glint";
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = el.style.height = `${size}px`;
  el.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
  el.innerHTML = `<svg viewBox="-7 -7 14 14"><path d="${STAR}" fill="${fill}" style="filter:drop-shadow(0 0 2px rgba(160,190,230,.9))"/></svg>`;
  return el;
}

function playReduced(): Animation {
  const fade = [{ opacity: 0 }, { opacity: 1 }];
  animate(title.value!, fade, { duration: 220 });
  animate(card.value!, fade, { duration: 220 });
  return animate(actions.value!, fade, { duration: 220 });
}

function playFull(): Animation {
  const layer = fx.value!;
  const vivid = getComputedStyle(root.value!)
    .getPropertyValue("--reveal-vivid")
    .trim();
  const textEls = [tag.value!, zh.value!, en.value!];

  // Geometry, relative to the component root (the effects layer covers it).
  const box = root.value!.getBoundingClientRect();
  const cardBox = card.value!.getBoundingClientRect();
  const cx = cardBox.left - box.left + cardBox.width / 2;
  const cy = cardBox.top - box.top + cardBox.height / 2 - 6;
  const dotBox = tagDot.value!.getBoundingClientRect();
  const tx = dotBox.left - box.left + dotBox.width / 2 - cx;
  const ty = dotBox.top - box.top + dotBox.height / 2 - cy;
  const startY = eyebrow.value!.getBoundingClientRect().bottom - box.top + 22;

  // Hidden starting states (the title waits for the card so the light falls
  // through empty space).
  animate(
    title.value!,
    [
      { opacity: 0, filter: "blur(6px)" },
      { opacity: 1, filter: "blur(0)" },
    ],
    { duration: 800, delay: FALL + 650 },
  );
  const hidden = [{ opacity: 0 }, { opacity: 0 }];
  for (const el of [card.value!, actions.value!, ...textEls, tagDot.value!])
    animate(el, hidden, { duration: 1 });

  // 1. Falling light: sways while it grows, converging on the landing point.
  const fallHeight = cy - startY;
  const path = (t: number) => {
    const progress = -(Math.cos(Math.PI * t) - 1) / 2;
    const sway =
      46 * Math.sin(2.6 * Math.PI * t + 0.5) * Math.pow(1 - progress, 0.7);
    return [sway, -fallHeight * (1 - progress)];
  };
  const grow = (t: number) => 0.3 + 0.7 * (1 - Math.pow(1 - t, 1.6));
  const dot = document.createElement("div");
  dot.className = "reveal-dot";
  dot.style.left = `${cx}px`;
  dot.style.top = `${cy}px`;
  dot.innerHTML =
    '<div class="reveal-dot-core"></div><div class="reveal-dot-tint"></div>';
  layer.appendChild(dot);

  const steps = 40;
  const fallFrames: Keyframe[] = [];
  for (let i = 0; i <= steps; i++) {
    const [x, y] = path(i / steps);
    fallFrames.push({
      transform: `translate(${x}px, ${y}px) scale(${grow(i / steps).toFixed(3)})`,
      offset: i / steps,
    });
  }
  // Fall, then a gentle settle, then glide into the tag dot.
  animate(dot, fallFrames, { duration: FALL, easing: "linear" });
  animate(
    dot,
    [
      { transform: "translate(0,0) scale(1)" },
      { transform: "translate(0,3px) scale(1.28)", offset: 0.4 },
      { transform: "translate(0,0) scale(1.1)" },
    ],
    { duration: 600, delay: LAND, fill: "forwards", composite: "replace" },
  );
  animate(
    dot,
    [
      { transform: "translate(0,0) scale(1.1)", opacity: 1 },
      {
        transform: `translate(${tx}px, ${ty}px) scale(.45)`,
        opacity: 1,
        offset: 0.85,
      },
      { transform: `translate(${tx}px, ${ty}px) scale(.45)`, opacity: 0 },
    ],
    { duration: 700, delay: LAND + 1300, fill: "forwards" },
  );

  // Colour shift on landing: the grey-blue core cross-fades into the tint.
  animate(
    dot.querySelector(".reveal-dot-tint")!,
    [{ opacity: 0 }, { opacity: 1 }],
    {
      duration: 900,
      delay: LAND - 100,
    },
  );
  animate(
    dot.querySelector(".reveal-dot-core")!,
    [{ opacity: 1 }, { opacity: 0 }],
    {
      duration: 900,
      delay: LAND - 100,
    },
  );

  // Glints orbiting the falling dot.
  [
    [-34, -20, 13],
    [30, -12, 10],
    [-22, 30, 9],
    [36, 26, 12],
    [2, -44, 9],
    [-46, 6, 8],
    [46, -2, 9],
    [8, 40, 10],
  ].forEach(([ox, oy, size], i) => {
    const el = glint(
      11 + ox,
      11 + oy,
      size,
      GLINT_FILLS[i % GLINT_FILLS.length],
    );
    dot.appendChild(el);
    animate(el, twinkle, {
      duration: 800,
      delay: 150 + i * 190,
      iterations: 3,
      fill: "none",
    });
  });
  // Glints left behind along the trail.
  [0.12, 0.24, 0.36, 0.47, 0.58, 0.69, 0.8].forEach((t, i) => {
    const [x, y] = path(t);
    const jitter = (i % 2 ? 1 : -1) * (14 + ((i * 7) % 18));
    const el = glint(
      cx + x + jitter,
      cy + y + ((i * 11) % 20) - 10,
      9 + (i % 3) * 3,
      GLINT_FILLS[i % GLINT_FILLS.length],
    );
    layer.appendChild(el);
    animate(el, twinkle, { duration: 900, delay: t * FALL + 60, fill: "none" });
  });

  // 2. Ripples, grey-blue warming to the category colour.
  const bloom = document.createElement("div");
  bloom.className = "reveal-bloom";
  bloom.style.left = `${cx}px`;
  bloom.style.top = `${cy}px`;
  layer.prepend(bloom);
  animate(
    bloom,
    [
      { opacity: 0, transform: "scale(.15)" },
      { opacity: 0.9, transform: "scale(.6)", offset: 0.35 },
      { opacity: 0, transform: "scale(1.15)" },
    ],
    {
      duration: 2000,
      delay: LAND + 80,
      easing: "cubic-bezier(.25,.6,.3,1)",
      fill: "none",
    },
  );
  for (let i = 0; i < 4; i++) {
    const ring = document.createElement("div");
    ring.className = "reveal-ring";
    ring.style.left = `${cx}px`;
    ring.style.top = `${cy}px`;
    layer.appendChild(ring);
    const end = 200 + i * 70;
    // Each ring is born grey-blue and takes on the category colour as it
    // spreads; later rings start further along.
    const from = mix(GREY, vivid, 0.25 + i * 0.2);
    animate(
      ring,
      [
        {
          width: "14px",
          height: "14px",
          opacity: 0,
          borderWidth: "2px",
          borderColor: from,
        },
        { opacity: 0.9, offset: 0.12 },
        { borderColor: vivid, offset: 0.55 },
        {
          width: `${end}px`,
          height: `${end}px`,
          opacity: 0,
          borderWidth: "0.5px",
          borderColor: vivid,
        },
      ],
      {
        duration: 1700,
        delay: LAND + i * 230,
        easing: "cubic-bezier(.2,.55,.35,1)",
        fill: "none",
      },
    );
  }
  // A loose ring of glints scattered around the ripple.
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.4;
    const radius = 55 + (i % 3) * 22;
    const el = glint(
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius * 0.9,
      9 + (i % 3) * 3,
      i % 2 ? "#ffffff" : mix("#ffffff", vivid, 0.35),
    );
    layer.appendChild(el);
    animate(el, twinkle, {
      duration: 900,
      delay: LAND + 250 + i * 140,
      fill: "none",
    });
  }

  // 3. The card surfaces and the text comes into focus.
  const border = "rgba(159,180,207,.55)";
  animate(
    card.value!,
    [
      {
        opacity: 0,
        transform: "scale(.965)",
        filter: "blur(8px)",
        borderColor: border,
      },
      {
        opacity: 1,
        transform: "scale(1)",
        filter: "blur(0)",
        borderColor: border,
        offset: 0.5,
      },
      {
        opacity: 1,
        transform: "scale(1)",
        filter: "blur(0)",
        borderColor: vivid,
      },
    ],
    { duration: 1300, delay: LAND + 650, easing: "cubic-bezier(.3,.7,.3,1)" },
  );
  if (art.value)
    animate(
      art.value,
      [
        { opacity: 0, transform: "scale(1.08)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      {
        duration: 1400,
        delay: LAND + 750,
        easing: "cubic-bezier(.3,.7,.3,1)",
      },
    );
  animate(wash.value!, [{ opacity: 0 }, { opacity: 0.38 }], {
    duration: 1400,
    delay: LAND + 500,
  });
  textEls.forEach((el, i) =>
    animate(
      el,
      [
        { opacity: 0, filter: "blur(6px)", transform: "translateY(4px)" },
        { opacity: 1, filter: "blur(0)", transform: "translateY(0)" },
      ],
      {
        duration: 650,
        delay: LAND + 1000 + i * 160,
        easing: "cubic-bezier(.3,.7,.3,1)",
      },
    ),
  );
  animate(
    tagDot.value!,
    [
      { opacity: 0, transform: "scale(.4)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: 260, delay: LAND + 1300 + 560 },
  );
  return animate(
    actions.value!,
    [
      { opacity: 0, transform: "translateY(6px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration: 500, delay: LAND + 1750 },
  );
}

// Tap, click or Esc jumps every animation to its final state.
function skip() {
  if (revealed.value) return;
  for (const animation of animations) {
    try {
      animation.finish();
    } catch {
      // An animation that cannot finish is simply left as is.
    }
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") skip();
}

async function reveal() {
  revealed.value = true;
  window.removeEventListener("keydown", onKeydown);
  await nextTick();
  title.value?.focus({ preventScroll: true });
}

onMounted(() => {
  // Set after insertion so screen readers notice the live region change.
  announceTimer = window.setTimeout(() => {
    announcement.value = `已保存。新增意象：${label}，${props.fragment.zh}`;
  }, 100);
  window.addEventListener("keydown", onKeydown);
  const last = reduced ? playReduced() : playFull();
  last.finished.then(reveal).catch(() => {
    // Cancelled on unmount.
  });
});

onBeforeUnmount(() => {
  window.clearTimeout(announceTimer);
  window.removeEventListener("keydown", onKeydown);
  for (const animation of animations) animation.cancel();
  animations = [];
});
</script>

<template>
  <div
    ref="root"
    class="prompt-reveal"
    :data-category="fragment.category"
    @click="skip"
  >
    <p ref="eyebrow" class="eyebrow">已保存於此裝置</p>
    <h1 ref="title" class="reveal-title" tabindex="-1">
      今天的意象多了一段描述。
    </h1>
    <section ref="card" class="card result-card reveal-card">
      <div ref="wash" class="reveal-wash"></div>
      <div v-if="hasArt" ref="art" class="reveal-art"></div>
      <p ref="tag" class="reveal-tag">
        <span ref="tagDot" class="reveal-tag-dot"></span>{{ label }}
      </p>
      <p ref="zh" class="fragment-text">{{ fragment.zh }}</p>
      <p ref="en" class="muted">{{ fragment.en }}</p>
    </section>
    <div ref="actions" class="actions" :inert="!revealed">
      <RouterLink class="button primary" :to="`/day/${date}`"
        >查看當日意象</RouterLink
      ><button class="button secondary" type="button" @click="$emit('again')">
        再記一筆
      </button>
    </div>
    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
    <div v-if="!reduced" ref="fx" class="reveal-fx" aria-hidden="true"></div>
  </div>
</template>
