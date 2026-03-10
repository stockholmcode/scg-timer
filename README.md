# SCG Timer

A start/stop timer that stores time entries in Google Sheets and syncs them to Kleer for Stockholm Code Group consultants.

**App URL**: [stockholmcode.github.io/scg-timer](https://stockholmcode.github.io/scg-timer)

## What it does

- Start/stop timer per activity with one click
- One row per activity per day in a Google Sheet
- Day view with editable entries, week view with editable grid
- Optimistic UI — all actions respond instantly, server syncs in background
- Chrome extension syncs entries to Kleer with 15-minute rounding
- Synced dates are locked to prevent accidental edits
- Archived entries keep the sheet fast as data grows

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  GitHub Pages (stockholmcode.github.io/scg-timer)   │
│  └── iframe → Apps Script deployment                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Google Apps Script (web app via clasp)              │
│                                                     │
│  doGet() → serves Index.html (timer UI)             │
│  doGet(?action=...) → JSON API for extension        │
│  google.script.run → backend calls from UI          │
│                                                     │
│  Backend: getInitData, startTimer, stopTimer,        │
│  getEntries, getWeekEntries, addEntry, updateEntry, │
│  deleteEntry, getProjectsWithKleerIds, syncProjects,│
│  getAccumulator, updateAccumulator,                 │
│  getSyncCheckpoint, setSyncCheckpoint,              │
│  archiveSyncedEntries                               │
└──────────────────┬──────────────────────────────────┘
                   │ SpreadsheetApp
                   ▼
┌─────────────────────────────────────────────────────┐
│  Google Sheet ("SCG Timer", per user)               │
│                                                     │
│  Entries:     date, project, activity, seconds      │
│  Active:      project, activity, start_time         │
│  Projects:    project, activity, enabled,           │
│               kleer_project_id, kleer_activity_id,  │
│               kleer_client_name,                    │
│               kleer_project_number, kleer_billable  │
│  Accumulator: project, activity, remainder_minutes  │
│  Settings:    key, value (sync_checkpoint_date)     │
│  Log:         date, project, activity, seconds      │
│               (archived synced entries)              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                     │
│                                                     │
│  Reads SCG Timer data via Apps Script API            │
│  Reads/writes Kleer via Remix form POSTs            │
│  Auth: API token for Apps Script,                   │
│        __auth2 cookie for Kleer                     │
│                                                     │
│  Features:                                          │
│  - Floating "SCG Sync" button on Kleer pages        │
│  - Icon activates only on my.kleer.se               │
│  - Auto-syncs project list from Kleer on first use  │
│  - Syncs projects from Kleer on every sync          │
│                                                     │
│  Sync flow:                                         │
│  1. Sync projects from Kleer layout                 │
│  2. Check sync checkpoint (last synced date)        │
│  3. Fetch all weeks from checkpoint+1 to yesterday  │
│  4. Apply 15-min rounding with accumulator          │
│  5. Create/update events in Kleer                   │
│  6. Save accumulator + advance checkpoint per week  │
│  7. Archive synced entries to Log tab               │
└─────────────────────────────────────────────────────┘
```

## Timer features

- **Start/stop**: Play/stop toggle per row. One timer at a time.
- **Start from Add**: "Start" button in Add Activity modal for today.
- **Optimistic UI**: All actions update instantly. Server syncs in background.
- **Cached state**: Running timer, entries, and projects cached in localStorage for instant page loads.
- **Accumulation**: Multiple start/stops on the same activity add up.
- **Day navigation**: Back/forward arrows + Today button. Lock icon replaces back arrow on synced dates.
- **Week view**: Editable grid, Mon-Sun. Row/column totals. Live running timer.
- **Flexible input**: `1` = 1h, `1.5` = 1:30, `1:30` = 1:30.
- **Mobile**: Touch detection with zoom 2.2x and larger targets.

## Kleer sync

The Chrome extension syncs time entries from the Google Sheet to Kleer (my.kleer.se).

### Project sync

Projects and activities are synced from Kleer automatically:
- First use: if no projects exist, the extension auto-syncs from Kleer's layout
- Every sync: projects are refreshed from Kleer before syncing time entries
- The project list in Kleer determines what's available in the timer

### Rounding

Kleer expects 15-minute increments. The accumulator rounds to nearest 15 minutes per project+activity:

1. `available = actual_minutes + carried_remainder`
2. `reported = round_to_nearest_15(available)`
3. `new_remainder = available - reported`

The remainder carries forward across days and can go negative (borrowing from the future).

### Multi-week catch-up

If you haven't synced in a while, the extension processes all pending weeks in chronological order. After each week: accumulator and checkpoint are saved (safe resume point if anything fails).

### Sync checkpoint

A single date stored in the Settings tab. Everything on or before that date is:
- Locked in the UI (read-only, no add/edit/delete)
- Rejected by the backend (`assertNotLocked`)
- Only advances to the last date with actual sync actions (empty days stay editable)
- Auto-detected when switching back to the timer tab after syncing

### Entry archiving

After sync, entries with `date <= checkpoint` are moved from the Entries tab to the Log tab (append-only archive). This keeps the Entries tab small for fast page loads.

## Project structure

```
scg-timer/
├── README.md
├── TODO.md
├── setup.md
├── docs/
│   └── index.html           # GitHub Pages (iframe to Apps Script)
├── apps-script/
│   ├── .clasp.json           # clasp project config
│   ├── appsscript.json       # Apps Script manifest
│   ├── Code.gs               # Backend
│   └── Index.html            # Frontend (served by Apps Script)
└── chrome-extension/
    ├── manifest.json          # Manifest V3
    ├── popup.html             # Extension popup UI
    ├── popup.js               # Sync logic
    ├── background.js          # Icon activation + popup window
    ├── content.js             # Floating button on Kleer
    └── content.css            # Floating button styles
```

## Deployment

### Apps Script

```bash
cd apps-script
clasp push --force
clasp deploy -i AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz --description "description"
```

### Chrome extension

1. Clone this repo: `git clone git@github.com:stockholmcode/scg-timer.git`
2. Open `chrome://extensions/`
3. Enable Developer Mode
4. Click "Load unpacked"
5. Select the `chrome-extension/` folder
6. To update: `git pull` then click reload on the extension

## Setup

See [setup.md](setup.md) for first-time setup instructions.
