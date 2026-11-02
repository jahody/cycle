# 🌸 CycleSync - Menstrual Cycle Google Calendar Integration

> Automatically project and track your 4-phase menstrual cycle for **1 full year (~14 cycles)** in Google Calendar, with instant recalibration whenever your cycle starts earlier or later than anticipated.

👉 **Open the app: [jahody.github.io/cycle](https://jahody.github.io/cycle/)** (sign in with your Google account; it only ever touches your own calendar)

---

## ✨ Features

- **🔬 4 Biologically Accurate Phases (28 Days Total)**:
  - 🔴 **Menstrual Phase (Days 1–5)**: Rest, recovery & self-care
  - 🌱 **Follicular Phase (Days 6–14)**: Rising energy, creativity & new ideas
  - 🦋 **Ovulatory Phase (Days 15–18)**: Peak energy & fertility window
  - 🌙 **Luteal Phase (Days 19–28)**: Winding down, organization & focus
- **📅 1-Year Projections**: Marks every day of the next 14 cycles in Google Calendar with a small phase icon (🔴 🌱 🦋 🌙), shown like a weather forecast instead of long coloured bars. Clicking a day shows what that phase means for hormones, energy, body, movement, food and focus.
- **⚡ Instant Recalibration**: Pick your actual period start date anytime — the old projection is removed and the next year is regenerated from the new date.
- **🛡️ Dedicated Secondary Calendar**: Manages a separate `🌸 Cycle Tracker` calendar so your primary work/personal calendar remains uncluttered.
- **📱 Phone Friendly**: Add the app to your iOS / Android Home Screen for 1-tap logging.

---

## 📖 Complete Setup Guide

To run your own copy, or to work on the code:

👉 **[Read the Full Setup Guide (SETUP_GUIDE.md)](SETUP_GUIDE.md)**

---

## 🚀 Run Your Own Copy (2 Minutes)

1. Go to **[script.google.com](https://script.google.com)** ➔ Click **+ New Project**.
2. Copy [`apps_script/SingleFile_Code.js`](apps_script/SingleFile_Code.js) and paste it into `Code.gs`.
3. Click **Deploy** ➔ **New deployment** ➔ Select **Web app**:
   - **Execute as**: `User accessing the web app` *(so anyone can use their own Google Calendar)*
   - **Who has access**: `Anyone with a Google Account`
4. Authorize and copy your URL!

---

## 🛠️ Development

The app is a Google Apps Script web app. The code lives in `apps_script/` and is deployed with [clasp](https://github.com/google/clasp):

```bash
npm install
npm test             # runs apps_script/Code.js against a fake Google Calendar
npm run build        # regenerates SingleFile_Code.js after editing Code.js or Index.html
npm run gas:deploy   # pushes the code and points the live web app at the new version
```

On Windows PowerShell with script execution disabled, `npm` and `npx` are blocked; use `npm.cmd` and `npx.cmd` instead (for example `npm.cmd run gas:deploy`).

---

## 📁 Repository Structure

```
├── apps_script/
│   ├── Code.js              # Apps Script backend: phases, calendar sync, cycle status
│   ├── Index.html           # Apps Script frontend UI
│   ├── SingleFile_Code.js   # Code.js + Index.html in one file for copy-paste setup (npm run build)
│   └── appsscript.json      # Apps Script manifest (matches the live project)
├── docs/
│   └── index.html           # GitHub Pages: forwards jahody.github.io/cycle to the live app
├── src/
│   ├── build_single_file.js # Builds SingleFile_Code.js
│   └── tests/test_cycle.js  # Tests for Code.js against a fake Google Calendar
├── .clasp.json              # Links this repo to the live Apps Script project
├── SETUP_GUIDE.md           # Step-by-step setup documentation & troubleshooting
└── README.md
```
