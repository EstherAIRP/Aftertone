import type {
  ArchiveDay,
  ArtworkImage,
  DailyArtwork,
  NewEventInput,
  PromptFragment,
  TinnitusEvent,
} from "./domain";
import {
  createEvent,
  fragmentFor,
  localDateKey,
  nextCategory,
  validateEvent,
} from "./domain";

const DB_NAME = "aftertone";
const VERSION = 2;
const EVENTS = "events";
const FRAGMENTS = "fragments";
const ARTWORKS = "artworks";
const IMAGES = "images";

function request<T>(operation: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () =>
      reject(operation.error ?? new Error("本機資料儲存失敗。"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  const done = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("本機資料儲存失敗。"));
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("本機資料儲存失敗。"));
  });
  void done.catch(() => undefined);
  return done;
}

// Rolls back writes already queued in a transaction; a no-op once it has
// finished or aborted on its own.
function abortQuietly(transaction: IDBTransaction) {
  try {
    transaction.abort();
  } catch {
    // Already finished.
  }
}

// Artworks saved before schema v2 have no image sync or size fields.
function normalizeArtwork(artwork: DailyArtwork): DailyArtwork {
  return {
    ...artwork,
    imageSync: artwork.imageSync ?? null,
    imageWidth: artwork.imageWidth ?? null,
    imageHeight: artwork.imageHeight ?? null,
  };
}

export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DB_NAME, VERSION);
    // Each step migrates one version, so existing data is never recreated.
    opening.onupgradeneeded = (event) => {
      const db = opening.result;
      if (event.oldVersion < 1) {
        db.createObjectStore(EVENTS, { keyPath: "id" }).createIndex(
          "date",
          "date",
        );
        db.createObjectStore(FRAGMENTS, { keyPath: "id" }).createIndex(
          "date",
          "date",
        );
        db.createObjectStore(ARTWORKS, { keyPath: "date" });
      }
      if (event.oldVersion < 2)
        db.createObjectStore(IMAGES, { keyPath: "date" });
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () =>
      reject(opening.error ?? new Error("無法開啟本機資料庫。"));
    opening.onblocked = () =>
      reject(new Error("請關閉其他開啟的 Aftertone 分頁後重試。"));
  });
}

export async function getDay(date: string): Promise<{
  events: TinnitusEvent[];
  fragments: PromptFragment[];
  artwork: DailyArtwork | null;
}> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([EVENTS, FRAGMENTS, ARTWORKS], "readonly");
    const result = await Promise.all([
      request<TinnitusEvent[]>(
        tx.objectStore(EVENTS).index("date").getAll(date),
      ),
      request<PromptFragment[]>(
        tx.objectStore(FRAGMENTS).index("date").getAll(date),
      ),
      request<DailyArtwork | undefined>(tx.objectStore(ARTWORKS).get(date)),
    ]);
    return {
      events: result[0].sort((a, b) =>
        a.occurredAt.localeCompare(b.occurredAt),
      ),
      fragments: result[1],
      artwork: result[2] ? normalizeArtwork(result[2]) : null,
    };
  } finally {
    db.close();
  }
}

export async function getAllDates(): Promise<string[]> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([EVENTS, ARTWORKS], "readonly");
    const [events, artworks] = await Promise.all([
      request<TinnitusEvent[]>(tx.objectStore(EVENTS).getAll()),
      request<DailyArtwork[]>(tx.objectStore(ARTWORKS).getAll()),
    ]);
    return [
      ...new Set([
        ...events.map((event) => event.date),
        ...artworks.map((artwork) => artwork.date),
      ]),
    ]
      .sort()
      .reverse();
  } finally {
    db.close();
  }
}

// Every date with records or an artwork, newest first. Image Blobs are not read.
export async function getArchive(): Promise<ArchiveDay[]> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([EVENTS, ARTWORKS], "readonly");
    const [events, artworks] = await Promise.all([
      request<TinnitusEvent[]>(tx.objectStore(EVENTS).getAll()),
      request<DailyArtwork[]>(tx.objectStore(ARTWORKS).getAll()),
    ]);
    const days = new Map<string, ArchiveDay>();
    const dayFor = (date: string) => {
      const day = days.get(date) ?? { date, eventCount: 0, artwork: null };
      days.set(date, day);
      return day;
    };
    for (const event of events) dayFor(event.date).eventCount++;
    for (const artwork of artworks)
      dayFor(artwork.date).artwork = normalizeArtwork(artwork);
    return [...days.values()].sort((a, b) => b.date.localeCompare(a.date));
  } finally {
    db.close();
  }
}

export async function getArtworkImage(
  date: string,
): Promise<ArtworkImage | null> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(IMAGES, "readonly");
    return (
      (await request<ArtworkImage | undefined>(
        tx.objectStore(IMAGES).get(date),
      )) ?? null
    );
  } finally {
    db.close();
  }
}

