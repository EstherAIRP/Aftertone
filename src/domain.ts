export const CORE_CATEGORIES = [
  "person",
  "clothing",
  "background",
  "atmosphere",
  "composition",
  "color",
  "pose",
] as const;
export const DETAIL_CATEGORIES = ["light", "texture", "object"] as const;
export type Category =
  (typeof CORE_CATEGORIES)[number] | (typeof DETAIL_CATEGORIES)[number];
export type EarSide = "left" | "right" | "both";
export type SoundType =
  "high_pitch" | "low_pitch" | "hum" | "sharp" | "pulsing" | "other";
export type DurationLevel =
  "brief" | "under_30s" | "under_1m" | "one_to_three" | "over_3m";
export type StatusTag =
  | "stress"
  | "fatigue"
  | "poor_sleep"
  | "quiet"
  | "headphones"
  | "after_work"
  | "before_bed"
  | "other";

export interface TinnitusEvent {
  id: string;
  date: string;
  occurredAt: string;
  earSide: EarSide;
  intensity: number;
  soundType: SoundType;
  durationLevel: DurationLevel;
  statusTags: StatusTag[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptFragment {
  id: string;
  eventId: string;
  date: string;
  category: Category;
  zh: string;
  en: string;
  createdAt: string;
}

export type ImageSync = "local" | "synced";

export interface DailyArtwork {
  id: string;
  date: string;
  title: string;
  draftZh: string;
  draftEn: string;
  finalZh: string;
  finalEn: string;
  // `local:YYYY-MM-DD` while the image only lives in IndexedDB; becomes the
  // repository path once GitHub sync exists.
  imagePath: string | null;
  imageSync: ImageSync | null;
  // Kept on the artwork so the gallery can lay out cards without reading Blobs.
  imageWidth: number | null;
  imageHeight: number | null;
  completedAt: string;
  updatedAt: string;
}

export interface ArtworkImage {
  date: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  createdAt: string;
}

export interface ArchiveDay {
  date: string;
  eventCount: number;
  artwork: DailyArtwork | null;
}

export interface NewEventInput {
  occurredAt: string;
  earSide: EarSide;
  intensity: number;
  soundType: SoundType;
  durationLevel: DurationLevel;
  statusTags: StatusTag[];
  note: string;
}

export function createEvent(
  input: NewEventInput,
  date: string,
  id: string,
  now: string,
): TinnitusEvent {
  return {
    id,
    date,
    occurredAt: dateFromInput(input.occurredAt).toISOString(),
    earSide: input.earSide,
    intensity: input.intensity,
    soundType: input.soundType,
    durationLevel: input.durationLevel,
    statusTags: [...input.statusTags],
    note: input.note.trim(),
    createdAt: now,
    updatedAt: now,
  };
}

// Record-form options. Array order is display order on every page.
export const EAR_LABELS: Record<EarSide, string> = {
  left: "左耳",
  right: "右耳",
  both: "雙耳",
};
export const EAR_SIDES = Object.keys(EAR_LABELS) as EarSide[];
export const SOUND_LABELS: Record<SoundType, string> = {
  high_pitch: "高頻",
  low_pitch: "低頻",
  hum: "嗡聲",
  sharp: "尖銳",
  pulsing: "脈動感",
  other: "其他",
};
export const SOUND_TYPES = Object.keys(SOUND_LABELS) as SoundType[];
export const DURATION_LABELS: Record<DurationLevel, string> = {
  brief: "3分鐘",
  under_30s: "10分鐘",
  under_1m: "30分鐘",
  one_to_three: "1小時",
  over_3m: "1小時以上",
};
export const DURATION_LEVELS = Object.keys(DURATION_LABELS) as DurationLevel[];
export const STATUS_LABELS: Record<StatusTag, string> = {
  stress: "壓力高",
  fatigue: "疲勞",
  poor_sleep: "睡眠不足",
  quiet: "安靜環境",
  headphones: "使用耳機後",
  after_work: "工作後",
  before_bed: "睡前",
  other: "其他",
};
export const STATUS_TAGS = Object.keys(STATUS_LABELS) as StatusTag[];

export const CATEGORY_LABELS: Record<Category, string> = {
  person: "人物",
  clothing: "服裝",
  background: "背景",
  atmosphere: "氛圍",
  composition: "構圖",
  color: "色調",
  pose: "姿勢",
  light: "光影",
  texture: "材質",
  object: "特殊物件",
};

// Only the seven core categories have artwork (and their own colours); the
// detail categories fall back to a neutral tint.
export function hasCategoryArt(category: Category): boolean {
  return (CORE_CATEGORIES as readonly Category[]).includes(category);
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-");
  return `${year}/${month}/${day}`;
}

export function dateFromInput(value: string): Date {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()))
    throw new Error("請選擇有效的發生時間。");
  return date;
}

