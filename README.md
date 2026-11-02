# 🌸 CycleSync - Menstrual Cycle Google Calendar Integration

> Automatically project and track your 4-phase menstrual cycle for **1 full year (~14 cycles)** in Google Calendar, with instant recalibration whenever your cycle starts earlier or later than anticipated.

👉 **Open the app: [jahody.github.io/cycle](https://jahody.github.io/cycle/)** (sign in with your Google account; it only ever touches your own calendar)

---

## ✨ Features

- **🔬 4 Biologically Accurate Phases (28 Days Total)**:
  - 🔴 **Menstrual Phase (Days 1–5)**: Rest, recovery & self-care (Tomato)
  - 🌱 **Follicular Phase (Days 6–14)**: Rising energy, creativity & new ideas (Flamingo)
  - 🦋 **Ovulatory Phase (Days 15–18)**: Peak energy & fertility window (Basil / Green)
  - 🌙 **Luteal Phase (Days 19–28)**: Winding down, organization & focus (Grape / Purple)
- **📅 1-Year Projections**: Marks every day of the next 14 cycles in Google Calendar with a small phase icon (🔴 🌱 🦋 🌙), shown like a weather forecast instead of long coloured bars. Clicking a day shows what that phase means for hormones, energy, body, movement, food and focus. *(The standalone PWA still creates 56 coloured phase events with the older 🌸 ⚡ icons.)*
- **⚡ Instant Recalibration**: Pick your actual period start date anytime — future projections are cleanly removed and regenerated for the next year.
- **🛡️ Dedicated Secondary Calendar**: Manages a separate `🌸 Cycle Tracker` calendar so your primary work/personal calendar remains uncluttered.
- **📱 Mobile App & PWA Ready**: Installable to iOS / Android Home Screen for 1-tap logging.

---

## 📖 Complete Setup Guide

For step-by-step instructions with screenshots and troubleshooting for both deployment methods:

👉 **[Read the Full Setup Guide (SETUP_GUIDE.md)](SETUP_GUIDE.md)**

---

## 🚀 Quick Setup Overview

### Option A: Google Apps Script Web App (Easiest — 2 Minutes)
1. Go to **[script.google.com](https://script.google.com)** ➔ Click **+ New Project**.
2. Copy [`apps_script/SingleFile_Code.js`](apps_script/SingleFile_Code.js) and paste it into `Code.gs`.
3. Click **Deploy** ➔ **New deployment** ➔ Select **Web app**:
   - **Execute as**: `User accessing the web app` *(so anyone can use their own Google Calendar)*
   - **Who has access**: `Anyone with a Google Account`
4. Authorize and copy your URL!

### Option B: Standalone Web App / PWA with Google OAuth
1. Create a Web OAuth Client ID in [Google Cloud Console](https://console.cloud.google.com).
2. Add your Client ID to [`app/index.html`](app/index.html).
3. Deploy the `app/` folder to [Cloudflare Pages](https://pages.cloudflare.com) or [Netlify Drop](https://app.netlify.com/drop).

---

## 📁 Repository Structure

```
├── apps_script/
│   ├── Code.js              # Apps Script backend with 5/9/4/10d phase logic
│   ├── Index.html           # Apps Script frontend UI
│   └── SingleFile_Code.js   # All-in-one Apps Script file (easiest copy-paste)
├── app/
│   ├── index.html           # Standalone PWA app with Google OAuth
│   ├── manifest.json        # Web app manifest for iOS/Android install
│   └── sw.js                # Service worker for offline caching
├── docs/
│   └── index.html           # GitHub Pages: forwards jahody.github.io/cycle to the live app
├── wrapper/
│   └── index.html           # Zero-banner iframe wrapper for Apps Script
├── src/
│   ├── cycle_logic.js       # Core cycle calculation engine
│   └── tests/test_cycle.js  # Unit test suite (verified 100% passing)
├── SETUP_GUIDE.md           # Step-by-step setup documentation & troubleshooting
└── README.md
```