// Adds or replaces the image of a completed day. The image and the artwork
// update are written in one transaction, so a failed replacement keeps the
// previous image.
export async function setArtworkImage(
  date: string,
  file: File,
  size: { width: number; height: number },
): Promise<DailyArtwork> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([ARTWORKS, IMAGES], "readwrite");
    const done = transactionDone(tx);
    try {
      const stored = await request<DailyArtwork | undefined>(
        tx.objectStore(ARTWORKS).get(date),
      );
      if (!stored) throw new Error("請先完成這一天的意象，再加入圖片。");
      const now = new Date().toISOString();
      const image: ArtworkImage = {
        date,
        blob: file,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        width: size.width,
        height: size.height,
        createdAt: now,
      };
      const artwork: DailyArtwork = {
        ...normalizeArtwork(stored),
        imagePath: `local:${date}`,
        imageSync: "local",
        imageWidth: size.width,
        imageHeight: size.height,
        updatedAt: now,
      };
      tx.objectStore(IMAGES).put(image);
      tx.objectStore(ARTWORKS).put(artwork);
      await done;
      return artwork;
    } catch (cause) {
      abortQuietly(tx);
      throw cause;
    }
  } finally {
    db.close();
  }
}

// Deletes only the image; the artwork, prompt and records stay.
export async function removeArtworkImage(date: string): Promise<DailyArtwork> {
  const db = await openDatabase();
  try {
    const tx = db.transaction([ARTWORKS, IMAGES], "readwrite");
    const done = transactionDone(tx);
    try {
      const stored = await request<DailyArtwork | undefined>(
        tx.objectStore(ARTWORKS).get(date),
      );
      if (!stored) throw new Error("找不到這一天的作品。");
      const artwork: DailyArtwork = {
        ...normalizeArtwork(stored),
        imagePath: null,
        imageSync: null,
        imageWidth: null,
        imageHeight: null,
        updatedAt: new Date().toISOString(),
      };
      tx.objectStore(IMAGES).delete(date);
      tx.objectStore(ARTWORKS).put(artwork);
      await done;
      return artwork;
    } catch (cause) {
      abortQuietly(tx);
      throw cause;
    }
  } finally {
    db.close();
  }
}

export async function addEvent(
  input: NewEventInput,
): Promise<{ event: TinnitusEvent; fragment: PromptFragment }> {
  const date = validateEvent(input);
  const db = await openDatabase();
  try {
    const tx = db.transaction([EVENTS, FRAGMENTS, ARTWORKS], "readwrite");
    const done = transactionDone(tx);
    const artwork = await request<DailyArtwork | undefined>(
      tx.objectStore(ARTWORKS).get(date),
    );
    if (artwork) throw new Error("已完成的日期不能新增紀錄。");
    const existing = await request<PromptFragment[]>(
      tx.objectStore(FRAGMENTS).index("date").getAll(date),
    );
    const now = new Date().toISOString();
    const event = createEvent(input, date, crypto.randomUUID(), now);
    const category = nextCategory(existing);
    const fragment: PromptFragment = {
      id: crypto.randomUUID(),
      eventId: event.id,
      date,
      category,
      ...fragmentFor(category, existing),
      createdAt: now,
    };
    tx.objectStore(EVENTS).add(event);
    tx.objectStore(FRAGMENTS).add(fragment);
    await done;
    return { event, fragment };
  } finally {
    db.close();
  }
}

export async function completeDay(
  date: string,
  title: string,
  draftZh: string,
  draftEn: string,
  finalZh: string,
  finalEn: string,
): Promise<DailyArtwork> {
  if (date >= localDateKey(new Date()))
    throw new Error("日期結束後才能完成意象。");
  const db = await openDatabase();
  try {
    const tx = db.transaction([EVENTS, ARTWORKS], "readwrite");
    const done = transactionDone(tx);
    const [events, existing] = await Promise.all([
      request<TinnitusEvent[]>(
        tx.objectStore(EVENTS).index("date").getAll(date),
      ),
      request<DailyArtwork | undefined>(tx.objectStore(ARTWORKS).get(date)),
    ]);
    if (existing || !events.length || !finalZh.trim() || !finalEn.trim()) {
      throw new Error(
        existing
          ? "這天的意象已完成。"
          : "請確認有紀錄且中英文 Prompt 均已填寫。",
      );
    }
    const now = new Date().toISOString();
    const artwork: DailyArtwork = {
      id: crypto.randomUUID(),
      date,
      title: title.trim() || "今日殘響",
      draftZh,
      draftEn,
      finalZh,
      finalEn,
      imagePath: null,
      imageSync: null,
      imageWidth: null,
      imageHeight: null,
      completedAt: now,
      updatedAt: now,
    };
    tx.objectStore(ARTWORKS).add(artwork);
    await done;
    return artwork;
  } finally {
    db.close();
  }
}
