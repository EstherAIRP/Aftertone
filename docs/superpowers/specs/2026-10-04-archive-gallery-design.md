# 收藏頁「畫廊 × 月曆」與作品圖片設計規格

日期：2026-10-04
視覺草圖：`.superpowers/brainstorm/669-1791126057/content/`（`gallery-layout.html`、`calendar-view.html`、`detail-page.html`，本機保留、不進版控）
相關文件：[MVP 規格](../../MVP_SPEC.md)、[開發計畫](../../DEVELOPMENT_PLAN.md)、[UI 設計規劃](../../UI_DESIGN_PLAN.md)

## 1. 目的與範圍

收藏頁是 Aftertone 的長期回顧介面（MVP_SPEC §10）。目前 [GalleryView.vue](../../../src/views/GalleryView.vue) 只有佔位網格，沒有紀錄次數，也不能加入圖片。本規格完成收藏的完整功能：

- 畫廊（原比例瀑布流）與月曆兩種版面，可切換。
- 作品詳情：沿用日期頁，頂部加入作品圖片區。
- 圖片加入、替換、刪除，原圖存在本機 IndexedDB。

**不在本次範圍：** GitHub 資料分支上傳、大圖手動路徑、「重新同步」。資料結構保留同步欄位，等同步階段再接上。

**規格變更：** MVP_SPEC §10 原寫「月曆模式不列入 MVP」，本次改為列入 MVP，需同步修訂該段。

## 2. 收藏頁

### 2.1 頁首與切換

- 沿用現有標題「YOUR ARCHIVE／你的意象收藏」。
- 標題下方是「畫廊／月曆」分段切換，選中的那段用深藍底白字，未選中的用文字標示，不只靠顏色區分。
- 切換狀態寫在 URL query：`/gallery`（預設畫廊）、`/gallery?view=calendar&month=2026-10`。從詳情頁返回時，會回到原本的版面和月份。

### 2.2 畫廊：原比例瀑布流

- 依月份分組，月份標題格式為「2026 · 十月」，新的月份在上。
- 每組是兩欄瀑布流，平板與桌面寬度改為三欄。同一個月內的作品照日期由新到舊，逐一放進目前最矮的那一欄（`distributeMasonry`），讓閱讀順序大致保持由上到下、由新到舊。
- 有圖的卡片照原比例完整顯示，不裁切。長寬比限制在 1:2 到 2:1 之間，超出的部分才置中裁切，避免極端比例撐壞版面。
- 卡片下方顯示「MM/DD · N 次」和標題。
- 沒圖的卡片是固定 1:1 的虛線框，寫「尚未加入圖片」並附「＋ 加入」按鈕。點「＋」直接開啟選檔，不用先進詳情頁；點卡片其他位置則進入詳情頁。
- 只顯示已完成的作品（`artworks` 中有資料的日期）。

### 2.3 月曆

- 一次顯示一個月，以週日為一週的開始，兩側用「‹ ›」翻頁，預設顯示當月。最早只能翻到有資料的最早月份，最晚到當月。
- 每格依狀態顯示：

| 狀態 | 條件 | 呈現 | 點擊 |
| --- | --- | --- | --- |
| 作品 | 有 artwork 且有圖 | 圖片縮圖填滿格子，左上角日期用白字加陰影 | 下方出現預覽卡（縮圖、日期、次數、標題、「查看作品 ›」），再點一次進入詳情 |
| 待加入圖片 | 有 artwork、沒有圖 | 白底虛線格，右下角「＋」 | 進入詳情 |
| 未完成 | 有事件、沒有 artwork | 白底細框，底部 1–3 個小點代表紀錄次數（超過 3 次也只顯示 3 點），並有無障礙標籤「N 次紀錄，尚未完成意象」 | 進入 `/day/:date` 完成意象 |
| 今天 | 當地今天 | 深藍內框加粗字；若今天有紀錄，同時疊加「未完成」的小點 | 進入 `/day/:date`（今天只能預覽） |
| 空白 | 都沒有 | 只顯示淡色日期 | 不可點擊 |

- 小點只用來提示「有紀錄」，不呈現成進度或成就（UI_DESIGN_PLAN §1）。

### 2.4 空狀態與錯誤

- 沒有任何作品時：畫廊沿用現有的空收藏卡。月曆照常顯示，「未完成」的日子仍然可以點。
- 讀取失敗時，在頁首下方用 `role="alert"` 顯示錯誤文字。
- 單張圖片載入失敗時，該卡顯示「圖片無法顯示」佔位，大小同沒圖的卡片，可以點進詳情處理。

