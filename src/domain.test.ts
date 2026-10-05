import { describe, expect, it } from "vitest";
import { reactive } from "vue";
import {
  CORE_CATEGORIES,
  DETAIL_CATEGORIES,
  buildMonthGrid,
  combineDateTime,
  composePrompt,
  createEvent,
  displayRatio,
  distributeMasonry,
  formatDateLabel,
  formatMonthLabel,
  formatOccurredDay,
  formatOccurredTime,
  fragmentFor,
  hasCategoryArt,
  localDateKey,
  nextCategory,
  presetOccurredAt,
  shiftMonth,
  toOccurredValue,
  validateEvent,
  validateImageFile,
  type ArchiveDay,
  type DailyArtwork,
  type NewEventInput,
  type PromptFragment,
  type TinnitusEvent,
} from "./domain";

const input: NewEventInput = {
  occurredAt: "2026-10-02T22:14",
  earSide: "right",
  intensity: 3,
  soundType: "high_pitch",
  durationLevel: "under_30s",
  statusTags: ["after_work"],
  note: "",
};
const event: TinnitusEvent = {
  id: "event-1",
  date: "2026-10-02",
  occurredAt: "2026-10-02T14:14:00.000Z",
  earSide: "right",
  intensity: 3,
  soundType: "high_pitch",
  durationLevel: "under_30s",
  statusTags: ["after_work"],
  note: "",
  createdAt: "",
  updatedAt: "",
};
function fragment(category: PromptFragment["category"]): PromptFragment {
  return {
    id: category,
    eventId: "event-1",
    date: "2026-10-02",
    category,
    zh: category,
    en: category,
    createdAt: "",
  };
}

describe("daily prompt rules", () => {
  it("uses each core category once before adding details", () => {
    const seen: PromptFragment[] = [];
    for (let index = 0; index < 7; index++) {
      const category = nextCategory(seen, () => 0);
      expect(CORE_CATEGORIES).toContain(category);
      seen.push(fragment(category));
    }
    expect(new Set(seen.map((item) => item.category)).size).toBe(7);
    expect(nextCategory(seen, () => 0)).toBe("light");
  });

  it("uses each detail category once, then the least-drawn categories", () => {
    const seen = CORE_CATEGORIES.map((category) => fragment(category));
    for (let i = 0; i < 3; i++) {
      const category = nextCategory(seen, () => 0.99);
      expect(DETAIL_CATEGORIES).toContain(category);
      seen.push(fragment(category));
    }
    expect(new Set(seen.map((item) => item.category)).size).toBe(10);
    seen.push(fragment("color"));
    expect(nextCategory(seen, () => 0.99)).not.toBe("color");
  });

  it("prefers an undrawn variant and stacks repeated categories", () => {
    const first = { ...fragment("clothing"), ...fragmentFor("clothing") };
    const second = {
      ...fragment("clothing"),
      ...fragmentFor("clothing", [first]),
      createdAt: "z",
    };
    expect(second.zh).not.toBe(first.zh);
    const prompt = composePrompt([second, first, { ...first, createdAt: "y" }]);
    expect(prompt.zh).toContain(`${first.zh}，${second.zh}`);
    expect(prompt.zh.split(first.zh).length).toBe(2);
  });

  it("rejects future dates and invalid intensity", () => {
    expect(validateEvent(input, new Date("2026-10-03T12:00:00"))).toBe(
      "2026-10-02",
    );
    expect(() =>
      validateEvent(
        { ...input, intensity: 0 },
        new Date("2026-10-03T12:00:00"),
      ),
    ).toThrow();
    expect(() =>
      validateEvent(
        { ...input, occurredAt: "2026-10-05T10:00" },
        new Date("2026-10-03T12:00:00"),
      ),
    ).toThrow();
  });

  it("keeps a coherent bilingual prompt with missing categories", () => {
    const piece = { ...fragment("color"), ...fragmentFor("color") };
    const prompt = composePrompt([piece]);
    expect(prompt.zh).toContain(piece.zh);
    expect(prompt.en).toContain(piece.en);
    expect(prompt.zh).toContain("一位安靜的人物");
  });

  it("uses the device local calendar date", () => {
    const date = new Date(2026, 9, 2, 23, 59);
    expect(localDateKey(date)).toBe("2026-10-02");
  });

  it("formats a date key without timezone conversion", () => {
    expect(formatDateLabel("2026-10-04")).toBe("2026/10/04");
  });

  it("gives category artwork to core categories only", () => {
    for (const category of CORE_CATEGORIES)
      expect(hasCategoryArt(category)).toBe(true);
    for (const category of DETAIL_CATEGORIES)
      expect(hasCategoryArt(category)).toBe(false);
  });

  it("stores a plain cloneable event even when form tags are reactive", () => {
    const form = reactive({ ...input, statusTags: ["fatigue" as const] });
    const stored = createEvent(
      form,
      "2026-10-02",
      "event-2",
      "2026-10-02T14:14:00Z",
    );
    expect(structuredClone(stored).statusTags).toEqual(["fatigue"]);
  });
});

