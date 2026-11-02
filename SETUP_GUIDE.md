# 🌸 CycleSync — Complete Setup & Architecture Guide

CycleSync tracks your menstrual cycle across **4 distinct, biologically accurate phases** (28 days total) and marks **every day for 1 full year ahead (~14 cycles)** in Google Calendar with a small phase icon. When your period arrives earlier or later than projected, picking your new start date immediately clears the old projection and recalculates the next year in real time.

---

## 🔬 Cycle Phase Specifications

| Phase | Duration | Cycle Days | Focus & Energy |
|---|---|---|---|
| 🔴 **Menstrual** | **5 days** | Days 1–5 | Rest, recovery, self-care |
| 🌱 **Follicular** | **9 days** | Days 6–14 | Rising energy, creativity, social |
| 🦋 **Ovulatory** | **4 days** | Days 15–18 | Peak stamina, fertile window |
| 🌙 **Luteal** | **10 days** | Days 19–28 | Winding down, organization, focus |

Each day gets one all-day event titled with just its icon, in a white `🌸 Cycle Tracker` calendar, so it reads like a weather forecast. The event description explains the phase (hormones, energy, body, movement, food, focus) and when the next phase or period starts.

---

## 👋 Just Want to Use It?

Open **[jahody.github.io/cycle](https://jahody.github.io/cycle/)**, sign in with your Google account and pick the date your last period started. The app runs as you and only ever touches your own calendar.

The rest of this guide is for running your own copy or working on the code.

---

# Run Your Own Copy (Google Apps Script)

Runs 100% on Google's cloud infrastructure. No servers, no Google Cloud project approval, works for **any user** on desktop and mobile.

### Step 1: Create the Project in Apps Script
1. Open **[script.google.com](https://script.google.com)** in your browser.
2. Click **+ New Project** (top left).
3. Rename the project to `CycleSync` at the top.

### Step 2: Add the Code

#### If using the 1-File method (Easiest):
1. In `Code.gs`, delete everything.
2. Copy and paste the entire content of [`apps_script/SingleFile_Code.js`](apps_script/SingleFile_Code.js).
3. Click **Save (💾)**.

#### If using the 2-File method:
1. In `Code.gs`, paste [`apps_script/Code.js`](apps_script/Code.js).
2. Click **+** next to *Files* ➔ Select **HTML** ➔ Name it **`index`** (lowercase).
3. Paste [`apps_script/Index.html`](apps_script/Index.html) into it.
4. Click **Save (💾)**.

### Step 3: Deploy for Everyone
1. Click the blue **Deploy** button (top right) ➔ **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and choose **Web app**.
3. Configure the deployment settings:
   - **Description**: `CycleSync Web App`
   - **Execute as**: `User accessing the web app` *(crucial: this ensures each person accesses their OWN Google Calendar)*
   - **Who has access**: `Anyone with a Google Account` (or `Anyone`)
4. Click **Deploy**.
5. Grant permissions:
   - Click **Authorize access** ➔ choose your Google Account.
   - Click **Advanced** ➔ **Go to CycleSync (unsafe)** *(standard Google warning for personal Apps Scripts)* ➔ **Allow**.
6. Copy your **Web App URL**!

---

# Working on the Code (clasp)

This repository is linked to the live Apps Script project with [clasp](https://github.com/google/clasp), so changes are deployed from the command line instead of by copy-paste.

### One-time setup
1. Turn on the **Apps Script API** at [script.google.com/home/usersettings](https://script.google.com/home/usersettings).
2. Install dependencies and log in:
   ```bash
   npm install
   npx clasp login
   ```
   On Windows PowerShell with script execution disabled, `npm` and `npx` are blocked; use `npm.cmd` and `npx.cmd` instead. If the browser can't hand the login back to clasp, use `npx clasp login --no-localhost` and paste the address you land on into the terminal.

### Everyday commands
| Command | What it does |
|---|---|
| `npm test` | Runs `apps_script/Code.js` against a fake Google Calendar |
| `npm run build` | Regenerates `SingleFile_Code.js` from `Code.js` + `Index.html` |
| `npm run gas:status` | Lists the files clasp will upload |
| `npm run gas:pull` | Downloads the live project's code into `apps_script/` |
| `npm run gas:deploy` | Uploads the code and points the live web app at a new version (the URL stays the same) |

clasp uploads only `Code.js`, `Index.html` and `appsscript.json` (see `.claspignore`).

### Using your own Apps Script project
`.clasp.json` holds the script ID and the `gas:deploy` script in `package.json` holds the web app's deployment ID. Replace both with your own (from `npx clasp list-scripts` and `npx clasp list-deployments`).

---

## 📱 How to Install on Your Phone (Home Screen)

Once the app is open on mobile:
* **iOS (Safari)**: Tap the **Share** icon (square with arrow up) ➔ scroll down and tap **Add to Home Screen** ➔ Name it **CycleSync** 🌸.
* **Android (Chrome)**: Tap the **3 dots** (top right) ➔ tap **Add to Home Screen**.

It then opens CycleSync with one tap.

---

## ❓ Frequently Asked Questions & Troubleshooting

### Q: Does this touch my existing calendar events?
**No**. CycleSync creates and manages its own dedicated secondary calendar named **`🌸 Cycle Tracker`**. Your personal and work events are never modified, and you can toggle the cycle calendar on/off at any time in Google Calendar.

### Q: What happens when my period starts earlier or later?
Tap **"Started Today"** or pick the actual start date using the date picker. CycleSync will automatically:
1. Remove the existing phase icons from your `🌸 Cycle Tracker` calendar, including those before the new start date.
2. Add fresh daily icons for the next 14 cycles (~1 year) starting from the new date.

### Q: Can I get rid of the "This application was created by a Google Apps Script user" bar?
Not with Apps Script: Google adds it to every Apps Script web app. Embedding the app in another page hides it, but blocks Google sign-in on iPhone and in browsers that block third-party cookies, so CycleSync doesn't do that.

### Q: Can I use the predicted fertile days for contraception?
**No**. The phases are estimates based on a fixed 28-day cycle, not a reliable method of contraception.