## 3. 作品詳情（DayView）

不新增路由。已完成日期的 `/day/:date` 依是否有圖分成兩種狀態：有圖時在頁面最上方顯示 `ArtworkImagePanel`；沒圖時不顯示頂部面板，改在「完整 Prompt」區塊內、原本「完成這一天的意象」按鈕的位置顯示「下一步」區塊（`ArtworkNextSteps`）。其餘區塊（標題、完整 Prompt、片段、原始紀錄）維持不變。從收藏頁進入的連結會帶上 `?from=<原收藏頁 query 編碼>`。詳情頁偵測到 `from` 時，在頂部顯示「‹ 收藏」，連回 `/gallery?<from>`，回到原本的版面和月份；沒有 `from` 時，維持現有的頁首。

### 3.1 有圖

- `ArtworkImagePanel` 只在作品有圖時出現在頁面最上方。
- 完整比例顯示，不裁切。右上角「⋯」選單，項目為「查看原圖／刪除圖片」。
- 圖片下方一列：左側同步標籤，右側常駐的「重新上傳」按鈕（替換圖片），不收在選單裡。
- 「查看原圖」在新分頁開啟 Blob 的 object URL。
- 同步標籤本次固定顯示「僅存在此裝置」。

### 3.2 沒圖：「下一步」區塊

已完成但沒圖（`artwork && !artwork.imagePath`）時，「完整 Prompt」區塊底部、原本完成按鈕的位置顯示「下一步」區塊，取代原本的「作品已加入收藏。」提示。剛完成時與之後從收藏頁回來時都顯示同一個區塊。

- 標題「下一步」，引言「作品已加入收藏。照著三個步驟，為它加上一張圖片。」
- 有序的三個步驟：
  1. **複製 Prompt**：「複製中文」「Copy English」兩個按鈕，複製成功後按鈕文字短暫改為「已複製」（約 2 秒），並以 live region 告知螢幕閱讀器。區塊顯示期間，上方 Prompt 欄位下的兩個複製按鈕隱藏，頁面上只保留一組。
  2. **到你常用的生圖工具生成**：一行說明。
  3. **加入圖片**：「選擇圖片」按鈕與附註「接受 JPG／PNG／WebP，保留原檔不壓縮。超過 4 MB 也能存在此裝置，但之後無法自動同步。」驗證、保存中狀態與錯誤訊息與 §3.3 相同；錯誤顯示在此步驟內。
- 沒有頂部的虛線上傳區。收藏頁待補圖卡片的「＋ 加入」不受影響。

### 3.3 互動規則

- **加入／替換：** 選檔後先驗證格式。不支援的格式顯示錯誤、不寫入。超過 4 MB 會顯示警告，但照常寫入。寫入時顯示「正在保存…」，期間停用按鈕。
- **替換的原子性：** 新圖與 artwork 更新在同一個 IndexedDB transaction 內完成，失敗就整筆回滾、保留舊圖，並顯示「替換失敗，已保留原本的圖片。」
- **刪除：** 跳出確認視窗：「只刪除這張圖片，作品、Prompt 和原始紀錄都會保留。」確認後頂部面板消失，回到「沒圖」狀態，Prompt 下方重新出現「下一步」區塊。
- **完成意象後：** 成功後把「下一步」區塊捲入畫面，並把焦點移到其標題（`tabindex="-1"`）。
- **從「下一步」加入圖片後：** 更新作品，區塊消失，捲回頁面頂端讓新圖可見，焦點移到頂部的作品圖片面板。超過 4 MB 的警告改由頂部面板顯示。
- **捲動：** 以上捲動預設平滑；使用者設定 `prefers-reduced-motion: reduce` 時直接跳轉。
- **空間不足**（`QuotaExceededError`）：顯示「此裝置的儲存空間不足，圖片沒有保存。」

## 4. 資料層

### 4.1 Schema v2（[db.ts](../../../src/db.ts)）

- `VERSION` 改為 2，`onupgradeneeded` 依 `oldVersion` 分段遷移：v0→v1 建立現有三個 store，v1→v2 新增 `images` store。v1 的資料原封不動。
- `images` store，keyPath 為 `date`：

```ts
interface ArtworkImage {
  date: string;        // YYYY-MM-DD
  blob: Blob;          // 原檔，不壓縮
  fileName: string;
  mimeType: string;    // image/jpeg | image/png | image/webp
  size: number;        // bytes
  width: number;
  height: number;
  createdAt: string;   // ISO
}
```