// Occurred-at form value: local wall-clock "YYYY-MM-DDTHH:mm", the same
// string a datetime-local input produces (parsed as local by dateFromInput).
export type OccurredPreset = "now" | "15m" | "1h" | "custom";
const PRESET_OFFSET_MINUTES: Record<
  Exclude<OccurredPreset, "custom">,
  number
> = { now: 0, "15m": 15, "1h": 60 };
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function toOccurredValue(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${localDateKey(date)}T${hours}:${minutes}`;
}

export function presetOccurredAt(
  preset: Exclude<OccurredPreset, "custom">,
  now = new Date(),
): string {
  return toOccurredValue(
    new Date(now.getTime() - PRESET_OFFSET_MINUTES[preset] * 60000),
  );
}

export function combineDateTime(
  date: string,
  time: string,
  now = new Date(),
): string {
  const value = `${date}T${time.slice(0, 5)}`;
  const latest = toOccurredValue(now);
  return value > latest ? latest : value;
}

export function formatOccurredDay(value: string, now = new Date()): string {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const yesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  );
  const label = `${year === now.getFullYear() ? "" : `${year}年`}${month}月${day}日（${WEEKDAYS[date.getDay()]}）`;
  const key = localDateKey(date);
  if (key === localDateKey(now)) return `今天 · ${label}`;
  if (key === localDateKey(yesterday)) return `昨天 · ${label}`;
  return label;
}

export function formatOccurredTime(value: string): string {
  return value.slice(11, 16);
}

export function validateEvent(
  input: NewEventInput,
  today = new Date(),
): string {
  const occurred = dateFromInput(input.occurredAt);
  const date = localDateKey(occurred);
  if (date > localDateKey(today)) throw new Error("不能記錄未來的日期。");
  if (
    !Number.isInteger(input.intensity) ||
    input.intensity < 1 ||
    input.intensity > 5
  )
    throw new Error("強度須介於 1 到 5。");
  if (input.note.length > 500) throw new Error("備註最多 500 字。");
  return date;
}

export function nextCategory(
  fragments: PromptFragment[],
  random = Math.random,
): Category {
  const counts = new Map<Category, number>();
  for (const fragment of fragments)
    counts.set(fragment.category, (counts.get(fragment.category) ?? 0) + 1);
  const unused = (categories: readonly Category[]) =>
    categories.filter((category) => !counts.has(category));
  // Core first, then details, each without repeats. Once all ten are used,
  // draw from whichever categories have been drawn the fewest times.
  const all: readonly Category[] = [...CORE_CATEGORIES, ...DETAIL_CATEGORIES];
  const fewest = Math.min(...all.map((category) => counts.get(category) ?? 0));
  const pool = [
    unused(CORE_CATEGORIES),
    unused(DETAIL_CATEGORIES),
    all.filter((category) => (counts.get(category) ?? 0) === fewest),
  ].find((candidates) => candidates.length)!;
  return pool[Math.floor(random() * pool.length)];
}

type Fragment = Pick<PromptFragment, "zh" | "en">;

// Every variant is equally likely; the event's details no longer steer the pick.
const FRAGMENT_POOL: Record<Category, Fragment[]> = {
  person: [
    {
      zh: "輪廓纖細、帶透明感的人物",
      en: "a figure with delicate, translucent features",
    },
    {
      zh: "神情沉靜、輪廓柔和的人物",
      en: "a quiet figure with soft features",
    },
  ],
  clothing: [
    { zh: "穿著柔軟寬鬆的外衣", en: "wearing soft, loose outerwear" },
    {
      zh: "穿著線條俐落的層疊衣物",
      en: "wearing structured, layered clothing",
    },
    { zh: "穿著輕便而簡潔的衣物", en: "wearing light, simple clothing" },
  ],
  background: [
    {
      zh: "置身深夜的窗邊與微暗室內",
      en: "beside a window in a dim room at night",
    },
    {
      zh: "置身有柔和日光的安靜空間",
      en: "in a quiet space with gentle daylight",
    },
  ],
  atmosphere: [
    {
      zh: "空氣略帶緊繃與層疊的迴響",
      en: "the air carries a tense, layered echo",
    },
    { zh: "氛圍朦朧而緩慢", en: "the atmosphere is hazy and unhurried" },
    { zh: "氛圍安靜而柔和", en: "the atmosphere is quiet and gentle" },
  ],
  composition: [
    { zh: "對稱的近景構圖", en: "a symmetrical composition with a close view" },
    {
      zh: "對稱的留白構圖",
      en: "a symmetrical composition with ample negative space",
    },
    {
      zh: "偏左的近景構圖",
      en: "a left-weighted composition with a close view",
    },
    {
      zh: "偏左的留白構圖",
      en: "a left-weighted composition with ample negative space",
    },
    {
      zh: "偏右的近景構圖",
      en: "a right-weighted composition with a close view",
    },
    {
      zh: "偏右的留白構圖",
      en: "a right-weighted composition with ample negative space",
    },
  ],
  color: [
    {
      zh: "以低飽和冰藍與銀灰為主色",
      en: "a muted palette of icy blue and silver gray",
    },
    {
      zh: "以霧灰、鼠尾草綠與暖棕為主色",
      en: "a muted palette of mist gray, sage and warm brown",
    },
  ],
  pose: [
    {
      zh: "輕扶耳側，微微閉眼",
      en: "gently touching one ear with eyes softly closed",
    },
    {
      zh: "靜靜停留，望向遠方",
      en: "resting quietly and looking into the distance",
    },
  ],
  light: [
    { zh: "窗邊留著一圈微弱光暈", en: "a faint halo lingers by the window" },
    {
      zh: "日光在邊緣留下淡淡光暈",
      en: "daylight leaves a faint halo at the edges",
    },
  ],
  texture: [
    {
      zh: "畫面帶有紙張與薄霧的細緻質地",
      en: "the image has the delicate texture of paper and mist",
    },
  ],
  object: [
    {
      zh: "空中漂浮著細微的半透明絲線",
      en: "fine translucent threads float in the air",
    },
  ],
};

// Prefers variants not yet drawn for this category today, so stacked
// fragments differ whenever the category has enough variants.
export function fragmentFor(
  category: Category,
  existing: PromptFragment[] = [],
  random = Math.random,
): Fragment {
  const taken = new Set(
    existing
      .filter((fragment) => fragment.category === category)
      .map((fragment) => fragment.zh),
  );
  const fresh = FRAGMENT_POOL[category].filter(
    (fragment) => !taken.has(fragment.zh),
  );
  const pool = fresh.length ? fresh : FRAGMENT_POOL[category];
  return { ...pool[Math.floor(random() * pool.length)] };
}

const PROMPT_ORDER: Category[] = [
  "person",
  "clothing",
  "pose",
  "background",
  "composition",
  "color",
  "atmosphere",
  ...DETAIL_CATEGORIES,
];
const FALLBACKS: Record<
  (typeof CORE_CATEGORIES)[number],
  { zh: string; en: string }
> = {
  person: { zh: "一位安靜的人物", en: "a quiet figure" },
  clothing: { zh: "穿著簡潔的衣物", en: "wearing simple clothing" },
  background: { zh: "置身柔和的背景", en: "in a soft setting" },
  atmosphere: { zh: "氛圍平靜", en: "a calm atmosphere" },
  composition: {
    zh: "留白適中的構圖",
    en: "a composition with gentle negative space",
  },
  color: { zh: "低飽和色調", en: "a muted color palette" },
  pose: { zh: "靜靜停留", en: "resting quietly" },
};
export function composePrompt(fragments: PromptFragment[]): {
  zh: string;
  en: string;
} {
  // Repeated categories stack in draw order; identical text appears once.
  const chronological = [...fragments].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const sorted = PROMPT_ORDER.flatMap((category): Fragment[] => {
    const drawn = chronological.filter(
      (fragment) => fragment.category === category,
    );
    if (!drawn.length)
      return category in FALLBACKS
        ? [FALLBACKS[category as keyof typeof FALLBACKS]]
        : [];
    const seen = new Set<string>();
    return drawn.filter(
      (fragment) => !seen.has(fragment.zh) && !!seen.add(fragment.zh),
    );
  });
  return {
    zh: [
      ...sorted.map((fragment) => fragment.zh),
      "唯美細膩插畫，柔和光影，夢境感與適度留白。",
    ].join("，"),
    en: [
      ...sorted.map((fragment) => fragment.en),
      "A delicate illustration with soft light, a dreamlike mood and generous space.",
    ].join(", "),
  };
}

export type CalendarState = "artwork" | "pending" | "open" | "empty";
export interface CalendarCell {
  // null for the leading blanks before the first day of the month.
  date: string | null;
  state: CalendarState;
  isToday: boolean;
  eventCount: number;
  artwork: DailyArtwork | null;
}

const MONTH_NAMES = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

export function formatMonthLabel(month: string): string {
  const [year, index] = month.split("-");
  return `${year} · ${MONTH_NAMES[Number(index) - 1]}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  return localDateKey(new Date(year, index - 1 + delta, 1)).slice(0, 7);
}

