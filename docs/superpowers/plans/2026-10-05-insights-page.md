# 「回望」統計頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增底部導覽第四項「回望」(`/insights`)，以柔和的光點、曲線、光暈與漂浮詞描述 7／30／90 天內的耳鳴紀錄。

**Architecture:** 統計全部在前端計算：`src/db.ts` 一次讀出所有 events／artworks，`src/insights.ts` 的純函式彙整成 `InsightSummary`，`InsightsView.vue` 依 URL `?range=` 計算並交給四個展示元件。樣式集中寫在 `src/style.css`（專案沒有 scoped style）。

**Tech Stack:** Vue 3.5（`<script setup>`）、vue-router 4、TypeScript、Vitest + fake-indexeddb、手寫 SVG。

**Spec:** [docs/superpowers/specs/2026-10-05-insights-page-design.md](../specs/2026-10-05-insights-page-design.md)

## Global Constraints

- 不新增任何 npm 相依（不引入圖表庫）。
- 字體規則（`src/style.css` `:root` 註解）：`:root` 以外的 font-family／font-weight／font-size／letter-spacing／line-height 一律用 `var(--…)` token；不可在 inline style 寫字級。
- 介面不得出現評分、升降箭頭、紅綠警示色、連續天數或因果用語；狀態區固定附註「只是同時被記下，不代表原因。」
- 頁尾聲明：「Aftertone 為個人紀錄與創作工具，不提供醫療診斷或治療建議。」
- 期間：7／30／90 天，預設 30；以當地日期計算並包含今天（30 天 = 今天往前 29 天）。90 天時強度改以 7 天為一桶。
- 時段：清晨 05–09、上午 09–12、下午 12–17、傍晚 17–21、夜間 21–05；週一為第一列。
- 期間內紀錄少於 3 段：只顯示期間切換、概覽句與「資料還不多，先安心記錄就好」，不畫圖表。
- 動畫 100–250 ms 淡入；光暈呼吸沿用 `--orb-breathe-duration`；`prefers-reduced-motion` 時停止。
- 觸控目標 ≥ 44 × 44 px；375 px 寬四項導覽不換行、無水平捲動。
- **Commit 注意：** 截至 2026-10-05，`src/` 等應用程式碼在 git 中仍是 untracked。執行者在第一次 commit 前必須先向使用者確認是否要提交基線；未確認前只跑測試、不 commit。

## File Structure

| 檔案 | 動作 | 職責 |
| --- | --- | --- |
| `src/domain.ts` | Modify | 新增耳側／聲音／時長／狀態的標籤與順序常數（供記錄頁與回望頁共用）。 |
| `src/views/RecordView.vue` | Modify | 改用 domain 的標籤常數，移除重複陣列內容。 |
| `src/insights.ts` | Create | 期間、時段、彙整 `summarizeRange`、時段摘要句、強度圖座標與平滑路徑。 |
| `src/insights.test.ts` | Create | 上述純函式測試。 |
| `src/db.ts` | Modify | 新增 `getInsightsData()`。 |
| `src/db.test.ts` | Modify | `getInsightsData` 測試。 |
| `src/components/InsightsHeatmap.vue` | Create | 星期 × 時段光點。 |
| `src/components/IntensityTrend.vue` | Create | 平滑強度曲線（SVG）。 |
| `src/components/VoiceHalos.vue` | Create | 聲音光暈圓圈 + 耳側漣漪弧線。 |
| `src/components/StatusWords.vue` | Create | 漂浮狀態詞。 |
| `src/views/InsightsView.vue` | Create | 頁面組裝、期間切換、空狀態、錯誤。 |
| `src/main.ts` | Modify | 路由 `/insights`。 |
| `src/App.vue` | Modify | 底部導覽第四項。 |
| `src/style.css` | Modify | 回望頁樣式區塊。 |

---

### Task 1: 共用標籤常數

**Files:**
- Modify: `src/domain.ts`（在 `CATEGORY_LABELS` 之前插入）
- Modify: `src/views/RecordView.vue`（`earSides`／`soundTypes`／`durations`／`tags` 四個陣列）
- Test: `src/domain.test.ts`

**Interfaces:**
- Produces: `EAR_SIDES: EarSide[]`、`EAR_LABELS: Record<EarSide,string>`、`SOUND_TYPES: SoundType[]`、`SOUND_LABELS`、`DURATION_LEVELS: DurationLevel[]`、`DURATION_LABELS`、`STATUS_TAGS: StatusTag[]`、`STATUS_LABELS`。陣列順序即記錄頁顯示順序。

- [ ] **Step 1: Write the failing test** — 在 `src/domain.test.ts` 的 import 清單加入 `DURATION_LABELS, DURATION_LEVELS, EAR_LABELS, EAR_SIDES, SOUND_LABELS, SOUND_TYPES, STATUS_LABELS, STATUS_TAGS`，並在檔尾加：

