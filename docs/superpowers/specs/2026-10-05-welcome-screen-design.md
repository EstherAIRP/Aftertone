# 入口歡迎頁設計

日期：2026-10-05
Demo：[welcome-demo.html](../../ui-concepts/welcome-demo.html)（E2 快版）

## 目標

正式上線前，把入口頁改成和登入後的頁面明顯區隔的歡迎畫面，只保留歡迎動畫和「用 GitHub 登入」。拿掉所有測試用的說明文字和本機預覽功能。

## 架構

App.vue 仍然依登入狀態切換畫面，不新增路由。

- `!auth.ready`：只顯示純背景，不顯示文字。已登入的人不會先閃過歡迎畫面。
- `auth.ready && !auth.authenticated`：只顯示 `WelcomeScreen`，不顯示 `site-header` 和底部導覽列。
- `auth.authenticated`：維持現狀（品牌列、離線橫幅、RouterView、底部導覽列），登入後的按鈕文字固定為「登出」。

## WelcomeScreen 元件

新檔 `src/components/WelcomeScreen.vue`，全螢幕（至少 `100dvh`）、置中排版。

- 背景：`/images/window-light.webp` 緩慢明暗呼吸（約 9 秒一循環，透明度 0.4↔0.75，輕微縮放與平移），上面疊一層淺色漸層，確保文字對比。
- 漣漪：中央一個光點加 4 道圓環，週期 4.8 秒、錯開 1.2 秒、無限循環。0.5 秒後用 1 秒往上讓位。
- 文字：「Aftertone」（display 字體）、「殘響日誌」（serif）、「把今天的殘響，／輕輕留在這裡。」（serif）。逐字從模糊浮現，每個字間隔 90ms，起始時間依序為 0.8s、1.3s、1.5s、1.8s。
- 按鈕：GitHub 圖示加「用 GitHub 登入」，連到 `/api/auth/login`，2.5 秒時淡入。
- 錯誤：有 `auth.error` 時，在按鈕下方顯示一行柔和的小字（`role="alert"`），不用紅框。
- 無障礙：
  - 逐字的 span 設為 `aria-hidden`，完整文字另外給螢幕閱讀器（例如 `aria-label` 或 visually-hidden）。
  - 頁面要有 `h1`，唯一的 `h1` 是品牌名。
  - `prefers-reduced-motion: reduce` 時直接顯示完成狀態，漣漪靜止。
- 樣式：所有字型值都用 `style.css` 的 typography tokens，顏色沿用現有 tokens。

## auth.ts 調整

- 移除 `preview` state、`startPreview()`，以及 `logout()` 裡的 preview 分支。
- 連不到 session endpoint 時，錯誤訊息統一為「目前無法驗證登入。請確認網路或稍後重試。」，移除開發版的訊息。
- 讀到 `auth_error` 後，用 `history.replaceState` 把它從網址上移除，保留 path 和其他 query。
- `loginAvailable` 不再控制按鈕是否顯示，按鈕一律顯示。設定錯誤時由 `/api/auth/login` 回傳的 `auth_error=setup` 呈現。

## 移除

- App.vue：本機預覽按鈕、預覽說明、預覽橫幅、「離開預覽」、免責聲明、`login-orbit`、「正在確認登入…」。
- style.css：`.login-orbit`、`.center-panel` 相關規則（確認沒有其他地方使用）。
- README：本機預覽那一段。
- `loginAvailable` 沒有其他用途時，一併移除。

## 保留

- 離線橫幅「目前離線，紀錄會先保存在這台裝置。」

## 驗證

- `npm test`、`npm run build` 通過。
- 在 375×812 下：
  - 入口頁動畫依序播放，2.5 秒後出現按鈕。
  - 沒有品牌列和導覽列，也沒有橫向捲動。
  - 錯誤字串會顯示，而且網址上的 `auth_error` 已經清掉。
- `prefers-reduced-motion` 時直接顯示完成狀態。