function artworkFor(
  date: string,
  image: { width: number; height: number } | null = null,
): DailyArtwork {
  return {
    id: `artwork-${date}`,
    date,
    title: "今日殘響",
    draftZh: "",
    draftEn: "",
    finalZh: "",
    finalEn: "",
    imagePath: image ? `local:${date}` : null,
    imageSync: image ? "local" : null,
    imageWidth: image?.width ?? null,
    imageHeight: image?.height ?? null,
    completedAt: "",
    updatedAt: "",
  };
}

describe("archive calendar", () => {
  it("starts on Sunday with no leading blanks when the month starts on Sunday", () => {
    // 2026-11-01 is a Sunday.
    const grid = buildMonthGrid("2026-11", [], "2026-10-04");
    expect(grid[0].date).toBe("2026-11-01");
    expect(grid.filter((cell) => cell.date)).toHaveLength(30);
  });

  it("adds six leading blanks when the month starts on Saturday", () => {
    // 2026-08-01 is a Saturday.
    const grid = buildMonthGrid("2026-08", [], "2026-10-04");
    expect(grid.slice(0, 6).every((cell) => cell.date === null)).toBe(true);
    expect(grid.slice(0, 6).every((cell) => cell.state === "empty")).toBe(true);
    expect(grid[6].date).toBe("2026-08-01");
    expect(grid).toHaveLength(6 + 31);
  });

  it("derives each day state from the archive", () => {
    const archive: ArchiveDay[] = [
      {
        date: "2026-10-03",
        eventCount: 2,
        artwork: artworkFor("2026-10-03", { width: 600, height: 800 }),
      },
      { date: "2026-10-02", eventCount: 1, artwork: artworkFor("2026-10-02") },
      { date: "2026-10-01", eventCount: 5, artwork: null },
    ];
    const grid = buildMonthGrid("2026-10", archive, "2026-10-20");
    const cell = (date: string) => grid.find((item) => item.date === date)!;
    expect(cell("2026-10-03").state).toBe("artwork");
    expect(cell("2026-10-03").eventCount).toBe(2);
    expect(cell("2026-10-02").state).toBe("pending");
    expect(cell("2026-10-01").state).toBe("open");
    expect(cell("2026-10-01").eventCount).toBe(5);
    expect(cell("2026-10-05").state).toBe("empty");
    expect(grid.some((item) => item.isToday)).toBe(true);
    expect(cell("2026-10-20").isToday).toBe(true);
    expect(cell("2026-10-20").state).toBe("empty");
  });

  it("keeps today's records visible as an open day", () => {
    const archive: ArchiveDay[] = [
      { date: "2026-10-04", eventCount: 2, artwork: null },
    ];
    const grid = buildMonthGrid("2026-10", archive, "2026-10-04");
    const today = grid.find((item) => item.date === "2026-10-04")!;
    expect(today.isToday).toBe(true);
    expect(today.state).toBe("open");
    expect(today.eventCount).toBe(2);
    expect(grid.filter((item) => item.isToday)).toHaveLength(1);
  });

  it("labels and shifts months", () => {
    expect(formatMonthLabel("2026-10")).toBe("2026 · 十月");
    expect(formatMonthLabel("2027-01")).toBe("2027 · 一月");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("archive masonry", () => {
  it("places items in order into the shortest column", () => {
    const ratios: Record<string, number> = { a: 2, b: 1, c: 1, d: 0.5 };
    const columns = distributeMasonry(
      ["a", "b", "c", "d"],
      2,
      (item) => ratios[item],
    );
    // a → col 0 (2), b → col 1 (1), c → col 1 (2), d → tie → col 0.
    expect(columns).toEqual([
      ["a", "d"],
      ["b", "c"],
    ]);
  });

  it("breaks height ties towards the leftmost column", () => {
    const columns = distributeMasonry(["a", "b", "c", "d"], 3, () => 1);
    expect(columns).toEqual([["a", "d"], ["b"], ["c"]]);
  });

  it("returns empty columns when there is nothing to place", () => {
    expect(distributeMasonry([], 3, () => 1)).toEqual([[], [], []]);
  });

  it("clamps extreme image ratios between 1:2 and 2:1", () => {
    expect(displayRatio(artworkFor("2026-10-01"))).toBe(1);
    expect(
      displayRatio(artworkFor("2026-10-01", { width: 600, height: 900 })),
    ).toBe(1.5);
    expect(
      displayRatio(artworkFor("2026-10-01", { width: 100, height: 900 })),
    ).toBe(2);
    expect(
      displayRatio(artworkFor("2026-10-01", { width: 900, height: 100 })),
    ).toBe(0.5);
  });
});

describe("image file validation", () => {
  it("accepts JPG, PNG and WebP", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"])
      expect(validateImageFile({ type, size: 1000 })).toEqual({ ok: true });
  });

  it("rejects other formats", () => {
    for (const type of ["image/gif", "image/heic", "application/pdf", ""])
      expect(validateImageFile({ type, size: 1000 })).toEqual({
        ok: false,
        reason: "type",
      });
  });

  it("warns when a file is larger than 4 MB", () => {
    expect(
      validateImageFile({ type: "image/png", size: 4 * 1024 * 1024 }),
    ).toEqual({ ok: true });
    expect(
      validateImageFile({ type: "image/png", size: 4 * 1024 * 1024 + 1 }),
    ).toEqual({ ok: true, warning: "oversize" });
  });
});

describe("occurred-at field", () => {
  const now = new Date(2026, 9, 5, 8, 43, 27);

  it("formats a local value in the datetime-local shape", () => {
    expect(toOccurredValue(now)).toBe("2026-10-05T08:43");
    expect(toOccurredValue(new Date(2026, 0, 2, 3, 4))).toBe(
      "2026-01-02T03:04",
    );
  });

  it("offsets presets from the moment they are chosen", () => {
    expect(presetOccurredAt("now", now)).toBe("2026-10-05T08:43");
    expect(presetOccurredAt("15m", now)).toBe("2026-10-05T08:28");
    expect(presetOccurredAt("1h", now)).toBe("2026-10-05T07:43");
  });

  it("crosses midnight back to the previous day", () => {
    const justAfterMidnight = new Date(2026, 9, 5, 0, 30);
    expect(presetOccurredAt("1h", justAfterMidnight)).toBe("2026-10-04T23:30");
    expect(presetOccurredAt("15m", new Date(2026, 0, 1, 0, 5))).toBe(
      "2025-12-31T23:50",
    );
  });

  it("labels today, yesterday and other days", () => {
    expect(formatOccurredDay("2026-10-05T08:43", now)).toBe(
      "今天 · 10月5日（一）",
    );
    expect(formatOccurredDay("2026-10-04T23:30", now)).toBe(
      "昨天 · 10月4日（日）",
    );
    expect(formatOccurredDay("2026-10-02T12:00", now)).toBe("10月2日（五）");
  });

  it("adds the year only outside the current year", () => {
    const newYear = new Date(2026, 0, 1, 0, 10);
    expect(formatOccurredDay("2025-12-31T23:55", newYear)).toBe(
      "昨天 · 2025年12月31日（三）",
    );
    expect(formatOccurredDay("2025-12-25T10:00", newYear)).toBe(
      "2025年12月25日（四）",
    );
  });

  it("shows the 24-hour time", () => {
    expect(formatOccurredTime("2026-10-05T20:07")).toBe("20:07");
  });

  it("combines date and time inputs into the stored shape", () => {
    expect(combineDateTime("2026-10-03", "21:15", now)).toBe(
      "2026-10-03T21:15",
    );
    expect(combineDateTime("2026-10-03", "21:15:30", now)).toBe(
      "2026-10-03T21:15",
    );
  });

  it("clamps future times to now", () => {
    expect(combineDateTime("2026-10-05", "09:00", now)).toBe(
      "2026-10-05T08:43",
    );
    expect(combineDateTime("2026-10-06", "01:00", now)).toBe(
      "2026-10-05T08:43",
    );
    expect(combineDateTime("2026-10-05", "08:43", now)).toBe(
      "2026-10-05T08:43",
    );
  });
});
