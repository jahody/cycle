# 🌸 CycleSync

Your menstrual cycle phases as small daily icons in Google Calendar (🔴 🌱 🦋 🌙), with tips for every day.

👉 **Open the app: [jahody.github.io/cycle](https://jahody.github.io/cycle/)**

---

## ✨ What it does

- **A small icon on every day of the next year**, in a separate `🌸 Cycle Tracker` calendar. Icons are all-day events shown as *Free* with no reminders, so they sit quietly at the top of each day like a weather forecast. The calendar's color matches a light or dark Google Calendar, so only the icon shows: it starts out matching your device's theme and can be switched in the app's menu.
- **Details on tap**: each day's event says which phase and day it is, when the next phase or period starts, and short notes on hormones, energy, body, movement, food and focus.
- **One tap when your period starts**: log *Today* or another day and the whole year is recalculated.
- **The app** shows today's phase and tips, the phases of the current cycle and your next three periods. It works on desktop and phones, in light and dark mode, and installs to an Android or iPhone home screen.

| Phase | Cycle days | Icon |
|---|---|---|
| Menstrual | 1–5 | 🔴 |
| Follicular | 6–14 | 🌱 |
| Ovulatory | 15–18 | 🦋 |
| Luteal | 19–28 | 🌙 |

Phases are estimates for a regular 28-day cycle, not medical advice or a method of contraception.

## 🔑 First sign-in

Google shows a “Google hasn’t verified this app” warning the first time, because CycleSync is a free personal project Google hasn't reviewed. The [app page](https://jahody.github.io/cycle/?about) walks through it step by step.

## 🔒 Privacy

CycleSync runs inside your own Google account as a Google Apps Script web app. Your start date is saved privately in that account, and the only calendar it changes is its own `🌸 Cycle Tracker`. Nothing is sent anywhere else. The app's menu has **Remove CycleSync from my calendar**, and access can be revoked at [myaccount.google.com/connections](https://myaccount.google.com/connections).

---

## 🛠️ How it works

| Part | What it is |
|---|---|
| `apps_script/Code.js` | Server side. Saves the start date, and keeps 28 recurring all-day events in the user's calendar (one per cycle day, repeating every 28 days, 14 times) through the Google Calendar API. Logging a new date moves those events instead of recreating them. |
| `apps_script/Index.html` | The app's page. |
| `apps_script/appsscript.json` | Apps Script manifest: runs as the signed-in user and enables the Calendar API. |
| `docs/` | The GitHub Pages site at jahody.github.io/cycle: landing page, install manifest and icons. Returning visitors are forwarded straight to the app. |
| `src/tests/test_cycle.js` | Runs `Code.js` against a fake Google Calendar. |
| `.clasp.json` | Links this folder to the live Apps Script project. |

## 💻 Development

One-time setup: turn on the **Apps Script API** at [script.google.com/home/usersettings](https://script.google.com/home/usersettings), then:

```bash
npm install
npx clasp login
```

Everyday commands:

```bash
npm test             # runs Code.js against a fake Google Calendar
npm run gas:deploy   # uploads apps_script/ and points the live web app at the new version (same URL)
```

`npm run gas:status`, `gas:pull` and `gas:push` list, download or upload the Apps Script files. On Windows PowerShell with script execution disabled, use `npm.cmd` and `npx.cmd` (for example `npm.cmd run gas:deploy`). If the browser can't hand the login back to clasp, use `npx clasp login --no-localhost`.

### Run your own copy

1. Create a project at [script.google.com](https://script.google.com) and copy its **Script ID** (Project Settings) into `.clasp.json`.
2. `npx clasp push --force`
3. In the Apps Script editor: **Deploy → New deployment → Web app**, *Execute as: User accessing the web app*, *Who has access: Anyone with a Google account*.
4. Put the new deployment ID into the `gas:deploy` script in `package.json`, and its `/exec` URL into `APP_URL` in `docs/index.html`.