// Weeks start on Sunday. Days without records stay "empty"; today is flagged
// separately so it can carry its own records at the same time.
export function buildMonthGrid(
  month: string,
  archive: ArchiveDay[],
  today: string,
): CalendarCell[] {
  const [year, index] = month.split("-").map(Number);
  const leading = new Date(year, index - 1, 1).getDay();
  const days = new Date(year, index, 0).getDate();
  const byDate = new Map(archive.map((day) => [day.date, day]));
  const cells: CalendarCell[] = Array.from({ length: leading }, () => ({
    date: null,
    state: "empty",
    isToday: false,
    eventCount: 0,
    artwork: null,
  }));
  for (let day = 1; day <= days; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const entry = byDate.get(date);
    const artwork = entry?.artwork ?? null;
    const eventCount = entry?.eventCount ?? 0;
    cells.push({
      date,
      state: artwork
        ? artwork.imagePath
          ? "artwork"
          : "pending"
        : eventCount
          ? "open"
          : "empty",
      isToday: date === today,
      eventCount,
      artwork,
    });
  }
  return cells;
}

// Keeps reading order roughly top-to-bottom: each item goes into the column
// that is currently shortest, the leftmost one on ties.
export function distributeMasonry<T>(
  items: T[],
  columns: number,
  ratioOf: (item: T) => number,
): T[][] {
  const result: T[][] = Array.from({ length: columns }, () => []);
  const heights = new Array<number>(columns).fill(0);
  for (const item of items) {
    const shortest = heights.indexOf(Math.min(...heights));
    result[shortest].push(item);
    heights[shortest] += ratioOf(item);
  }
  return result;
}

// Height / width for a card's image area. Cards without an image are square;
// extreme images are limited to 1:2–2:1 and cropped from the centre.
export function displayRatio(artwork: DailyArtwork): number {
  if (!artwork.imagePath || !artwork.imageWidth || !artwork.imageHeight)
    return 1;
  return Math.min(2, Math.max(0.5, artwork.imageHeight / artwork.imageWidth));
}

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
// Larger files are still stored locally, but cannot be synced automatically.
export const SYNC_IMAGE_LIMIT = 4 * 1024 * 1024;

export function validateImageFile(file: {
  type: string;
  size: number;
}): { ok: true; warning?: "oversize" } | { ok: false; reason: "type" } {
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, reason: "type" };
  return file.size > SYNC_IMAGE_LIMIT
    ? { ok: true, warning: "oversize" }
    : { ok: true };
}
