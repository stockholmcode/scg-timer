# Setup Guide

## For users

1. Open [stockholmcode.github.io/scg-timer](https://stockholmcode.github.io/scg-timer)
2. Sign in with your `@stockholmcode.se` Google account when prompted
3. A Google Sheet called "SCG Timer" is automatically created in your Drive
4. You'll see "No activities configured" — install the Chrome extension to get your projects

### Installing the Chrome extension

1. Clone the repo: `git clone git@github.com:stockholmcode/scg-timer.git`
2. Open `chrome://extensions/`
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked**
5. Select the `chrome-extension/` folder from the cloned repo

### First sync

1. Log in to [my.kleer.se](https://my.kleer.se) in Chrome
2. Click the **SCG Sync** floating button (bottom right on Kleer), or click the extension icon
3. The extension auto-syncs your projects from Kleer on first use
4. Set your sync checkpoint (the date from which to start syncing)
5. Reload the timer app — your projects should now appear

### Updating the extension

```bash
cd scg-timer
git pull
```

Then go to `chrome://extensions/` and click the reload icon on the extension.

### Managing projects/activities

Projects are synced from Kleer automatically each time you sync. To hide unwanted activities:

1. Open the "SCG Timer" sheet in your Google Drive
2. Go to the **Projects** tab
3. Set `enabled` to `FALSE` for activities you don't use

### Notes

- The app URL is the same for everyone — each user gets their own sheet
- Projects are personal — they come from your Kleer assignments
- Only dates before today are synced (today and future are never synced)
- The sync checkpoint locks synced dates — you can't edit them in the timer

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
