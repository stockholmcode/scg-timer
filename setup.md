# Setup Guide

## For developers (deploying)

### Prerequisites

- Node.js installed
- `clasp` installed: `npm install -g @google/clasp`
- Logged in to clasp: `clasp login` (select your `@stockholmcode.se` account)
- Apps Script API enabled: https://script.google.com/home/usersettings

### Deploy

```bash
cd apps-script
clasp push --force
clasp deploy -i AKfycbzN_N87CFV22ZVy79iPggXGq9QBbIzIC_kccx4lyFM32WcArW6v0Pzq4mJVvgGmmyfz --description "description"
```

The deployment URL stays the same across deploys.

### First-time project setup (already done)

```bash
cd apps-script
clasp create --type standalone --title "SCG Timer"
clasp push --force
clasp deploy --description "SCG Timer v1"
```

## For users

1. Open the app URL (get it from a colleague or the deployment output)
2. Sign in with your `@stockholmcode.se` Google account when prompted
3. A Google Sheet called "SCG Timer" is automatically created in your Drive
4. Start tracking time

### Managing projects/activities

1. Open the "SCG Timer" sheet in your Google Drive
2. Go to the **Projects** tab
3. Each row is a project/activity combination with an `enabled` column
4. Set `enabled` to `TRUE` or `FALSE` to show/hide in the dropdown
5. Add new rows for new project/activity combinations

### Notes

- The app URL is the same for everyone — just share it with colleagues
- Each user gets their own sheet with their own data
- The project/activity list is per-user — each person manages their own
