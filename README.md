# The Operational Bottleneck Calculator
**By Zerocode — The Operational Fix**

A client-side lead generation calculator that helps established business owners in Latin America quantify the exact cost of their operational bottleneck. No server required. No login. Works offline.

---

## How to open locally

1. Download or clone this folder to your computer.
2. Double-click `index.html` — it opens in any modern browser.
3. No build step, no npm install, no dependencies.

---

## How to deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New → Project**.
3. Drag and drop the entire `lead-magnet/` folder into the upload area.
4. Click **Deploy**. Done — you get a live URL in about 30 seconds.

Alternatively, push the folder to a GitHub repo and import from Vercel for automatic redeploys.

---

## How to set up email delivery (Brevo)

The calculator sends two emails on every submission — no backend required:
- **To the user** — a branded HTML email with their full results and a CTA to book a call
- **To you (Zerocode)** — a lead alert with their contact details and numbers, with a one-click reply button

### Step 1 — Get your Brevo API key

1. Log in to [brevo.com](https://www.brevo.com)
2. Go to **Settings → API Keys**
3. Click **Generate a new API key**
4. Name it `bottleneck-calculator` and set permission to **Transactional emails only**
5. Copy the key (starts with `xkeysib-...`)

### Step 2 — Verify your sender email

In Brevo → **Senders & IP** → **Senders** → confirm that `andres@zerocode.com` (or your preferred sender) is verified. If not, add and verify it.

### Step 3 — Paste the API key into the config

Open `js/calculator.js` and update the `BREVO_CONFIG` block at the top of the file:

```js
const BREVO_CONFIG = {
  apiKey:            'xkeysib-abc123...',   // your Brevo API key
  senderName:        'Zerocode',
  senderEmail:       'andres@zerocode.com', // must match a verified sender in Brevo
  notificationEmail: 'andres@zerocode.com', // where lead alerts are delivered
};
```

That's it. No templates to create, no dashboard configuration — the email HTML is built directly in the code. Once the key is filled in, emails go live automatically.

### What the emails look like

**User email** — branded HTML with:
- Three result cards (monthly, annual, break-even) in Zerocode navy
- Full cost breakdown table
- CTA button to book the Calendly call

**Lead notification email** — operational HTML with:
- Contact info (name, email, LinkedIn)
- Their industry and bottleneck type
- All calculated figures
- "Reply to lead" and "Open Calendly" quick-action buttons

### Note on API key exposure

The API key lives in client-side JS and is visible in the browser source. This is acceptable for a lead magnet — the key only has permission to send transactional emails, so the maximum risk is someone sending emails from your domain. Monitor usage in the Brevo dashboard and regenerate the key if needed.

---

## How to customize the Calendly link

Open `index.html` and find this line (in Screen 7):

```html
<a href="https://calendly.com/andres-diaz-/discoverycall" ...>
```

Replace the URL with your own Calendly link.

---

## How to update brand colors

Open `css/styles.css`. At the very top of the file, find the `:root` block:

```css
:root {
  --primary: #1B3A5C;   /* dark blue  — headings, nav, CTA background */
  --accent:  #1A7A4A;   /* green      — buttons, result cards, sliders */
  ...
}
```

Change `--primary` and/or `--accent` to any hex value. All colors throughout the calculator update automatically.

---

## How to add a logo

Drop your logo file (PNG or SVG) into the `assets/` folder, then in `index.html` replace the text brand blocks:

```html
<div class="brand-block">
  <span class="brand-name">Zerocode</span>
  <span class="brand-tagline">The Operational Fix</span>
</div>
```

with:

```html
<div class="brand-block">
  <img src="assets/logo.png" alt="Zerocode" height="40" />
</div>
```

---

## File structure

```
lead-magnet/
├── index.html          ← all 8 screens (welcome + 6 steps + results)
├── css/
│   └── styles.css      ← all styles, responsive + print
├── js/
│   └── calculator.js   ← all logic (state, validation, calculations, rendering)
├── assets/
│   └── (place logo here)
└── README.md
```

---

## Privacy

All calculations happen entirely in the browser. Lead details (name, email, LinkedIn) are saved to `localStorage` on the user's device and, when EmailJS is configured, transmitted to EmailJS servers solely for email delivery. No data is stored in any database controlled by Zerocode.

---

## Tech stack

- Pure HTML5, CSS3, JavaScript (ES6+)
- Zero frameworks, zero dependencies, zero CDN calls
- Works offline after the first load
