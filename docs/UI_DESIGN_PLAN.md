# Aftertone UI 設計與圖片規劃：冰藍殘響

參考圖：[安靜的今日殘響](安靜的今日殘響.png)、[殘響日誌：冰藍夢境介面](殘響日誌：冰藍夢境介面.png)。兩張圖提供視覺語言，介面文字與功能由網頁元件實作，不直接把參考圖貼成畫面。產品流程仍依 [MVP 規格](MVP_SPEC.md) 與 [開發計畫](DEVELOPMENT_PLAN.md)。本文件取代先前的「午後果醬」視覺方案。

## 1. 核心方向

像清晨窗邊的一頁私人日誌：冰藍、銀灰、柔光、輕微稜鏡光與大片留白。主要互動的邊界以光暈和明度融入背景，避免堆疊描邊、框線與膠囊區塊。美術表達「安靜地留下紀錄」，不把耳鳴次數當成進度或獎勵；七個意象類別必須以文字呈現，選中狀態也不能只靠顏色。

| 元素 | 規格 |
| --- | --- |
| 背景 | `#F5F8FC`，照片只在登入／首頁上半部，向下漸層淡出。 |
| 文字 | 主色 `#34445D`；次要 `#53647B`。長內容維持實色或高不透明底。 |
| 強調與操作 | 深藍 `#47648A` 配白字；輪廓 `#8FA8C8`。 |
| 玻璃卡片 | 白色約 75–85% 不透明度、1 px 藍灰邊、輕模糊；在圖片上方仍要能讀。 |
| 字體 | 品牌英文 Cormorant Garamond；中文標題 Noto Serif TC；表單及長文 Noto Sans TC。字體無法載入時用系統後備字體。 |
| 圖形 | 融入背景的生圖光暈、淡色小光點；小型功能圖示用一致的細線，圖片不包含按鈕文字或點擊邏輯。 |
| 響應式 | 375–430 px 單欄；平板／桌面保留相同閱讀順序，日期頁可雙欄。觸控目標至少 44 × 44 px。 |
| 動態 | 100–250 ms 的淡入與反饋；遵守 `prefers-reduced-motion`。背景不做視差。 |

## 2. 各畫面 UI

| 畫面 | 視覺主次與互動 | 空／錯誤／完成狀態 | 固定圖片需求 |
| --- | --- | --- | --- |
| 登入 | 中央品牌與同心圓、短句、GitHub 登入；底部說明私人紀錄。 | 驗證中、帳號不符、離線、預覽模式以文字呈現。 | 共用窗邊柔光背景。 |
| 首頁 | 日期與「今天留下了 N 段殘響」；大圓形「記下一次」；下方七類意象、最近片段和今日意象入口。 | 零紀錄顯示溫和引導文字；讀取錯誤留在內容附近。 | 共用窗邊柔光背景。 |
| 記錄 | 頁名與一句說明；時間、耳側、強度、聲音、時長；可略過的狀態與備註在後。選項用膠囊形控件。 | 必填錯誤、保存中、保存失敗；內容保持可重新提交。 | 無需獨立圖片，以淺色背景和細線裝飾即可。 |
| 記錄結果 | 先確認已保存，再以獨立卡片展示唯讀意象片段與類別；「查看當日意象／再記一筆」。 | 若後續同步調整片段，明確說明原因。 | 無需獨立圖片。 |
| 日期意象 | 日期與事件數；唯讀片段、七類狀態；中英 Prompt 分成可編輯卡片；底部原始紀錄。 | 今日只預覽；過去日期可完成；無事件、已完成、複製失敗各有文字回饋。 | 可選極淡窗影局部紋理；目前以共用背景即可。 |
| 收藏 | 日期作品卡網格；有圖時以作品為主角，無圖時清楚寫「尚未加入圖片」。 | 空收藏、圖片載入失敗、待上傳狀態。 | 不使用假的每日作品圖；空狀態可選獨立靜物圖。 |
| 作品詳情 | 沿用日期頁，最上方放完整比例圖片或待上傳區；標題、Prompt、片段與原始事件往下排列。 | 上傳、替換、刪圖、超過大小、同步失敗。此頁功能仍在開發計畫內。 | 作品圖片由使用者提供。 |

### 畫面層級與使用注意

1. 首頁柔光入口是真正可操作的連結，整個光暈區可點，不只中央的細線加號。
2. 七類意象是描述狀態，不做「填滿七格」的進度視覺；未出現類別仍有文字標籤。
3. 原始事件、唯讀片段、可編輯 Prompt 分成不同區塊與底色，避免誤解可編輯性。
4. 玻璃效果只放在短內容容器；表單、Prompt 和錯誤訊息必須有高不透明底。
5. 底部導覽固定為首頁／記錄／收藏／回望，加入安全區間距，長表單不被遮住。

## 3. 各介面圖片清單

