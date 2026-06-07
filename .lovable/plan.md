# StockSight Improvements Plan

Based on your choices, I'll add a **watchlist**, **export & share reports**, a **sample-vs-live data toggle**, and refresh the UI to be **cleaner and simpler** — all stored locally, no accounts.

## 1. Cleaner, simpler UI
- Reduce visual density on the home screen: larger headings, more whitespace, fewer competing colors.
- Make the prediction result the clear focal point (big, plain-English banner) with secondary metrics tucked into a calmer row.
- Simplify the controls into a single clean card: Stock → Data source → Model → Run.
- Tone down the dark gradient background to a softer, more readable surface; keep the fintech feel but lighter on the eyes.

## 2. Watchlist & favorites
- A "★ Add to watchlist" button next to the stock picker.
- A horizontal strip of saved stocks (chips) at the top — tap one to instantly load and analyze it.
- Watchlist persists in the browser (localStorage), so it survives reloads.
- Remove items with an "×" on each chip.

## 3. Data source selector (sample OR real market data)
- A toggle: **Sample data** (current, always works offline) or **Live market data**.
- Live data fetched from a free, key-free source (Stooq daily CSV) through a small server route to avoid browser CORS issues.
- If a live fetch fails (offline / rate limit), automatically fall back to sample data with a small notice.
- The prediction/backtest engine stays the same — it just receives whichever price history you pick.

## 4. Export & share report
- An "Export report" button on the results.
- **Download as PDF**: a one-page summary (stock, prediction, confidence, accuracy/F1, strategy vs buy-and-hold, generated date, educational disclaimer).
- **Copy summary**: copies a clean plain-text summary to the clipboard for quick sharing.
- Generated client-side so it works without a backend round-trip.

## 5. Keep
- Onboarding guide on each launch (unchanged, lightly restyled to match cleaner UI).
- PWA installability.

## Technical notes
- New server route `src/routes/api/public/quotes.ts` fetches Stooq CSV server-side and returns normalized `{date, close}[]`; validated symbol input.
- `src/lib/stock-data.ts` gains a `getHistoryAsync(symbol, source)` that returns sample or live data; `runAnalysis` accepts a pre-loaded history or a source flag.
- New `src/lib/watchlist.ts` (localStorage helpers) and `src/lib/report.ts` (PDF via a lightweight client PDF lib + text summary).
- `src/routes/index.tsx` updated for the new controls, watchlist strip, data toggle, export buttons, and the cleaner layout.
- `src/styles.css` tokens adjusted for the lighter, calmer theme.
- No accounts, no database — everything local.

After you approve, I'll implement all of the above and verify it in the preview.