```ts
describe("record option labels", () => {
  it("keeps the record form's order and wording", () => {
    expect(EAR_SIDES.map((side) => EAR_LABELS[side])).toEqual([
      "左耳",
      "右耳",
      "雙耳",
    ]);
    expect(SOUND_TYPES.map((type) => SOUND_LABELS[type])).toEqual([
      "高頻",
      "低頻",
      "嗡聲",
      "尖銳",
      "脈動感",
      "其他",
    ]);
    expect(DURATION_LEVELS.map((level) => DURATION_LABELS[level])).toEqual([
      "短暫",
      "30 秒內",
      "1 分鐘內",
      "1～3 分鐘",
      "3 分鐘以上",
    ]);
    expect(STATUS_TAGS.map((tag) => STATUS_LABELS[tag])).toEqual([
      "壓力高",
      "疲勞",
      "睡眠不足",
      "安靜環境",
      "使用耳機後",
      "工作後",
      "睡前",
      "其他",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain.test.ts`
Expected: FAIL（`EAR_SIDES` 等未匯出 / undefined）

- [ ] **Step 3: Implement** — 在 `src/domain.ts` 的 `export const CATEGORY_LABELS` 之前插入：

```ts
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
  brief: "短暫",
  under_30s: "30 秒內",
  under_1m: "1 分鐘內",
  one_to_three: "1～3 分鐘",
  over_3m: "3 分鐘以上",
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
```

在 `src/views/RecordView.vue` 把四個陣列（`const earSides … = [ … ];` 到 `const tags … = [ … ];`）整段替換為：

```ts
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
```

並在該檔從 `"../domain"` 的 import 加入 `DURATION_LABELS, DURATION_LEVELS, EAR_LABELS, EAR_SIDES, SOUND_LABELS, SOUND_TYPES, STATUS_LABELS, STATUS_TAGS`（保留既有的型別 import，若 `EarSide` 等型別變成未使用則一併移除）。

- [ ] **Step 4: Run tests and type check**

Run: `npx vitest run` then `npx vue-tsc --noEmit`
Expected: 全部 PASS、無型別錯誤。

- [ ] **Step 5: Commit**（見 Global Constraints 的 commit 注意）

```bash
git add src/domain.ts src/domain.test.ts src/views/RecordView.vue
git commit -m "refactor: share record option labels"
```

---

### Task 2: 統計彙整 `src/insights.ts`

**Files:**
- Create: `src/insights.ts`
- Test: `src/insights.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `SOUND_TYPES`、`STATUS_TAGS`；`localDateKey`、型別 `TinnitusEvent`、`DailyArtwork` 等（`src/domain.ts`）。
- Produces（後續任務使用的確切名稱）:
  - `INSIGHT_RANGES = [7, 30, 90] as const`、`type InsightRange = 7 | 30 | 90`、`parseInsightRange(value: unknown): InsightRange`
  - `TIME_SLOTS`、`type TimeSlot = "dawn" | "morning" | "afternoon" | "evening" | "night"`、`TIME_SLOT_LABELS`、`WEEKDAY_LABELS`（週一起）
  - `timeSlotOf(hour: number): TimeSlot`、`weekdayIndex(date: Date): number`、`shiftDate(dateKey: string, delta: number): string`
  - `interface Counted<K> { key: K; count: number }`
  - `interface IntensityPoint { start: string; end: string; average: number; min: number; max: number }`
  - `interface InsightSummary`（欄位見下方程式碼）
  - `summarizeRange(events: TinnitusEvent[], artworks: DailyArtwork[], range: InsightRange, today: string): InsightSummary`
  - `describeTiming(heatmap: number[][]): string`

- [ ] **Step 1: Write the failing tests** — 建立 `src/insights.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import type { DailyArtwork, TinnitusEvent } from "./domain";
import {
  describeTiming,
  parseInsightRange,
  shiftDate,
  summarizeRange,
  timeSlotOf,
  weekdayIndex,
} from "./insights";

// 2026-10-05 is a Monday.
const TODAY = "2026-10-05";

