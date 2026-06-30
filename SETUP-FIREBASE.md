# 🔐 Set up Google login + profiles + points (Firebase) — ~10 minutes

This connects the **"Sign in with Google"** button to real accounts, and saves each
child's **profile** and **points** to the cloud (Firestore) so they follow the
child across devices. Until you finish this, the app still works — it just shows
the on-device "Play without signing in" flow.

You'll do everything in the free **Firebase console**. No coding.

---

## Step 1 — Create a Firebase project
1. Go to <https://console.firebase.google.com> → **Add project**.
2. Name it (e.g. `learning-land`). You can **disable Google Analytics** (not needed).
3. Click **Create project**.

## Step 2 — Add a Web app & copy the config
1. On the project home, click the **`</>` (Web)** icon to add a web app.
2. Nickname it `pogogy` → **Register app** (skip Hosting).
3. You'll see a `firebaseConfig = { ... }` block. **Copy those values.**
4. Open **`js/config.js`** in the repo and paste them into the `firebase` object:

```javascript
firebase: {
  apiKey: 'AIza....',
  authDomain: 'learning-land-xxxx.firebaseapp.com',
  projectId: 'learning-land-xxxx',
  storageBucket: 'learning-land-xxxx.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abc123'
}
```
*(These keys are meant to be public — they identify your project, they don't grant access. Access is controlled by the rules in Step 4.)*

## Step 3 — Turn on Google sign-in
1. In the console: **Build → Authentication → Get started**.
2. **Sign-in method** tab → click **Google** → **Enable** → pick a support email → **Save**.
3. Go to the **Settings** tab → **Authorized domains** → **Add domain** and add:
   - `pogogy.com`
   - `www.pogogy.com`
   - `ranydone.github.io`
   *(localhost is already allowed for testing.)*

## Step 4 — Create the database + lock it down
1. **Build → Firestore Database → Create database**.
2. Choose **Production mode** → pick a location near you (e.g. asia-south1 for India) → **Enable**.
3. Open the **Rules** tab, replace everything with this, and **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Each signed-in user can read/write ONLY their own profile.
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## Step 5 — Save & deploy
Save `js/config.js`, then commit & push (or just send me the `firebaseConfig` values
and I'll paste them in and deploy).

## Step 6 — Test
1. Open <https://pogogy.com>, click **🔵 Sign in with Google**, pick your account.
2. First time, it asks for the child's name + school → **Save & Play**.
3. Play a game to earn stars, then tap the **👤** button on the home screen — your
   **Total Stars**, **Today**, and **Level** should show, saved to your account.
4. In the Firebase console → **Firestore → `users`** you'll see one document per
   signed-in family (name, school, email, points) — that's your tracking list.

---

## How it behaves
- **Sign in with Google** → profile + points saved to the cloud, synced across devices.
- **Play without signing in** → still works, saved only on that device (great for quick play).
- Points update live: every star earned increments the child's cloud total.

## Viewing your users (for tracking / monetization)
Firebase console → **Firestore Database → `users` collection**. Each row =
one account with `childName`, `school`, `email`, `points`, `lastPlayed`. You can
also see total accounts under **Authentication → Users**. (For a fancier
dashboard or CSV export later, I can add that.)

## Privacy reminder (children's data)
You're storing kids' names, schools, and a parent's Google email. Keep it minimal,
make sure a parent is the one signing in (Google accounts are 13+, which helps),
and add a short privacy note when you share/monetize. India's DPDP Act / GDPR-K /
COPPA have rules for children's data — worth a quick read before scaling. I can add
a consent screen + privacy page whenever you want.

## Costs
Firebase's free **Spark** plan covers far more than a small app needs (50k reads,
20k writes/day; unlimited Google logins). You only pay if you grow a lot — and
you'd choose to upgrade, it won't surprise-bill on the free plan.
