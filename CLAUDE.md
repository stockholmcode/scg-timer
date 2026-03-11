# SCG Timer

## Purpose
Time tracker for Stockholm Code Group (SCG) consultants. Tracks daily work hours per project/activity, then syncs to Kleer (the company's official time reporting system) via a Chrome extension.

## Why it exists
Kleer's UI is slow and clunky. This app gives consultants a fast, simple timer they use throughout the day. At the end of the week they sync to Kleer with one click.

## Architecture
- **Google Apps Script** web app served via `doGet()` — single HTML file with inline CSS/JS
- **Google Sheets** backend — one sheet per user, auto-created on first use
- **Chrome extension** (Manifest V3) — syncs time entries to Kleer and project list from Kleer
- **GitHub Pages** — `stockholmcode.github.io/scg-timer` iframes the Apps Script app for a clean URL

## Key design decisions
- **Optimistic UI**: All actions update instantly. Server calls happen in background. Status dot in header shows sync state (amber=pending, green=ok, red=fail).
- **localStorage caching**: Day entries, active timer, and projects are cached. Page loads show cached data immediately, server refreshes in background.
- **`userActed` guard**: Prevents slow `getInitData` response from overwriting user actions taken before it returns.
- **Server calls must be chained**: Stop+start timer calls must be sequential (not parallel) to avoid race conditions on the backend.
- **15-minute rounding at sync time**: Not in the UI. Accumulator carries remainder forward across days.
- **Sync checkpoint**: Single date — everything on or before is locked. Advances only to last date with actual sync actions.
- **Projects come from Kleer**: No hardcoded project list. Extension syncs projects from Kleer layout on first use and on every sync.

## File structure
- `apps-script/Code.gs` — all backend functions + API endpoint
- `apps-script/Index.html` — entire frontend (single file, inline everything)
- `chrome-extension/popup.js` — sync logic, project sync from Kleer
- `chrome-extension/background.js` — icon activation on Kleer, popup window
- `chrome-extension/content.js` — floating "SCG Sync" button on Kleer pages
- `docs/index.html` — GitHub Pages iframe wrapper

## Deployment
- Apps Script: `cd apps-script && clasp push --force && clasp deploy -i AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz --description "desc"`
- Extension: users load unpacked from `chrome-extension/` dir
- Never deploy from project root — clasp must run from `apps-script/` dir

## Development notes
- Apps Script serves HTML via iframe — viewport meta is ignored, use `zoom` CSS + touch class for mobile
- Kleer layout data (projects/activities) is in the full HTML page, NOT in Remix `_data` routes
- `DriveApp.getFilesByName` can find trashed files — always check `file.isTrashed()`
- Settings/Log tabs may not exist on old sheets — create on demand
- SPA sites (Kleer web2) destroy injected DOM — use MutationObserver to re-inject
- Apps Script exec URLs can be cached by browser — add `_t=Date.now()` cache buster