function eventOn(
  date: string,
  hour: number,
  overrides: Partial<TinnitusEvent> = {},
): TinnitusEvent {
  const time = `${String(hour).padStart(2, "0")}:00`;
  return {
    id: `${date}-${hour}`,
    date,
    occurredAt: `${date}T${time}`,
    earSide: "left",
    intensity: 3,
    soundType: "hum",
    durationLevel: "brief",
    statusTags: [],
    note: "",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

function artworkOn(date: string, withImage: boolean): DailyArtwork {
  return {
    id: `artwork-${date}`,
    date,
    title: "",
    draftZh: "",
    draftEn: "",
    finalZh: "",
    finalEn: "",
    imagePath: withImage ? `local:${date}` : null,
    imageSync: withImage ? "local" : null,
    imageWidth: null,
    imageHeight: null,
    completedAt: "",
    updatedAt: "",
  };
}

const events = [
  eventOn("2026-10-05", 22, {
    intensity: 4,
    soundType: "high_pitch",
    earSide: "left",
    durationLevel: "brief",
    statusTags: ["stress", "before_bed"],
  }),
  eventOn("2026-10-05", 8, {
    intensity: 2,
    soundType: "hum",
    earSide: "both",
    durationLevel: "under_30s",
    statusTags: ["stress"],
  }),
  eventOn("2026-09-30", 14, {
    intensity: 3,
    soundType: "high_pitch",
    earSide: "right",
    durationLevel: "over_3m",
  }),
  // Before the 7-day window (which starts 2026-09-29).
  eventOn("2026-09-28", 10, { intensity: 5 }),
];
const artworks = [
  artworkOn("2026-10-04", true),
  artworkOn("2026-10-01", false),
  artworkOn("2026-09-20", false),
];

describe("range helpers", () => {
  it("parses only the supported ranges, defaulting to 30", () => {
    expect(parseInsightRange("7")).toBe(7);
    expect(parseInsightRange("90")).toBe(90);
    expect(parseInsightRange("14")).toBe(30);
    expect(parseInsightRange(undefined)).toBe(30);
  });

  it("shifts local date keys across month boundaries", () => {
    expect(shiftDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDate(TODAY, -89)).toBe("2026-07-08");
  });

  it("maps hours to slots, with night wrapping past midnight", () => {
    expect([4, 5, 9, 12, 17, 21, 0].map(timeSlotOf)).toEqual([
      "night",
      "dawn",
      "morning",
      "afternoon",
      "evening",
      "night",
      "night",
    ]);
  });

  it("numbers weekdays from Monday", () => {
    expect(weekdayIndex(new Date("2026-10-05T12:00"))).toBe(0);
    expect(weekdayIndex(new Date("2026-10-11T12:00"))).toBe(6);
  });
});

describe("summarizeRange", () => {
  const summary = summarizeRange(events, artworks, 7, TODAY);

  it("counts only events and artworks inside the window", () => {
    expect(summary.start).toBe("2026-09-29");
    expect(summary.end).toBe(TODAY);
    expect(summary.eventCount).toBe(3);
    expect(summary.activeDays).toBe(2);
    expect(summary.averageIntensity).toBe(3);
    expect(summary.artworkCount).toBe(2);
    expect(summary.pendingImageCount).toBe(1);
  });

  it("places events on the weekday x slot grid", () => {
    expect(summary.heatmap[0][0]).toBe(1); // Monday dawn
    expect(summary.heatmap[0][4]).toBe(1); // Monday night
    expect(summary.heatmap[2][2]).toBe(1); // Wednesday afternoon
    expect(summary.heatmap.flat().reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("gives one intensity point per day with gaps as null", () => {
    expect(summary.intensity).toHaveLength(7);
    expect(summary.intensity[0]).toBeNull();
    expect(summary.intensity[1]).toEqual({
      start: "2026-09-30",
      end: "2026-09-30",
      average: 3,
      min: 3,
      max: 3,
    });
    expect(summary.intensity[6]).toEqual({
      start: TODAY,
      end: TODAY,
      average: 3,
      min: 2,
      max: 4,
    });
  });

  it("sorts sounds and statuses by count", () => {
    expect(summary.sounds).toEqual([
      { key: "high_pitch", count: 2 },
      { key: "hum", count: 1 },
    ]);
    expect(summary.ears).toEqual({ left: 1, right: 1, both: 1 });
    expect(summary.statuses).toEqual([
      { key: "stress", count: 2 },
      { key: "before_bed", count: 1 },
    ]);
  });

  it("buckets 90 days by week, the last bucket ending today", () => {
    const quarter = summarizeRange(events, artworks, 90, TODAY);
    expect(quarter.start).toBe("2026-07-08");
    expect(quarter.intensity).toHaveLength(13);
    // 2026-09-28 (intensity 5) falls in the previous week bucket.
    expect(quarter.intensity[11]?.max).toBe(5);
    expect(quarter.intensity[12]).toEqual({
      start: "2026-09-30",
      end: TODAY,
      average: 3,
      min: 2,
      max: 4,
    });
  });

  it("reports no average when there are no events", () => {
    expect(summarizeRange([], [], 30, TODAY).averageIntensity).toBeNull();
  });
});

describe("describeTiming", () => {
  const empty = () => Array.from({ length: 7 }, () => [0, 0, 0, 0, 0]);

  it("names the busiest slot and weekday", () => {
    const grid = empty();
    grid[1][4] = 3;
    grid[0][1] = 1;
    expect(describeTiming(grid)).toBe("夜間最常出現，週二也稍多一些。");
  });

  it("lists ties in order", () => {
    const grid = empty();
    grid[0][4] = 1;
    grid[1][1] = 1;
    expect(describeTiming(grid)).toBe(
      "上午、夜間最常出現，週一、週二也稍多一些。",
    );
  });

  it("is empty without events", () => {
    expect(describeTiming(empty())).toBe("");
  });
});
```


- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/insights.test.ts`
Expected: FAIL（找不到模組 `./insights`）

- [ ] **Step 3: Implement** — 建立 `src/insights.ts`：

```ts
import {
  SOUND_TYPES,
  STATUS_TAGS,
  localDateKey,
  type DailyArtwork,
  type EarSide,
  type SoundType,
  type StatusTag,
  type TinnitusEvent,
} from "./domain";

export const INSIGHT_RANGES = [7, 30, 90] as const;
export type InsightRange = (typeof INSIGHT_RANGES)[number];

export function parseInsightRange(value: unknown): InsightRange {
  const days = Number(value);
  return (INSIGHT_RANGES as readonly number[]).includes(days)
    ? (days as InsightRange)
    : 30;
}

export const TIME_SLOTS = [
  "dawn",
  "morning",
  "afternoon",
  "evening",
  "night",
] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];
export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  dawn: "清晨",
  morning: "上午",
  afternoon: "下午",
  evening: "傍晚",
  night: "夜間",
};
// Monday first, matching the heatmap rows.
export const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function timeSlotOf(hour: number): TimeSlot {
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

// Monday = 0 … Sunday = 6.
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function shiftDate(dateKey: string, delta: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return localDateKey(new Date(year, month - 1, day + delta));
}

export interface Counted<K> {
  key: K;
  count: number;
}

export interface IntensityPoint {
  start: string;
  end: string;
  average: number;
  min: number;
  max: number;
}

export interface InsightSummary {
  range: InsightRange;
  start: string;
  end: string;
  eventCount: number;
  activeDays: number;
  artworkCount: number;
  pendingImageCount: number;
  averageIntensity: number | null;
  // [weekday (Mon = 0)][TIME_SLOTS index] → event count.
  heatmap: number[][];
  // One point per day (per 7 days for 90), null where nothing was recorded.
  intensity: (IntensityPoint | null)[];
  // Most frequent first; zero counts dropped.
  sounds: Counted<SoundType>[];
  ears: Record<EarSide, number>;
  // Most frequent first; zero counts dropped.
  statuses: Counted<StatusTag>[];
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function countBy<K extends string>(
  keys: readonly K[],
  values: K[],
): Counted<K>[] {
  return keys.map((key) => ({
    key,
    count: values.filter((value) => value === key).length,
  }));
}

// Sort is stable, so ties keep the record form's order.
function byCountDesc<K>(items: Counted<K>[]): Counted<K>[] {
  return items
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function summarizeRange(
  events: TinnitusEvent[],
  artworks: DailyArtwork[],
  range: InsightRange,
  today: string,
): InsightSummary {
  const start = shiftDate(today, -(range - 1));
  const inRange = (date: string) => date >= start && date <= today;
  const picked = events.filter((event) => inRange(event.date));
  const pickedArtworks = artworks.filter((artwork) => inRange(artwork.date));

  const heatmap = WEEKDAY_LABELS.map(() => TIME_SLOTS.map(() => 0));
  for (const event of picked) {
    const at = new Date(event.occurredAt);
    heatmap[weekdayIndex(at)][TIME_SLOTS.indexOf(timeSlotOf(at.getHours()))]++;
  }

  const bucket = range === 90 ? 7 : 1;
  const intensity: (IntensityPoint | null)[] = [];
  for (let offset = 0; offset < range; offset += bucket) {
    const from = shiftDate(start, offset);
    const to = shiftDate(start, Math.min(offset + bucket, range) - 1);
    const values = picked
      .filter((event) => event.date >= from && event.date <= to)
      .map((event) => event.intensity);
    intensity.push(
      values.length
        ? {
            start: from,
            end: to,
            average: round1(values.reduce((a, b) => a + b, 0) / values.length),
            min: Math.min(...values),
            max: Math.max(...values),
          }
        : null,
    );
  }

  const ears: Record<EarSide, number> = { left: 0, right: 0, both: 0 };
  for (const event of picked) ears[event.earSide]++;

  return {
    range,
    start,
    end: today,
    eventCount: picked.length,
    activeDays: new Set(picked.map((event) => event.date)).size,
    artworkCount: pickedArtworks.length,
    pendingImageCount: pickedArtworks.filter((a) => a.imagePath === null)
      .length,
    averageIntensity: picked.length
      ? round1(picked.reduce((sum, e) => sum + e.intensity, 0) / picked.length)
      : null,
    heatmap,
    intensity,
    sounds: byCountDesc(countBy(SOUND_TYPES, picked.map((e) => e.soundType))),
    ears,
    statuses: byCountDesc(
      countBy(STATUS_TAGS, picked.flatMap((e) => e.statusTags)),
    ),
  };
}

function peaks(totals: number[]): number[] {
  const most = Math.max(...totals);
  return most > 0
    ? totals.flatMap((total, index) => (total === most ? [index] : []))
    : [];
}

// One quiet sentence for the heatmap, e.g. 「夜間最常出現，週二也稍多一些。」
export function describeTiming(heatmap: number[][]): string {
  const slots = peaks(
    TIME_SLOTS.map((_, slot) => heatmap.reduce((sum, row) => sum + row[slot], 0)),
  );
  if (!slots.length) return "";
  const days = peaks(heatmap.map((row) => row.reduce((a, b) => a + b, 0)));
  const slotText = slots.map((i) => TIME_SLOT_LABELS[TIME_SLOTS[i]]).join("、");
  const dayText =
    days.length < 7
      ? `，${days.map((i) => `週${WEEKDAY_LABELS[i]}`).join("、")}也稍多一些`
      : "";
  return `${slotText}最常出現${dayText}。`;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/insights.test.ts`
Expected: PASS（全部）

- [ ] **Step 5: Commit**

```bash
git add src/insights.ts src/insights.test.ts
git commit -m "feat: summarize tinnitus records for the insights page"
```

---

### Task 3: 強度圖座標與平滑路徑

**Files:**
- Modify: `src/insights.ts`（檔尾）
- Test: `src/insights.test.ts`（檔尾）

**Interfaces:**
- Consumes: `IntensityPoint`（Task 2）
- Produces: `interface PlotPoint { x: number; y: number }`、`plotIntensity(points: (IntensityPoint | null)[], width: number, height: number, pad: number): (PlotPoint | null)[]`、`splitSegments(points: (PlotPoint | null)[]): PlotPoint[][]`、`smoothPath(points: PlotPoint[]): string`

- [ ] **Step 1: Write the failing tests** — import 加入 `plotIntensity, smoothPath, splitSegments`，檔尾加：

```ts
describe("intensity plot", () => {
  const point = (average: number) => ({
    start: "",
    end: "",
    average,
    min: average,
    max: average,
  });

  it("maps 1–5 onto the height and spreads points across the width", () => {
    expect(plotIntensity([point(5), null, point(1)], 100, 50, 10)).toEqual([
      { x: 10, y: 10 },
      null,
      { x: 90, y: 40 },
    ]);
  });

  it("centres a single point", () => {
    expect(plotIntensity([point(3)], 100, 50, 10)).toEqual([{ x: 50, y: 25 }]);
  });

  it("breaks the line where a day has no records", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 1 };
    const c = { x: 2, y: 2 };
    expect(splitSegments([a, null, b, c, null])).toEqual([[a], [b, c]]);
  });

  it("draws a horizontal-tangent cubic between points", () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe(
      "M0 0 C5 0 5 10 10 10",
    );
    expect(smoothPath([{ x: 3, y: 4 }])).toBe("M3 4");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/insights.test.ts`
Expected: FAIL（`plotIntensity` 未定義）

- [ ] **Step 3: Implement** — `src/insights.ts` 檔尾加：

```ts
export interface PlotPoint {
  x: number;
  y: number;
}

// Intensity is always on a fixed 1–5 scale; 5 sits at the top.
export function plotIntensity(
  points: (IntensityPoint | null)[],
  width: number,
  height: number,
  pad: number,
): (PlotPoint | null)[] {
  const step = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  return points.map((point, index) =>
    point
      ? {
          x: points.length > 1 ? pad + index * step : width / 2,
          y: pad + ((5 - point.average) / 4) * (height - pad * 2),
        }
      : null,
  );
}

export function splitSegments(points: (PlotPoint | null)[]): PlotPoint[][] {
  const segments: PlotPoint[][] = [];
  let current: PlotPoint[] = [];
  for (const point of points) {
    if (point) current.push(point);
    else if (current.length) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length) segments.push(current);
  return segments;
}

export function smoothPath(points: PlotPoint[]): string {
  let path = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const mid = (a.x + b.x) / 2;
    path += ` C${mid} ${a.y} ${mid} ${b.y} ${b.x} ${b.y}`;
  }
  return path;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/insights.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/insights.ts src/insights.test.ts
git commit -m "feat: plot helpers for the intensity curve"
```

---

### Task 4: 讀取資料 `getInsightsData`

**Files:**
- Modify: `src/db.ts`（`getArchive` 之後）
- Test: `src/db.test.ts`

**Interfaces:**
- Produces: `getInsightsData(): Promise<{ events: TinnitusEvent[]; artworks: DailyArtwork[] }>`（artworks 經 `normalizeArtwork`）

- [ ] **Step 1: Write the failing test** — import 加入 `getInsightsData`，檔尾加：

```ts
describe("getInsightsData", () => {
  it("returns every event and artwork", async () => {
    await addEvent(eventAt("2026-09-01T10:00"));
    await completedDay("2026-09-02");
    const data = await getInsightsData();
    expect(data.events.map((event) => event.date).sort()).toEqual([
      "2026-09-01",
      "2026-09-02",
    ]);
    expect(data.artworks.map((artwork) => artwork.date)).toEqual([
      "2026-09-02",
    ]);
  });

  it("is empty for a new database", async () => {
    expect(await getInsightsData()).toEqual({ events: [], artworks: [] });
  });
});
```

（`completeDay` 只接受早於今天的日期，因此沿用檔內既有測試的 2026-09 日期。）

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db.test.ts`
Expected: FAIL（`getInsightsData` 不是函式）

- [ ] **Step 3: Implement** — `src/db.ts` 在 `getArchive` 之後加：

```ts
// Everything the insights page summarises; image Blobs are not read.
export async function getInsightsData(): Promise<{
  events: TinnitusEvent[];
  artworks: DailyArtwork[];
}> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([EVENTS, ARTWORKS], "readonly");
    const [events, artworks] = await Promise.all([
      request<TinnitusEvent[]>(tx.objectStore(EVENTS).getAll()),
      request<DailyArtwork[]>(tx.objectStore(ARTWORKS).getAll()),
    ]);
    return { events, artworks: artworks.map(normalizeArtwork) };
  } finally {
    db.close();
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/db.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db.ts src/db.test.ts
git commit -m "feat: read all records for insights"
```

---

### Task 5: 四個展示元件與樣式

專案沒有元件測試框架（無 `@vue/test-utils`），本任務以 `vue-tsc` 型別檢查把關，畫面在 Task 6 用瀏覽器驗證。

**Files:**
- Create: `src/components/InsightsHeatmap.vue`、`src/components/IntensityTrend.vue`、`src/components/VoiceHalos.vue`、`src/components/StatusWords.vue`
- Modify: `src/style.css`（檔尾、`@media (max-width: 700px)` 之前新增「Insights」區塊）

**Interfaces:**
- Consumes: Task 1 標籤常數；Task 2／3 的 `TIME_SLOTS`、`TIME_SLOT_LABELS`、`WEEKDAY_LABELS`、`Counted`、`IntensityPoint`、`plotIntensity`、`splitSegments`、`smoothPath`。
- Produces（Task 6 使用的 props）:
  - `<InsightsHeatmap :heatmap="number[][]" />`
  - `<IntensityTrend :points="(IntensityPoint | null)[]" :start="string" :end="string" />`
  - `<VoiceHalos :sounds="Counted<SoundType>[]" :ears="Record<EarSide, number>" :total="number" />`
  - `<StatusWords :statuses="Counted<StatusTag>[]" :total="number" />`

- [ ] **Step 1: `src/components/InsightsHeatmap.vue`**

```vue
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
```

- [ ] **Step 2: `src/components/IntensityTrend.vue`**

```vue
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
</script>

<template>
  <figure class="insights-trend">
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" role="img" :aria-label="label">
      <defs>
        <linearGradient :id="`${id}-area`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#b9c9f0" stop-opacity="0.55" />
          <stop offset="1" stop-color="#e4eefa" stop-opacity="0" />
        </linearGradient>
        <linearGradient :id="`${id}-line`" x1="0" x2="1">
          <stop offset="0" stop-color="#8fa8c8" />
          <stop offset="0.5" stop-color="#a895cc" />
          <stop offset="1" stop-color="#7fb3be" />
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
          <circle :cx="point.x" :cy="point.y" r="2.2" fill="#8fa8c8" />
        </g>
      </g>
    </svg>
    <figcaption class="insights-trend-dates">
      <span>{{ shortDate(start) }}</span><span>{{ shortDate(end) }}</span>
    </figcaption>
  </figure>
</template>
```

- [ ] **Step 3: `src/components/VoiceHalos.vue`**

```vue
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
```

- [ ] **Step 4: `src/components/StatusWords.vue`**

```vue
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
```

- [ ] **Step 5: 樣式** — 在 `src/style.css` 中 `@media (max-width: 700px) {`（約第 2111 行）之前插入：

```css
/* Insights (回望): soft light, no outlines; numbers stay quiet. */
.insights-page {
  max-width: 560px;
  text-align: center;
}
.insights-range {
  margin-inline: auto;
  grid-template-columns: repeat(3, 1fr);
}
.insights-overview {
  margin: 8px 0 32px;
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  line-height: var(--leading-loose);
}
.insights-overview strong {
  color: var(--accent);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-regular);
}
.insights-overview small {
  display: block;
  color: var(--text-2);
  font-size: var(--text-xs);
}
.insights-section {
  margin-bottom: 16px;
  padding: 20px 18px 18px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 10px 30px -18px rgba(71, 100, 138, 0.35);
  text-align: start;
  animation: insights-fade 0.24s ease both;
}
.insights-section-en {
  margin: 0;
  color: var(--outline);
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-tight);
}
.insights-section h2 {
  margin-bottom: 14px;
  font-size: var(--text-md);
  font-weight: var(--weight-regular);
}
.insights-note {
  margin: 12px 0 0;
  color: var(--text-2);
  font-family: var(--font-serif);
  font-size: var(--text-xs);
  line-height: var(--leading-loose);
}
.insights-heatmap-row {
  display: grid;
  grid-template-columns: 22px repeat(5, 1fr);
  align-items: center;
  color: #8a9ab0;
  font-family: var(--font-serif);
  font-size: var(--text-xs);
}
.insights-heatmap-row [role="columnheader"] {
  padding-bottom: 4px;
  text-align: center;
}
.insights-heatmap-cell {
  height: 32px;
  display: grid;
  place-items: center;
}
.insights-dot {
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(71, 100, 138, 0.85),
    rgba(71, 100, 138, 0.3) 60%,
    rgba(71, 100, 138, 0)
  );
}
.insights-dot--empty {
  background: rgba(190, 205, 224, 0.5);
}
.insights-trend {
  margin: 0;
}
.insights-trend svg {
  display: block;
  width: 100%;
  height: auto;
}
.insights-trend-dates {
  display: flex;
  justify-content: space-between;
  color: var(--outline);
  font-family: var(--font-display);
  font-size: var(--text-sm);
}
.voice-halos {
  position: relative;
  height: 190px;
  isolation: isolate;
}
.voice-halo {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: var(--text-sm);
}
.voice-halo span {
  color: var(--text-2);
  font-family: var(--font-display);
}
/* Same glow recipe as the home record orb: bright core, no hard edge. */
.voice-halo::before,
.voice-halo::after {
  content: "";
  position: absolute;
  z-index: -1;
  border-radius: 50%;
}
.voice-halo::before {
  inset: -22%;
  background: radial-gradient(
    circle closest-side,
    var(--tint),
    color-mix(in srgb, var(--tint) 55%, transparent) 45%,
    color-mix(in srgb, var(--tint) 18%, transparent) 72%,
    transparent
  );
  animation: halo-breathe var(--orb-breathe-duration) ease-in-out infinite;
}
.voice-halo::after {
  inset: 18%;
  background: radial-gradient(
    circle closest-side,
    rgba(255, 255, 255, 0.9),
    rgba(255, 255, 255, 0.45) 55%,
    rgba(255, 255, 255, 0)
  );
}
.voice-divider {
  height: 1px;
  margin: 6px 24px 4px;
  background: linear-gradient(90deg, transparent, rgba(143, 168, 200, 0.35), transparent);
}
.ear-ripples {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
  margin-top: 10px;
}
.ear-ripple {
  width: 70px;
  height: 70px;
  fill: none;
  stroke: var(--outline);
  stroke-width: 2;
  stroke-linecap: round;
}
.ear-ripple circle {
  fill: var(--category-atmosphere);
  stroke: none;
}
.ear-ripple--right {
  transform: scaleX(-1);
}
.ear-shares {
  margin: 0;
  display: flex;
  flex-direction: column;
  color: var(--text-2);
  font-family: var(--font-serif);
  font-size: var(--text-xs);
  line-height: var(--leading-loose);
  text-align: center;
}
.status-words {
  margin: 0;
  padding: 4px 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: baseline;
  gap: 10px 12px;
}
.status-word {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  font-family: var(--font-serif);
}
.status-word span {
  margin-left: 6px;
  color: var(--outline);
  font-family: var(--font-display);
  font-size: var(--text-sm);
}
.status-word--1 { color: #8ea0b8; font-size: var(--text-sm); }
.status-word--2 { color: #6f86a5; font-size: var(--text-md); }
.status-word--3 { color: #5a7499; font-size: var(--text-lg); }
.status-word--4 { color: var(--accent); font-size: var(--text-xl); }
.insights-section + .insights-note,
.status-words + .insights-note {
  text-align: center;
}
.insights-works {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.insights-works a {
  flex: 1;
  min-height: 44px;
  padding: 16px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 10px 30px -18px rgba(71, 100, 138, 0.35);
  color: var(--text-2);
  font-size: var(--text-xs);
}
.insights-works strong {
  display: block;
  color: var(--accent);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: var(--weight-regular);
}
.insights-disclaimer {
  color: #9aa9bc;
  font-size: var(--text-xs);
  line-height: var(--leading-loose);
}
@keyframes insights-fade {
  from { opacity: 0; transform: translateY(4px); }
}
@keyframes halo-breathe {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.05); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .insights-section,
  .voice-halo::before {
    animation: none;
  }
}
```

（`--outline`＝`#8fa8c8`、`--text-2`＝次要文字色，皆已在 `:root` 定義。）

- [ ] **Step 6: Type check**

Run: `npx vue-tsc --noEmit`
Expected: 無錯誤（元件尚未被引用也應通過）

- [ ] **Step 7: Commit**

```bash
git add src/components/InsightsHeatmap.vue src/components/IntensityTrend.vue src/components/VoiceHalos.vue src/components/StatusWords.vue src/style.css
git commit -m "feat: insights charts as soft light components"
```

---

### Task 6: 回望頁、路由、底部導覽

**Files:**
- Create: `src/views/InsightsView.vue`
- Modify: `src/main.ts`（routes 陣列）
- Modify: `src/App.vue`（`<nav class="bottom-nav">` 內，收藏之後）

**Interfaces:**
- Consumes: `getInsightsData`（Task 4）、`summarizeRange`、`describeTiming`、`parseInsightRange`、`INSIGHT_RANGES`（Task 2）、Task 5 四個元件。

- [ ] **Step 1: `src/views/InsightsView.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import InsightsHeatmap from "../components/InsightsHeatmap.vue";
import IntensityTrend from "../components/IntensityTrend.vue";
import StatusWords from "../components/StatusWords.vue";
import VoiceHalos from "../components/VoiceHalos.vue";
import { getInsightsData } from "../db";
import { localDateKey, type DailyArtwork, type TinnitusEvent } from "../domain";
import {
  INSIGHT_RANGES,
  describeTiming,
  parseInsightRange,
  summarizeRange,
  type InsightRange,
} from "../insights";

const route = useRoute();
const router = useRouter();
const events = ref<TinnitusEvent[]>([]);
const artworks = ref<DailyArtwork[]>([]);
const error = ref("");
const loading = ref(true);
const today = localDateKey(new Date());

onMounted(async () => {
  try {
    ({ events: events.value, artworks: artworks.value } =
      await getInsightsData());
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "無法讀取紀錄。";
  } finally {
    loading.value = false;
  }
});

// The range lives in the URL (`/insights`, `/insights?range=7`).
const range = computed(() => parseInsightRange(route.query.range));
function show(next: InsightRange) {
  void router.replace({ query: next === 30 ? {} : { range: String(next) } });
}
const summary = computed(() =>
  summarizeRange(events.value, artworks.value, range.value, today),
);
const enough = computed(() => summary.value.eventCount >= 3);
const timing = computed(() => describeTiming(summary.value.heatmap));
</script>

<template>
  <main class="page insights-page">
    <p class="eyebrow">LOOKING BACK</p>
    <h1>回望</h1>
    <div class="archive-switch insights-range" role="group" aria-label="回望期間">
      <button
        v-for="days in INSIGHT_RANGES"
        :key="days"
        type="button"
        :aria-pressed="range === days"
        @click="show(days)"
      >
        {{ days }} 天
      </button>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">正在讀取…</p>
    <template v-else-if="!error">
      <p class="insights-overview">
        這 {{ range }} 天裡<br />
        有 <strong>{{ summary.activeDays }}</strong> 天留下了殘響<br />
        共 <strong>{{ summary.eventCount }}</strong> 段<template
          v-if="summary.artworkCount"
          >，化成 <strong>{{ summary.artworkCount }}</strong> 幅意象</template
        >
        <small v-if="enough && summary.averageIntensity !== null">
          平均強度約 {{ summary.averageIntensity }}
        </small>
      </p>

      <p v-if="!enough" class="insights-note">資料還不多，先安心記錄就好。</p>
      <template v-else>
        <section class="insights-section">
          <p class="insights-section-en">when it lingers</p>
          <h2>什麼時候出現</h2>
          <InsightsHeatmap :heatmap="summary.heatmap" />
          <p class="insights-note">{{ timing }}</p>
        </section>

        <section class="insights-section">
          <p class="insights-section-en">its weight</p>
          <h2>強度的樣子</h2>
          <IntensityTrend
            :points="summary.intensity"
            :start="summary.start"
            :end="summary.end"
          />
        </section>

        <section class="insights-section">
          <p class="insights-section-en">its voice</p>
          <h2>聲音與耳側</h2>
          <VoiceHalos
            :sounds="summary.sounds"
            :ears="summary.ears"
            :total="summary.eventCount"
          />
        </section>

        <section v-if="summary.statuses.length" class="insights-section">
          <p class="insights-section-en">what was near</p>
          <h2>常一起被記下的</h2>
          <StatusWords
            :statuses="summary.statuses"
            :total="summary.eventCount"
          />
        </section>

        <div class="insights-works">
          <RouterLink to="/gallery">
            <strong>{{ summary.artworkCount }}</strong>已完成的意象 ›
          </RouterLink>
          <RouterLink to="/gallery?view=calendar">
            <strong>{{ summary.pendingImageCount }}</strong>等待一張圖 ›
          </RouterLink>
        </div>
      </template>
    </template>
    <p class="insights-disclaimer">
      Aftertone 為個人紀錄與創作工具<br />不提供醫療診斷或治療建議
    </p>
  </main>
</template>
```


- [ ] **Step 2: 路由** — `src/main.ts` 加入 import `import InsightsView from "./views/InsightsView.vue";`，並在 routes 陣列 `/gallery` 之後加：

```ts
    { path: "/insights", component: InsightsView },
```

- [ ] **Step 3: 底部導覽** — `src/App.vue` 中收藏的 `</RouterLink>` 之後加：

```vue
        <RouterLink to="/insights">
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 7.5a6 6 0 0 1 0 9"/><path d="M12.5 5a9.5 9.5 0 0 1 0 14"/><circle cx="5.5" cy="12" r="1.3"/></svg>
          回望
        </RouterLink>
```

- [ ] **Step 4: Tests, type check, build**

Run: `npm test` then `npm run build`
Expected: 測試全過；build 成功、無型別錯誤。

- [ ] **Step 5: 瀏覽器驗證**（用 preview_start `aftertone-dev`）
  1. 開 `/insights`，375 px（mobile preset）：四項導覽不換行、無水平捲動（`document.documentElement.scrollWidth <= innerWidth`）。
  2. 少於 3 段：只看到概覽句與「資料還不多，先安心記錄就好。」。
  3. 到 `/record` 新增至少 3 段不同時段／聲音／耳側／狀態的紀錄，回 `/insights`：五個區塊都出現，光暈不超出卡片、主控台無錯誤。
  4. 切 7／90 天：URL 變成 `?range=7`／`?range=90`，重新整理後保留；30 天時 URL 無 query。
  5. Tab 鍵能走到期間按鈕與兩個作品連結，焦點可見。
  6. 768 px 與桌面寬度各截圖一次。

- [ ] **Step 6: Commit**

```bash
git add src/views/InsightsView.vue src/main.ts src/App.vue
git commit -m "feat: add 回望 insights page to the bottom nav"
```
