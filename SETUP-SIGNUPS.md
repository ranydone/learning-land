# 📋 Set up signup tracking (Google Sheet) — ~5 minutes

The site has an **"Enter to have fun"** screen that asks for the child's **name**,
**school**, and an optional **parent contact**. To collect those entries into a
spreadsheet **you own**, do the steps below once. Until you do, the app works
fine — it just doesn't log anything.

## What you'll get
Every time someone enters, a new row appears in your Google Sheet:

| Time | Child Name | School | Class | Parent Contact | Source (link) | Device |
|------|------------|--------|-------|----------------|---------------|--------|
| 30 Jun 2026 09:10 | Aanya | Little Stars KG | PP1 | 98xxxxxxx | wa.me/… | Android Chrome |

"Source" shows where they clicked your link from (WhatsApp, etc.) so you can see
which sharing works best.

## Step 1 — Make the Sheet
1. Go to <https://sheets.new> and create a sheet. Name it e.g. **Pogogy Signups**.
2. In row 1, type these headers (optional but tidy):
   `Time` `Child Name` `School` `Class` `Parent Contact` `Source` `Device`

## Step 2 — Add the script
1. In the Sheet menu: **Extensions → Apps Script**.
2. Delete whatever is there and paste this in:

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Signups') || ss.getSheets()[0];
    var d = JSON.parse(e.postData.contents);
    sheet.appendRow([ new Date(), d.child || '', d.school || '', d.class || '', d.parent || '', d.ref || '', d.ua || '' ]);
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

3. Click **Save** (💾).

## Step 3 — Publish it as a web app
1. Click **Deploy → New deployment**.
2. Click the ⚙️ gear → choose **Web app**.
3. Set:
   - **Description:** `signups`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
4. Click **Deploy**, then **Authorize access** and allow it (it's your own script).
5. Copy the **Web app URL** — it ends in `/exec`.

## Step 4 — Plug the URL into the site
Open `js/config.js` and paste your URL between the quotes:

```javascript
window.APP_CONFIG = {
  signupEndpoint: 'https://script.google.com/macros/s/AKfy..../exec'
};
```

Save, then commit & push (or just send me the URL and I'll put it in and deploy).

## Step 5 — Test
Open the live site, enter a name + school, tap **Enter to have fun!** —
a new row should appear in your Sheet within a second. 🎉

---

## Notes worth knowing
- **One row per device, per change.** To avoid spamming the Sheet on every
  refresh, the app logs a person once and again only if their name/school
  changes. So "tracking" = unique signups, not every page view. (Want a row
  for *every* visit, or daily-active counts instead? I can change that.)
- **The endpoint is public.** Because this is a static site, the script URL
  lives in `config.js` in the public repo. That's normal for this pattern, but
  it means someone could, in theory, send junk rows. If that ever happens, tell
  me and I'll add a spam guard (a shared token + Google's free reCAPTCHA/Turnstile).
- **You're collecting children's data.** Names + schools of kids is personal
  data. If you share the link beyond family and especially if you monetize,
  please: collect the **minimum** you need, get a **parent's consent** (the form
  already says "Grown-up: please fill this in"), and add a short **privacy note**
  saying what you collect and why. Depending on your country (India's DPDP Act,
  GDPR-K, US COPPA) there are rules about kids' data — worth a quick read before
  you scale. I can add a simple consent checkbox + privacy page whenever you like.

## Thinking about monetization later?
Once signups flow into the Sheet you can: see demand by school/area, contact
parents (with consent), and decide on a model — e.g. free with a "Pro" unlock,
school tie-ups, or printable worksheet packs. When you're ready, a stronger
backend (Firebase/Supabase) gives you logins + payments; I can migrate the
signup form to that without changing the kid-facing experience.
