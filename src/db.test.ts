import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { reactive } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addEvent,
  completeDay,
  getArchive,
  getArtworkImage,
  getDay,
  getInsightsData,
  removeArtworkImage,
  setArtworkImage,
} from "./db";
import type { NewEventInput } from "./domain";
import { localDateKey } from "./domain";

// Each test starts from an empty database.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => {
  vi.restoreAllMocks();
});

function eventAt(occurredAt: string): NewEventInput {
  return {
    occurredAt,
    earSide: "left",
    intensity: 3,
    soundType: "hum",
    durationLevel: "brief",
    statusTags: [],
    note: "",
  };
}

async function completedDay(date: string, events = 1) {
  for (let index = 0; index < events; index++)
    await addEvent(eventAt(`${date}T1${index}:00`));
  return completeDay(date, "測試", "草稿", "draft", "定稿", "final");
}

function imageFile(content: string, name = "art.png") {
  return new File([content], name, { type: "image/png" });
}

describe("record storage", () => {
  it("atomically saves an event and fragment from reactive form input", async () => {
    const now = new Date();
    const input = reactive<NewEventInput>({
      occurredAt: `${localDateKey(now)}T12:00`,
      earSide: "both",
      intensity: 2,
      soundType: "high_pitch",
      durationLevel: "brief",
      statusTags: ["fatigue"],
      note: "  test  ",
    });

    const saved = await addEvent(input);
    const day = await getDay(saved.event.date);

    expect(day.events).toHaveLength(1);
    expect(day.events[0].statusTags).toEqual(["fatigue"]);
    expect(day.events[0].note).toBe("test");
    expect(day.fragments).toHaveLength(1);
    expect(day.fragments[0].eventId).toBe(day.events[0].id);
  });
});

describe("archive", () => {
  it("counts records per day and lists days newest first", async () => {
    await completedDay("2026-09-01", 2);
    await addEvent(eventAt("2026-09-03T08:00"));
    await addEvent(eventAt("2026-09-03T09:00"));
    await addEvent(eventAt("2026-09-03T10:00"));

    const archive = await getArchive();

    expect(archive.map((day) => day.date)).toEqual([
      "2026-09-03",
      "2026-09-01",
    ]);
    expect(archive[0]).toMatchObject({ eventCount: 3, artwork: null });
    expect(archive[1].eventCount).toBe(2);
    expect(archive[1].artwork?.title).toBe("測試");
    expect(archive[1].artwork?.imageSync).toBeNull();
  });
});