- `DailyArtwork` 新增欄位：`imageSync: "local" | "synced" | null`，沒圖時為 `null`。`imageWidth`、`imageHeight` 存一份，供瀑布流計算高度，不必讀 Blob。有圖時 `imagePath` 為 `local:YYYY-MM-DD`，GitHub 同步上線後改為倉庫路徑。舊資料讀取時缺少的欄位一律視為 `null`。

### 4.2 新增函式

| 函式 | 行為 |
| --- | --- |
| `getArchive(): Promise<ArchiveDay[]>` | 一次讀取所有 events 與 artworks，回傳每個有資料日期的 `{ date, eventCount, artwork }`，日期新到舊。不讀取 Blob。 |
| `setArtworkImage(date, file, size: {width,height})` | 確認該日期有 artwork，在同一個 transaction 內寫入 `images`，並更新 artwork 的 `imagePath`、`imageSync: "local"`、`imageWidth/Height`、`updatedAt`。 |
| `removeArtworkImage(date)` | 同一個 transaction 內刪除 `images` 中該筆資料，並把 artwork 的圖片欄位清成 `null`。 |
| `getArtworkImage(date)` | 回傳 `ArtworkImage \| null`。 |

圖片長寬在 UI 層用 `createImageBitmap` 讀取後傳入，讓 db 層不碰 DOM API，測試時也方便以假資料替代。

### 4.3 純函式（[domain.ts](../../../src/domain.ts)）

- `buildMonthGrid(month: string, archive: ArchiveDay[], today: string): CalendarCell[]`：包含前導空格，每格帶 `state: "artwork" | "pending" | "open" | "empty"` 和 `isToday`。
- `distributeMasonry<T>(items: T[], columns: number, ratioOf: (item: T) => number): T[][]`：依序放入累計高度最小的欄，高度相同時放最左邊那欄。
- `validateImageFile(file: { type: string; size: number }): { ok: true; warning?: "oversize" } | { ok: false; reason: "type" }`。

## 5. 元件

| 元件 | 職責 |
| --- | --- |
| `GalleryView.vue` | 讀取 `getArchive()`、處理 query 狀態、切換兩種版面，並顯示錯誤與空狀態。 |
| `components/ArchiveMasonry.vue` | 依月份分組，呼叫 `distributeMasonry` 排版。卡片從畫廊直接選檔時，呼叫共用的加入圖片流程。 |
| `components/ArchiveCalendar.vue` | 月份翻頁、`buildMonthGrid` 渲染，以及作品格的預覽卡。 |
| `components/ArtworkThumb.vue` | 依日期讀取 Blob、建立 object URL，卸載時釋放，並處理載入失敗的佔位。畫廊卡、月曆格和預覽卡共用。 |
| `components/ArtworkImagePanel.vue` | 詳情頁頂部的圖片區：有圖時的圖片顯示、「重新上傳」按鈕、⋯ 選單（查看原圖、刪除）與各種錯誤狀態。 |
| `composables/useArtworkImageUpload.ts` | 選檔 → 驗證 → 讀取長寬 → `setArtworkImage`，回傳 `saving / error / warning`，供 Panel 和畫廊卡共用。 |

縮圖直接用原圖的 object URL，不另外產生縮圖檔，日後有效能問題再處理。

## 6. 測試

- `domain.test.ts`：
  - `buildMonthGrid`：月初是週日或週六的前導空格、各種狀態的判定、今天同時有紀錄的情況。
  - `distributeMasonry`：順序穩定、欄高平手時的規則、沒有作品的情況。
  - `validateImageFile`：三種格式通過、其他格式拒絕、超過 4 MB 時給警告。
- `db.test.ts`（fake-indexeddb）：
  - `getArchive` 的紀錄次數與排序。
  - 加入圖片，以及沒有 artwork 時拒絕寫入。
  - 替換時覆寫圖片。
  - 替換中途失敗時保留舊圖（模擬 transaction abort）。
  - 刪除圖片後 artwork 仍保留。
  - 以 v1 建立資料後重開為 v2，原本的 events、fragments、artworks 都還在。
- 手動驗收：375 px 手機寬度下走過「完成作品 → 畫廊上的沒圖卡 → 加入圖片 → 月曆檢查 → 詳情頁替換 → 刪除」；無圖片、圖片損壞和空收藏的畫面都要清楚。

## 7. 一起修改的文件與設定

- `docs/MVP_SPEC.md` §10：月曆改列入 MVP，並描述月曆三種日期狀態。
- `.gitignore`：加入 `.superpowers/`。
