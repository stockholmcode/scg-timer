# SCG Timer

A simple start/stop timer that stores time entries in Google Sheets for Stockholm Code Group consultants.

## Problem

Tracking how long you work on different projects and activities throughout the day is tedious. Reconstructing hours at the end of the week is guesswork.

## Solution

A lightweight web-based timer that:
- Lets you start/stop a timer per activity with one click
- Stores one row per activity per day in a Google Sheet
- Day view with editable entries and week overview
- Works from any computer (shared backend via Google Sheets)

The data can then be used to report time in Kleer or any other system.

## Requirements

### Functional Requirements

1. **Start/stop timer**: Play/stop toggle button per activity row. Only one timer can run at a time. Switching activities auto-stops the current one.
2. **One row per activity per day**: Stopping a timer adds elapsed seconds to the existing row. Multiple start/stops accumulate.
3. **Editable entries**: Click any row to edit project, activity, and time. Flexible input: `1` = 1h, `1.5` = 1:30, `1:30` = 1:30.
4. **Add/delete entries**: Add new activity rows via modal. Delete via edit modal.
5. **Day navigation**: Back/forward arrows, "Today" button.
6. **Week view**: Grid with activities as rows, Mon-Sun as columns. Editable cells. Click empty cells to add. Click day header to go to day view. Row and column totals.
7. **Project/activity management**: Managed in a Google Sheet tab — no code changes needed to add/remove. `enabled` flag controls dropdown visibility.
8. **Cross-device access**: Works from any computer or phone with a browser.
9. **Multi-user**: Any `@stockholmcode.se` Google account can use the tool. Each user gets their own Google Sheet auto-created on first use.
10. **Editable while running**: All entries and navigation work while a timer is running. Only the running entry's time is locked.
11. **Mobile support**: Touch-optimized with larger targets. Works on Android via "Add to Home screen".

### Non-Functional Requirements

1. **Minimal friction**: Last project/activity remembered. Project list and day entries cached in localStorage. Single API call on page load. Cached data shown instantly, refreshed in background.
2. **No infrastructure to maintain**: No servers, databases, or cloud projects beyond a Google Sheet.
3. **Simple tech**: Plain HTML/CSS/JS served from Google Apps Script. No build step.
4. **Data transparency**: All data visible and editable in the Google Sheet.

### Out of Scope (Future Phases)

- Chrome extension to sync entries into Kleer's UI automatically
- Ingesting project/activity list from Kleer
- 15-minute rounding with accumulator persistence
- Pretty URL (custom domain or GitHub Pages redirect)
- Multiple concurrent timers
- After Kleer sync: archive entries to Log tab to keep load times fast

## Architecture

### Components

```
┌──────────────────────────────────────────────┐
│          Google Apps Script                    │
│          (standalone project, deployed        │
│           as web app via clasp)               │
│                                              │
│  doGet() ──► serves Index.html               │
│                                              │
│  Index.html uses google.script.run           │
│  to call backend functions (no CORS)         │
│                                              │
│  Backend functions:                          │
│  - getInitData()     (projects + active +    │
│                       today's entries)       │
│  - startTimer()      (write to Active tab)   │
│  - stopTimer()       (calc elapsed, update   │
│                       Entries, clear Active)  │
│  - getEntries()      (by date)               │
│  - getWeekEntries()  (Mon-Sun)               │
│  - addEntry()        (date-ordered insert)   │
│  - updateEntry()     (seconds only)          │
│  - updateEntryFull() (project+activity+secs) │
│  - deleteEntry()                             │
│                                              │
│  Executes as: accessing user                 │
│  Creates per-user sheet on first use         │
└──────────────────┬───────────────────────────┘
                   │
                   │ SpreadsheetApp (per user)
                   ▼
┌──────────────────────────────────────────────┐
│  User's Google Sheet ("SCG Timer")            │
│  (auto-created in Drive)                     │
│                                              │
│  Tab: Entries                                │
│    date, project, activity, seconds          │
│    (one row per activity per day)            │
│                                              │
│  Tab: Active                                 │
│    project, activity, start_time             │
│    (0 or 1 rows — the running timer)         │
│                                              │
│  Tab: Projects                               │
│    project, activity, enabled                │
│    (one row per combination)                 │
│                                              │
│  Tab: Accumulator                            │
│    project, activity, remainder_minutes      │
│    (for future 15-min rounding)              │
└──────────────────────────────────────────────┘
```

### Data Flow

1. User opens the Apps Script web app URL
2. Google handles authentication (must be `@stockholmcode.se`)
3. `doGet()` serves `Index.html`
4. On load, `getInitData()` returns projects, active timer, and today's entries in one call
5. Projects are cached in localStorage for instant subsequent loads
6. User clicks play on a row → `startTimer()` writes to Active tab
7. User clicks stop → `stopTimer()` calculates elapsed seconds, adds to the matching Entries row (creating it if needed), clears Active tab
8. Running row shows saved time + live elapsed (updated every second client-side)

### Deployment

Managed via [clasp](https://github.com/nicholaschiang/clasp) (Google Apps Script CLI):

```bash
cd apps-script
clasp push --force
clasp deploy -i <deployment-id> --description "description"
```

Stable deployment URL does not change between deploys.

### Security

- The Apps Script web app is deployed with access set to "Anyone" (Google OAuth still required)
- Execute as: accessing user (each user's script runs in their own Google context)
- Each user's Google Sheet is private to them
- No separate frontend hosting — HTML served from Apps Script, no CORS

## Project Structure

```
kleer/
├── README.md               # This file
├── TODO.md                 # Implementation plan and status
├── setup.md                # Setup instructions
├── index.html              # Standalone frontend (not used — kept for reference)
└── apps-script/
    ├── .clasp.json          # clasp project config
    ├── appsscript.json      # Apps Script manifest
    ├── Code.gs              # Backend
    └── Index.html           # Frontend (served by Apps Script)
```

## Initial Project/Activity Data

New sheets are seeded with these default combinations (from Kleer). Users can then enable/disable as needed in their Projects tab.

**4 - Discoveryplus (Peter Borg)**
- On-call, Holiday
- On-call, Time off
- On-call, Weekday
- On-call, Weekend
- On-call, Work, Rate 1
- On-call, Work, Rate 2
- Overtime, Rate 1
- Overtime, Rate 2
- System development
- Travel time

**13 - SCG Internrapportering**
- Ω All other internal time
- Ω Conference / Kick-off – internal
- Ω Employee Coaching / Check-in
- Ω Internal meeting – planned
- Ω Recruitment
- Ω Sales work / Client meetings
- Ω Training – planned

Note: These defaults are a starting point. Each user's project list will differ based on their Kleer assignments. Users manage their own list directly in the Google Sheet.

## Setup

See [setup.md](setup.md) for step-by-step instructions.