| 優先 | 檔案／圖片 | 用途與構圖 | 規格與狀態 |
| --- | --- | --- | --- |
| P0 | `public/images/window-light.webp` | 登入和首頁上半部的清晨窗影、薄窗簾、冰藍柔光；中央大量留白，不含文字或 UI。 | **已製作**，940 × 1672 WebP，約 46 KB。由內建 image_gen 產生。 |
| P0 | `public/images/record-halo.webp` | 首頁記錄入口後方的冰藍與銀紫色柔光；透明背景，邊緣以遮罩融入窗景，無文字或圖示。 | **已製作**，1297 × 1212 透明 WebP，約 417 KB。由內建 image_gen 產生。 |
| P0 | `public/icon.svg` | PWA 與品牌小尺寸識別，同心圓加號。 | **已更新**，向量；日後可補 192／512 px maskable 輸出。 |
| P1 | `archive-empty.webp` | 空收藏：窗邊一本闔上的無字日誌，低彩度、右下構圖，避免像已有作品。 | 可選，建議 960 × 720 WebP，<150 KB；目前使用 CSS 圓軌佔位。 |
| P1 | `day-mist.webp` | 日期意象頁頂部的一小塊半透明光霧，不能放在 Prompt 文字後方。 | 可選，建議 1400 × 700 WebP，<180 KB；目前共用背景足夠。 |
| P0 | `public/images/categories/*.webp` 七張 | 人物、服裝、背景、氛圍、構圖、色調、姿勢各有一張固定意象；當天有該類片段時顯示，未出現時保留同色系空輪廓。 | **已製作**，320 × 320 WebP，各約 4–9 KB；無字，圓形裁切由 CSS 處理。 |
| 使用者內容 | 每日作品原圖 | 收藏卡與作品詳情。比例由使用者作品決定，卡片裁切、詳情完整顯示。 | **不預先生成**；由使用者在外部工具創作並上傳。 |

### 圖片生成提示詞

**共用風格**：Quiet private diary atmosphere, ice blue and pearl white morning light, soft realistic window shadows, a sheer curtain, subtle prism highlights, restrained film grain, generous negative space. No text, no letters, no logo, no UI, no people, no animals, no phone mockup.

**空收藏**：A closed blank linen journal on a pale windowsill in the same ice-blue morning light, subtle folded fabric and a faint leaf shadow, object placed low and to the right, generous empty space above and left, no writing, no image on the cover.

**日期頁局部紋理**：Abstract mist and diffused window light in pearl white and pale blue, very low contrast, horizontal crop, no identifiable object, no text, no interface components.

### 七類固定意象

七張使用相同的柔光、低對比與細顆粒；圖片是類別的視覺提示，不逐日生成，也不代表使用者作品。首頁在寬畫面排一列七個，手機排 4＋3。已出現類別顯示圖片和較深標籤；未出現類別顯示該色調的淡輪廓。輔助技術讀出完整類別名稱與「已有片段／尚未出現」。

| 類別 | 檔案 | 主色與畫面線索 |
| --- | --- | --- |
| 人物 | `person.webp` | 煙灰藍 `#B7C7D9`；霧玻璃後的模糊人形側影。 |
| 服裝 | `clothing.webp` | 淡粉 `#E8CBD8`；柔軟的布料摺痕。 |
| 背景 | `background.webp` | 冰青 `#B8DCE3`；遠窗與朦朧景深。 |
| 氛圍 | `atmosphere.webp` | 淡紫 `#D4C7E8`；霧與散射光。 |
| 構圖 | `composition.webp` | 奶油黃 `#EADFAE`；錯落的半透明光面。 |
| 色調 | `color.webp` | 薄荷綠 `#C8DEC7`；一束細微的稜鏡折射。 |
| 姿勢 | `pose.webp` | 暖杏橘 `#EBC5A9`；暖光中的人形動勢。 |

生成後檢查小尺寸辨識、裁切安全區、亮度與文字對比。圖片格式以 WebP 為主；失敗或未載入時保留純色／CSS 背景，核心操作不受影響。

## 4. 驗收順序

1. 375／390 px 手機、768 px 平板、桌面檢查首頁首屏與長表單；無水平捲動、按鈕不被導覽遮住。
2. 鍵盤導覽、可見焦點、選項狀態、錯誤訊息與減少動態檢查。
3. 實際走完記錄 → 片段 → 日期意象 → 完成 → 收藏流程；有圖和無圖的卡片都要清楚。
4. 後續圖片上傳功能完成時，再補收藏作品的裁切與載入失敗驗收。

## 5. 字體排印（Typography）

所有字體設定集中在 `src/style.css` 的 `:root`「Typography tokens」區塊。調整字體只改這裡；其他地方一律以 `var(--…)` 引用。

| 類型 | Token | 值 |
| --- | --- | --- |
| 字族 | `--font-display` | Cormorant Garamond → Noto Serif TC → Georgia |
| 字族 | `--font-serif` | Noto Serif TC → Songti TC |
| 字族 | `--font-sans` | Noto Sans TC → system-ui |
| 字重 | `--weight-regular` / `--weight-medium` / `--weight-semibold` | 400 / 500 / 600（semibold 僅限無襯線） |
| 字級 | `--text-xs` / `sm` / `md` / `lg` / `xl` | 0.78 / 0.875 / 1 / 1.2 / 1.5 rem |
| 字級 | `--text-2xl` / `--text-3xl` | `clamp(2rem, 5vw, 3rem)` / `clamp(2.6rem, 5vw, 3.6rem)` |
| 字級 | `--text-display` | 2.7 rem，裝飾符號與大數字 |
| 字距 | `--tracking-normal` / `tight` / `heading` / `wide` / `wider` | 0 / 0.04 / 0.08 / 0.18 / 0.48 em（wider 僅品牌副標） |
| 行高 | `--leading-none` / `tight` / `heading` / `body` / `loose` | 1 / 1.2 / 1.4 / 1.6 / 1.85 |

使用規則：

- **display**：只用於品牌名、日期與數字。
- **serif**：標題與詩意文案（意象句、片段內容）；只用 regular / medium。
- **sans**：所有功能性 UI（按鈕、表單、導覽、標籤、提示）。
- 不在 `:root` 以外寫原始的 font-family、font-weight、font-size、letter-spacing 或 line-height 值。例外：`inherit`、`font-size: 0`，以及刻意相對父層的 `em` 字級。
- Google Fonts 只載入 Sans 400/500/600、Serif 400/500、Cormorant 400/500，且 `font-synthesis: none`；新增字重前須同步更新 `@import`，否則不會照寫的樣子顯示。
