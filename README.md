# SCG Timer

A start/stop timer that stores time entries in Google Sheets and syncs them to Kleer for Stockholm Code Group consultants.

## What it does

- Start/stop timer per activity with one click
- One row per activity per day in a Google Sheet
- Day view with editable entries, week view with editable grid
- Chrome extension syncs entries to Kleer with 15-minute rounding
- Synced dates are locked to prevent accidental edits
- Archived entries keep the sheet fast as data grows

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Google Apps Script (web app via clasp)              │
│                                                     │
│  doGet() → serves Index.html (timer UI)             │
│  doGet(?action=...) → JSON API for extension        │
│  google.script.run → backend calls from UI          │
│                                                     │
│  Backend: getInitData, startTimer, stopTimer,        │
│  getEntries, getWeekEntries, addEntry, updateEntry, │
│  deleteEntry, getProjectsWithKleerIds,              │
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
│  Sync flow:                                         │
│  1. Check sync checkpoint (last synced date)        │
│  2. Fetch all weeks from checkpoint+1 to yesterday  │
│  3. Apply 15-min rounding with accumulator          │
│  4. Create/update events in Kleer                   │
│  5. Save accumulator + advance checkpoint per week  │
│  6. Archive synced entries to Log tab               │
└─────────────────────────────────────────────────────┘
```

## Timer features

- **Start/stop**: Play/stop toggle per row. One timer at a time.
- **Accumulation**: Multiple start/stops on the same activity add up.
- **Day navigation**: Back/forward arrows + Today button.
- **Week view**: Editable grid, Mon-Sun. Tab between cells. Row/column totals.
- **Flexible input**: `1` = 1h, `1.5` = 1:30, `1:30` = 1:30.
- **Caching**: Projects and day entries cached in localStorage. Cached data shown instantly, refreshed from server in background.
- **Mobile**: Touch detection with zoom 2.2x and larger targets.
- **Editable while running**: All entries and navigation work. Only the running entry's time is locked.

## Kleer sync

The Chrome extension syncs time entries from the Google Sheet to Kleer (my.kleer.se).

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

### Entry archiving

After sync, entries with `date <= checkpoint` are moved from the Entries tab to the Log tab (append-only archive). This keeps the Entries tab small for fast page loads.

## Project structure

```
kleer/
├── README.md
├── TODO.md
├── setup.md
├── apps-script/
│   ├── .clasp.json         # clasp project config
│   ├── appsscript.json     # Apps Script manifest
│   ├── Code.gs             # Backend
│   └── Index.html          # Frontend (served by Apps Script)
└── chrome-extension/
    ├── manifest.json        # Manifest V3
    ├── popup.html           # Extension popup UI
    └── popup.js             # Sync logic
```

## Deployment

### Apps Script

```bash
cd apps-script
clasp push --force
clasp deploy -i AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz --description "description"
```

Stable URL: `https://script.google.com/macros/s/AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz/exec`

### Chrome extension

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click "Load unpacked"
4. Select the `chrome-extension/` folder

## Setup

See [setup.md](setup.md) for first-time setup instructions.
