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
