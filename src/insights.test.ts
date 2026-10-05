import { describe, expect, it } from "vitest";
import type { DailyArtwork, TinnitusEvent } from "./domain";
import {
  describeTiming,
  parseInsightRange,
  plotIntensity,
  shiftDate,
  smoothPath,
  splitSegments,
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

describe("intensity plot", () => {
  const point = (average: number) => ({
    start: "",
    end: "",
    average,
    min: average,
    max: average,
  });

  it("returns an empty path for no points", () => {
    expect(smoothPath([])).toBe("");
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
