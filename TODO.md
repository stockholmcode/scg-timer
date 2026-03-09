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
- **Stable URL**: https://script.google.com/macros/s/AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz/exec
- **Deploy command**: `cd apps-script && clasp push --force && clasp deploy -i AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz --description "description"`
- **Google account**: peter.borg@stockholmcode.se

## Phase 2: Polish

- [ ] Pretty URL (GitHub Pages redirect or custom subdomain)
- [ ] Super seed — get full project/activity list for all SCG consultants
- [ ] Accumulator persistence for 15-min rounding across days
- [ ] Cross-device test (start on one device, stop on another)

## Phase 3: Kleer sync

- [ ] Chrome extension
- [ ] Inspect Kleer's form submission (DOM or internal API)
- [ ] Auto-fill Kleer from sheet data
- [ ] After sync: move synced entries from Entries tab to a Log tab, then clear Entries
  - Keeps loading times fast as data grows
  - Log tab is append-only archive, never read by the app
  - Only the app's backend touches Entries; Log is just for history
