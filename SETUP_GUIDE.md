# 🌸 CycleSync — Complete Setup & Architecture Guide

CycleSync tracks your menstrual cycle across **4 distinct, biologically accurate phases** (28 days total) and projects them **1 full year ahead (~14 cycles / 56 events)** in Google Calendar. When your period arrives earlier or later than projected, picking your new start date immediately clears upcoming projections and recalculates the next year in real time.

---

## 🔬 Cycle Phase Specifications

| Phase | Duration | Cycle Days | Google Calendar Color | Focus & Energy |
|---|---|---|---|---|
| 🔴 **Menstrual** | **5 days** | Days 1–5 | Tomato (`11`) | Rest, recovery, self-care |
| 🌸 **Follicular** | **9 days** | Days 6–14 | Flamingo (`4`) | Rising energy, creativity, social |
| ⚡ **Ovulatory** | **4 days** | Days 15–18 | Basil / Green (`10`) | Peak stamina, fertile window |
| 🌙 **Luteal** | **10 days** | Days 19–28 | Grape / Purple (`3`) | Winding down, organization, focus |

---

## 🛠️ Choose Your Deployment Option

You have two complete implementations in this repository:

1. **[Option A: Google Apps Script Web App](#option-a-google-apps-script-web-app-recommended--zero-hosting)** ⭐ *(Recommended — 2 min setup, 100% free forever, no Google Cloud Console project required)*
2. **[Option B: Standalone Web App / PWA with Google OAuth](#option-b-standalone-web-app--pwa-with-google-oauth)** *(Custom branded web app with "Sign in with Google" button)*

---

# Option A: Google Apps Script Web App (Recommended — Zero Hosting)

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

# Option B: Standalone Web App / PWA with Google OAuth

A modern client-side Progressive Web App (PWA) with a native **"Sign in with Google"** button and zero Google Apps Script banners.

### Step 1: Create Google Cloud Project
1. Go to the **[Google Cloud Console](https://console.cloud.google.com)**.
2. Click the project dropdown at the top ➔ **New Project** ➔ Name: `CycleSync` ➔ **Create**.

### Step 2: Enable Google Calendar API
1. In the left navigation menu, go to **APIs & Services ➔ Library**.
2. Search for **Google Calendar API**.
3. Click on it and click **Enable**.

### Step 3: Configure Google Auth Platform / OAuth Consent Screen
1. In the left menu, go to **Google Auth Platform** (or **APIs & Services ➔ OAuth consent screen**).
2. If asked for User Type, select **External** ➔ click **Create**.
3. On the **Branding / App Information** screen:
   - **App name**: `CycleSync`
   - **User support email**: *Select your email from the dropdown*
   - **App logo**: *(Leave blank)*
   - **App domain (Home page, Privacy policy, Terms of service)**: ⚠️ **LEAVE ALL 3 BLANK** *(Entering `localhost` or invalid URLs here causes an error!)*
   - **Developer contact email**: *Type your email address*
   - Click **Save and Continue**.
4. On the **Scopes** screen:
   - Click **Add or Remove Scopes**.
   - Manually enter or check `https://www.googleapis.com/auth/calendar`
   - Click **Update** ➔ **Save and Continue**.
5. On the **Audience / Test Users** screen:
   - Under **Test users**, click **+ Add users**.
   - Add your email (and any friends/testers).
   - Click **Save and Continue**.

### Step 4: Create OAuth 2.0 Web Client ID
1. In the left menu, go to **Clients** (or **APIs & Services ➔ Credentials**).
2. Click **+ Create Credentials** (or **+ Create Client**) ➔ choose **OAuth client ID**.
3. **Application type**: Select **Web application**.
4. **Name**: `CycleSync Web Client`.
5. **Authorized JavaScript origins**:
   - Click **+ Add URI** and add: `http://localhost:3000` (for local testing)
   - Click **+ Add URI** and add your hosted domain (e.g. `https://cyclesync.pages.dev` or `https://yourdomain.com`).
6. Click **Create**.
7. Copy the **Client ID** (e.g. `123456789-abcdef.apps.googleusercontent.com`).

### Step 5: Configure the Frontend
1. Open [`app/index.html`](app/index.html).
2. Replace line 186:
   ```javascript
   const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
   ```
   with your actual Client ID.

### Step 6: Deploy Free to Cloudflare Pages or Netlify
* **Cloudflare Pages**: Go to [pages.cloudflare.com](https://pages.cloudflare.com) ➔ upload the `app/` folder ➔ get `https://cyclesync.pages.dev`.
* **Netlify Drop**: Go to [app.netlify.com/drop](https://app.netlify.com/drop) ➔ drag and drop the `app/` folder.
* **Local test**: Run `npx serve app -p 3000` and open `http://localhost:3000`.

---

## 📱 How to Install on Your Phone (PWA / Home Screen)

Once your URL is open on mobile:
* **iOS (Safari)**: Tap the **Share** icon (square with arrow up) ➔ scroll down and tap **Add to Home Screen** ➔ Name it **CycleSync** 🌸.
* **Android (Chrome)**: Tap the **3 dots** (top right) ➔ tap **Add to Home Screen** or **Install App**.

It opens full-screen like a native mobile app with instant 1-tap logging.

---

## ❓ Frequently Asked Questions & Troubleshooting

### Q: Why did Google say "Invalid URL: cannot contain a local host domain"?
**Fix**: In the Google Cloud Console OAuth Branding settings, leave the *Home page*, *Privacy policy*, and *Terms of service* fields **completely empty**. Google only allows public `https://` URLs in those fields.

### Q: How do I remove the Apps Script banner without building a standalone app?
**Fix**: Use the provided [`wrapper/index.html`](wrapper/index.html) file. Replace `YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with your Web App URL and host that single HTML file for free on Netlify Drop or Cloudflare Pages.

### Q: Does this touch my existing calendar events?
**No**. CycleSync creates and manages its own dedicated secondary calendar named **`🌸 Cycle Tracker`**. Your personal and work events are never modified, and you can toggle the cycle calendar on/off at any time in Google Calendar.

### Q: What happens when my period starts earlier or later?
Tap **"Started Today"** or pick the actual start date using the date picker. CycleSync will automatically:
1. Scan your `🌸 Cycle Tracker` calendar and remove all future projected phase events.
2. Schedule fresh phase events for the next 14 cycles (~1 year) based on the new start date.
3. Keep your past logged cycles intact for your records.