describe("artwork images", () => {
  it("stores an image and marks the artwork as local", async () => {
    await completedDay("2026-09-01");

    const artwork = await setArtworkImage("2026-09-01", imageFile("first"), {
      width: 600,
      height: 900,
    });

    expect(artwork).toMatchObject({
      imagePath: "local:2026-09-01",
      imageSync: "local",
      imageWidth: 600,
      imageHeight: 900,
    });
    expect((await getDay("2026-09-01")).artwork).toEqual(artwork);
    const image = await getArtworkImage("2026-09-01");
    expect(image).toMatchObject({
      date: "2026-09-01",
      fileName: "art.png",
      mimeType: "image/png",
      size: 5,
      width: 600,
      height: 900,
    });
    expect(await image!.blob.text()).toBe("first");
  });

  it("refuses an image for a day without an artwork", async () => {
    await addEvent(eventAt("2026-09-02T10:00"));

    await expect(
      setArtworkImage("2026-09-02", imageFile("x"), { width: 1, height: 1 }),
    ).rejects.toThrow();
    expect(await getArtworkImage("2026-09-02")).toBeNull();
  });

  it("overwrites the image when replacing", async () => {
    await completedDay("2026-09-01");
    await setArtworkImage("2026-09-01", imageFile("first"), {
      width: 600,
      height: 900,
    });

    await setArtworkImage("2026-09-01", imageFile("second", "new.png"), {
      width: 800,
      height: 400,
    });

    const image = await getArtworkImage("2026-09-01");
    expect(image?.fileName).toBe("new.png");
    expect(await image!.blob.text()).toBe("second");
    expect((await getDay("2026-09-01")).artwork).toMatchObject({
      imageWidth: 800,
      imageHeight: 400,
    });
  });

  it("keeps the old image when a replacement fails part-way", async () => {
    await completedDay("2026-09-01");
    await setArtworkImage("2026-09-01", imageFile("first"), {
      width: 600,
      height: 900,
    });
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["put"]>
    ) {
      // The image write goes through; the artwork update then fails.
      if (this.name === "artworks")
        throw new DOMException("simulated failure", "UnknownError");
      return put.apply(this, args);
    });

    await expect(
      setArtworkImage("2026-09-01", imageFile("second"), {
        width: 800,
        height: 400,
      }),
    ).rejects.toThrow("simulated failure");
    vi.restoreAllMocks();

    const image = await getArtworkImage("2026-09-01");
    expect(await image!.blob.text()).toBe("first");
    expect((await getDay("2026-09-01")).artwork).toMatchObject({
      imageWidth: 600,
      imageHeight: 900,
    });
  });

  it("removes only the image and keeps the artwork", async () => {
    await completedDay("2026-09-01");
    await setArtworkImage("2026-09-01", imageFile("first"), {
      width: 600,
      height: 900,
    });

    const artwork = await removeArtworkImage("2026-09-01");

    expect(await getArtworkImage("2026-09-01")).toBeNull();
    const day = await getDay("2026-09-01");
    expect(day.artwork).toEqual(artwork);
    expect(day.artwork).toMatchObject({
      title: "測試",
      finalZh: "定稿",
      imagePath: null,
      imageSync: null,
      imageWidth: null,
      imageHeight: null,
    });
    expect(day.events).toHaveLength(1);
  });
});

describe("schema migration", () => {
  it("keeps version 1 data when upgrading to version 2", async () => {
    const v1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open("aftertone", 1);
      opening.onupgradeneeded = () => {
        const db = opening.result;
        db.createObjectStore("events", { keyPath: "id" }).createIndex(
          "date",
          "date",
        );
        db.createObjectStore("fragments", { keyPath: "id" }).createIndex(
          "date",
          "date",
        );
        db.createObjectStore("artworks", { keyPath: "date" });
      };
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error);
    });
    const tx = v1.transaction(["events", "fragments", "artworks"], "readwrite");
    tx.objectStore("events").add({
      id: "event-1",
      date: "2026-09-01",
      occurredAt: "2026-09-01T02:00:00.000Z",
      earSide: "left",
      intensity: 2,
      soundType: "hum",
      durationLevel: "brief",
      statusTags: [],
      note: "",
      createdAt: "",
      updatedAt: "",
    });
    tx.objectStore("fragments").add({
      id: "fragment-1",
      eventId: "event-1",
      date: "2026-09-01",
      category: "person",
      zh: "人物",
      en: "figure",
      createdAt: "",
    });
    // Version 1 artworks have no image sync or size fields.
    tx.objectStore("artworks").add({
      id: "artwork-1",
      date: "2026-09-01",
      title: "舊作品",
      draftZh: "",
      draftEn: "",
      finalZh: "中",
      finalEn: "en",
      imagePath: null,
      completedAt: "",
      updatedAt: "",
    });
    await new Promise((resolve) => (tx.oncomplete = resolve));
    v1.close();

    const day = await getDay("2026-09-01");

    expect(day.events.map((event) => event.id)).toEqual(["event-1"]);
    expect(day.fragments.map((fragment) => fragment.id)).toEqual([
      "fragment-1",
    ]);
    expect(day.artwork).toMatchObject({
      title: "舊作品",
      imagePath: null,
      imageSync: null,
      imageWidth: null,
      imageHeight: null,
    });
    expect(await getArtworkImage("2026-09-01")).toBeNull();
    expect((await getArchive())[0].eventCount).toBe(1);
  });
});

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
