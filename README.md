# 殘響日誌 Aftertone

私人耳鳴與每日意象日誌。產品規則見 [MVP 規格](docs/MVP_SPEC.md) 與 [開發計畫](docs/DEVELOPMENT_PLAN.md)。

## 目前進度

已建立手機優先的 Vue PWA、GitHub 登入端點與帳號 allowlist、IndexedDB 事件與意象片段的原子儲存，以及首頁、紀錄、日期意象、收藏的第一版介面。過去日期可完成雙語 Prompt 並建立待上傳作品。

目前事件與作品只保存在登入裝置。私人 GitHub 資料分支同步、編修與刪除、圖片上傳及預覽仍待開發，因此尚未達到 MVP 驗收條件。請勿把這版當作跨裝置備份。

## 本機啟動

需要 Node.js 20.19+ 或 22.12+、GitHub OAuth App，以及 Vercel CLI。複製 `.env.example` 為 `.env.local`，填入 GitHub OAuth Client ID、Client Secret、唯一允許的 GitHub login 與其數字 ID、隨機且長度充足的 `SESSION_SECRET` 和 `APP_ORIGIN`。OAuth callback 設為 `${APP_ORIGIN}/api/auth/callback`。GitHub 數字 ID 可從 GitHub 使用者 API 的 `id` 欄位取得。

```sh
npm install
npx vercel dev --listen 3000
npm run dev
```

Vite 預設在 `http://localhost:5173`，將 `/api` 轉送到本機 Vercel 函式。`APP_ORIGIN` 應設為 `http://localhost:5173`，GitHub OAuth callback 也需對應。正式部署時設定相同環境變數，將 `APP_ORIGIN` 換成正式 HTTPS 網域。

```sh
npm run build
npm test
```
