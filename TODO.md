# Implementation Plan

## Phase 1: Start/Stop Timer — DONE

- [x] Requirements and architecture (README.md)
- [x] Apps Script backend (Code.gs) — deployed via clasp
- [x] Frontend served from Apps Script (Index.html)
- [x] Setup guide (setup.md)
- [x] Deploy to Google Apps Script (clasp)
- [x] Per-user Google Sheet, auto-created on first use
- [x] One row per activity per day model
- [x] Start/stop per row with play/stop toggle
- [x] Running timer shows saved + elapsed time
- [x] Click row to edit (project, activity, time) via modal
- [x] Add/delete entries
- [x] Day navigation (back/forward + Today button)
- [x] Week view with editable grid
- [x] Click empty week cells to add entries
- [x] Click day header in week view to go to day view
- [x] Flexible time input (1 = 1h, 1.5 = 1:30, 1:30 = 1:30)
- [x] Last project/activity remembered in localStorage
- [x] Project list cached in localStorage for fast load
- [x] Day entries cached in localStorage (show cached, refresh in background)
- [x] Single getInitData() call on load
- [x] Loading spinner on navigation
- [x] Duplicate entry prevention
- [x] Double-save prevention
- [x] Mobile support (touch detection, zoom 2.2x, larger touch targets)
- [x] Free navigation while timer running (day/week/view toggle)
- [x] Editable entries while timer running (except running entry's time)
- [x] Week view editable while timer running (except running cell)

### Deployment

- **Apps Script project**: SCG Timer (standalone, via clasp)
- **Stable URL**: https://stockholmcode.github.io/scg-timer
- **Deploy command**: `cd apps-script && clasp push --force && clasp deploy -i AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz --description "description"`
- **GitHub repo**: stockholmcode/scg-timer

## Phase 2: Polish — DONE

- [x] Week view uses day cache for instant load
- [x] Week view inline editing with tab support (no re-render on edit)
- [x] Accumulator persistence → deferred to Phase 3 (rounding happens at sync time)

## Phase 3: Kleer sync — DONE

- [x] Inspect Kleer's form submission (Remix app, form-urlencoded POSTs)
- [x] Chrome extension (popup, multi-week sync, per-week save points)
- [x] Auto-fill Kleer from sheet data (create + update events)
- [x] Accumulator rounding (15-min, per project+activity, at sync time)
- [x] Sync checkpoint (locks synced dates in UI, backend rejects edits)
- [x] Archive synced entries to Log tab (append-only, keeps Entries small)
- [x] Checkpoint only advances to last date with actual sync actions

## Phase 4: Quality — DONE

- [x] Pretty URL (GitHub Pages iframe)
- [x] Project sync from Kleer (replaces hardcoded defaults)
- [x] Auto-sync projects on first use (0 projects)
- [x] Optimistic UI (instant feedback for all actions)
- [x] Cached active timer for instant page loads
- [x] Lock navigation (prev button shows lock icon for synced dates)
- [x] Live running timer in week view
- [x] Start button in Add Activity modal for today
- [x] Running entries not editable (stop first)
- [x] Escape closes modals
- [x] Re-check sync checkpoint on tab focus
- [x] Floating "SCG Sync" button on Kleer pages
- [x] Extension icon activates only on my.kleer.se
- [x] GitHub repo with branch protection
- [x] Skip trashed sheets in getOrCreateSheet

## Status

All planned work is complete.
