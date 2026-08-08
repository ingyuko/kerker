# kerker

Two mobile-first apps in one Next.js deployment, plus a Python IBKR bot:

| App | Route | What it is |
| --- | --- | --- |
| **選擇權每日損益** | `/options` | Tracks options trades placed on thinkorswim mobile and shows daily P&L. See [選擇權每日損益追蹤器](#選擇權每日損益追蹤器) below. |
| **3daysofdesign Guide** | `/` | Copenhagen design-week guide. |
| **kerker bot** | — | Python bull-put-spread automation against IBKR (`kerker/`, `requirements.txt`). |

---

# Ingyu's 3daysofdesign Guide

A mobile-first web app for planning and navigating Copenhagen **3daysofdesign**.

Not a generic event site — a personal design guide that helps you discover
exhibitions, filter by interest, plan daily routes, explore by zone, save
favorites, and quickly decide what's worth visiting.

Built for **iPhone Safari** first (390px / iPhone 15 Pro), desktop second.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **TailwindCSS** with an editorial Scandinavian palette
- **shadcn/ui**-style components (Button, Card, Badge, Tabs) + **Radix UI**
- **Lucide** icons
- Deploy target: **Vercel**

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Pages

| Route       | Purpose                                                               |
| ----------- | --------------------------------------------------------------------- |
| `/`         | Browse exhibitions. Sticky tag + zone filter bar (multi-select, AND). |
| `/planner`  | Day 1–3 itinerary tabs, each themed and ordered as a walking route.   |
| `/map`      | Static zone cards grouping exhibitions (Google Maps integration TBD). |
| `/saved`    | Favorites saved to `localStorage` via the heart on each card.         |

## Filtering

- **Tag filters** (`Yellow Nose`, `Curator Pick`, `Hospitality`, `Material`,
  `Lighting`, `Japan`, `Must Go`) are multi-select and combine with **AND**
  semantics — `Yellow Nose` + `Curator Pick` shows only exhibitions carrying
  both tags.
- **Zone filters** (`All`, `Frederiksstaden`, `City Center`, `Nordhavn`,
  `Refshaleøen`) combine with the tag filters.

## Project structure

```
app/
  layout.tsx          # fonts, metadata, viewport, bottom nav shell
  page.tsx            # Home (browse)
  planner/page.tsx    # Planner
  map/page.tsx        # Map
  saved/page.tsx      # Saved
components/
  ui/                 # shadcn-style primitives (button, badge, card, tabs)
  exhibition-card.tsx # full card + compact row
  home-browser.tsx    # client filter state
  filter-bar.tsx      # tag + zone chips
  planner-tabs.tsx    # day tabs + route list
  saved-list.tsx      # localStorage-backed favorites list
  bottom-nav.tsx      # fixed mobile tab bar
lib/
  types.ts            # Exhibition model + filter constants
  data.ts             # seed data (13 exhibitions, placeholder images)
  planner.ts          # three-day itinerary
  useSavedExhibitions.ts  # localStorage favorites hook
  utils.ts            # cn() helper
```

## Data model

```ts
interface Exhibition {
  id: string;
  name: string;
  zone: "Frederiksstaden" | "City Center" | "Nordhavn" | "Refshaleøen";
  priority: "must-go" | "worth-it" | "optional";
  tags: string[];
  images: string[]; // placeholders for now — no real imagery yet
  about: string;
  whyGo: string;
  whatToLookFor: string;
  websiteUrl: string;
  eventUrl: string;
  mapUrl: string;
}
```

Seed data covers 13 exhibitions: Carl Hansen & Søn, Fredericia, Ark Journal,
COMPOSED MATTER, Frama, La Cabra, Kvadrat, Japanmade, Dynaudio × Karimoku,
Louis Poulsen, Ingo Maurer, Display, and Other Circle.

## Not built yet (foundation only)

Google Maps API, route optimization, AI recommendations, calendar sync,
ticket reservations, and user accounts are intentionally out of scope.

---

# 選擇權每日損益追蹤器

手機版 thinkorswim 沒有 API、也不能匯出 CSV，所以這個 app 用**截圖辨識**把成交
搬進來：下完單截一張圖上傳，Claude 讀成結構化的交易腳位，你核對後存進資料庫，
系統再用先進先出配對開倉與平倉，算出**每天的已實現損益**。

網址：`/options`（在 iPhone Safari 用「加入主畫面」就像原生 app）。

## 畫面

| 路由 | 功能 |
| --- | --- |
| `/options` | 每日損益。累積已實現、未實現、今日損益、每日長條圖、累積曲線、勝率／盈虧比等統計，以及可展開的每日明細。 |
| `/options/add` | 新增交易。截圖辨識或手動輸入，支援多腳策略（價差、鐵兀鷹）。 |
| `/options/positions` | 未平倉部位。手動填入目前權利金即可看未實現損益。 |
| `/options/trades` | 全部成交紀錄，可編輯、刪除、匯出 JSON 備份。 |

## 損益怎麼算

- **每一筆成交**（execution）記錄單一合約的單次成交：標的、到期日、履約價、
  Call/Put、買/賣、口數、每股權利金、手續費。
- **開倉或平倉由系統推導**，不看輸入標記：手上是空單時的買進就是平倉。這樣即使
  截圖辨識把方向標錯，損益也不會算歪。
- **先進先出（FIFO）配對**：同一合約的平倉單依序沖銷最早的開倉單。部分平倉時，
  開倉手續費按口數比例攤提。
- **已實現損益記在平倉那一天**（美東交易日）。3/2 開倉、3/6 平倉，損益算在 3/6。
- **手續費**兩腳都扣。每日明細另外顯示「當天實付手續費」，含還沒平倉的部位。
- **未實現損益**用你手動填的目前權利金計算，並扣掉已付的開倉手續費，所以
  已實現 + 未實現是一致的權益視角。沒填報價的部位顯示「—」，不當成 0。
- **交易日以美東（America/New_York）為準**，台北時間深夜下的單會正確歸到美股當天。

多腳策略（價差）如果截圖只顯示整組淨價，app 會提示把淨價記在主要那一腳、其餘填
0 — 只要整組同時平倉，總損益就正確。

## 設定

環境變數都設在部署環境（Vercel → Settings → Environment Variables）：

| 變數 | 必要性 | 說明 |
| --- | --- | --- |
| `DATABASE_URL` | 正式環境必填 | Postgres 連線字串（Neon、Supabase、Vercel Postgres 都可以）。資料表會在第一次請求時自動建立。 |
| `APP_PASSCODE` | 正式環境必填 | 進入 app 的通行碼。沒設定的話正式環境會直接拒絕服務 — 交易紀錄不該放在公開網址上任人讀取。 |
| `APP_SESSION_SECRET` | 選填 | 設了之後改通行碼不會讓已登入的裝置被登出。 |
| `ANTHROPIC_API_KEY` | 截圖辨識需要 | 沒有的話截圖功能會給出明確錯誤，手動輸入不受影響。 |

本機開發時 `DATABASE_URL` 可以留空，資料會暫存在 `.data/options.json`（已
gitignore）。這個 fallback 在 `NODE_ENV=production` 會直接報錯，避免部署設錯卻
悄悄寫進會被回收的磁碟。

```bash
npm install
npm run dev     # http://localhost:3000/options
npm test        # 損益引擎與驗證層的測試
```

## 截圖辨識

- 用 `claude-opus-5` 的視覺能力 + structured outputs，直接回傳符合 schema 的
  JSON，不做字串剖析。
- 辨識結果**一定先進到可編輯的表單**讓你核對才會存檔；每一腳都附上「辨識自」的
  原始文字與把握度，低於 80% 會標紅。
- 上傳前在瀏覽器端把圖縮到長邊 2400px，省流量也省 token。一次最多 4 張（長清單
  需要捲動時可以分次截）。
- thinkorswim 的寫法（`SPY 100 (Weeklys) 17 APR 26 500 PUT`、`BOT +1` / `SOLD -1`、
  每股報價、垂直價差的高低履約價順序）都寫進了 system prompt。
- 預設開啟 server-side refusal fallback；若該 API key 沒有這個 beta，會自動改用
  標準端點重試一次，不會讓辨識整個失敗。

## 資料表

第一次請求時自動建立，不需要手動 migration：

- `option_executions` — 每一筆成交，`trade_date` 上有 index。
- `option_marks` — 每個合約的手動報價，`contract_key` 為主鍵。

## 顏色

綠賺紅賠（跟 thinkorswim 一致）。這組綠 `#137A55` / 紅 `#C4451C` 是實際跑過色盲
可辨識度驗證後選的（protan ΔE 8.1，一般紅綠配色過不了）。圖表另外用**方向**當
主要編碼（長條往上是賺、往下是賠），數字一律帶 `+` / `−` 符號，所以不靠顏色也
讀得懂。

## 程式結構

```
app/options/            # 四個頁面 + 自己的 layout 與底部導覽
app/api/options/        # session / executions / marks / parse-screenshot
lib/options/
  pnl.ts                # FIFO 配對、每日彙總、統計、權益曲線（純函式）
  types.ts              # Execution / RealizedLot / OpenPosition / DailyPnl
  contract.ts           # 合約識別碼、美東交易日、到期天數
  validate.ts           # 所有寫入前的欄位驗證
  store.ts              # Postgres（正式）與 JSON 檔（本機）兩種實作
  parse-screenshot.ts   # Claude 視覺辨識與 JSON schema
  auth.ts               # 通行碼與簽章 cookie
components/options/     # 資料 context、表單、圖表、列表
tests/                  # 損益引擎與驗證層（49 個測試）
```

損益引擎是純函式，測試涵蓋 FIFO 順序、部分平倉的手續費攤提、反向超額成交、
到期歸零、時區歸日、以及統計的邊界情況。
