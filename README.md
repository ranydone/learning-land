# 🌈 Pogogy

A colorful, **voice-guided learning website for a 5-year-old (KG1)**. Content
**refreshes every day** so there is something new to play with each morning — no
two days feel the same.

Built with plain HTML, CSS and JavaScript. **No build step, no installation, no
ads, no tracking.** It works offline once loaded and runs great on a phone,
tablet or computer.

## 🎮 What's inside

| Game | Skill | Examples |
|------|-------|----------|
| ⭐ **Daily Play** | A mixed set that is the *same all day, new each day* | A bit of everything |
| 🔢 **Numbers** | Counting, comparing, sequencing, adding | "How many apples?", "Which is bigger?", "What comes next?", "1🍎 + 2🍏 = ?" |
| ➕ **Add Up** | Basic addition (sums to 10) | Two groups of objects to count, shown with the number sentence ("3 + 5 = ?"), plus simple word problems and "one more". Read aloud as "count them all" |
| 📅 **Days & Months** | Calendar sequence & totals | Days of the week (Mon–Sun) and months (Jan–Dec): what comes next/before, the missing one, which comes first, and how many days in a week / months in a year |
| 🕐 **Tell Time** | Clock reading & time of day | Interactive analog clock: first "Make it 3 o'clock!" (tap the number to set the hand), then read the clock, plus morning/afternoon/night |
| 🔤 **Alphabets** | Letter recognition & phonics | "Apple starts with…?", "Find the letter B", "What comes after C?" |
| 🍎 **Fun Quiz** | World knowledge & reasoning | Animal sounds, "Which is a fruit?", odd-one-out, colors, real-life situations |
| 🧠 **Think & Code** | Logic / early coding | Continue the pattern, odd one out, biggest/smallest, "what happens first?", more/fewer |
| 📖 **Story Time** | Listening, values, imagination | Read-aloud picture stories (Thirsty Crow, Tortoise & Hare, Lion & Mouse…) each ending in a gentle moral. A new story each day, plus a "New Story" button |
| 🧩 **Memory Match** | Matching, focus, vocabulary | All cards stay face-up — tap two of the same picture to pair them; each picture's name is read aloud, so she learns words while she plays |

### Why "Think & Code" counts as coding for a 5-year-old
Early coding is really **logical thinking**: spotting patterns, sequencing steps
in order, sorting, and comparing. Those are exactly the puzzles in this section —
the building blocks every programmer uses, taught at a KG1 level. (See
`PARENTS.md` for the full learning plan and a 30-minute routine.)

## 🎚️ Class levels (PP1 · PP2 · PP3)
Every game scales its difficulty to the child's **class**, chosen in the profile:
- **PP1** — numbers to ~10, add to 10, o'clock, short patterns
- **PP2** — numbers to 20, **subtraction**, **half-past** time, upper/lowercase letters, opposites, missing letters, 8-pair memory
- **PP3** — numbers to 50, bigger add/subtract, longer patterns, 10-pair memory
Change the class anytime on the 👤 profile screen.

## 🔐 Accounts, profiles & points (optional)
Add **Google sign-in** so each child gets a profile and their **points are saved
to the cloud** and follow them across devices. Powered by Firebase Auth +
Firestore, all from the static site. Setup: [SETUP-FIREBASE.md](SETUP-FIREBASE.md).
Until configured, the app shows the on-device "Play without signing in" flow.

Tap the **👤** button on the home screen to see the profile: name, school, total
stars, today's stars, and a level badge.

## 📋 Signup tracking (optional, simpler)
Prefer no logins? The **"Play without signing in"** screen can log the child's
name, school, and optional parent contact to a free Google Sheet —
see [SETUP-SIGNUPS.md](SETUP-SIGNUPS.md).

## 🗣️ Made for pre-readers
- **Every question is read aloud** automatically (tap 🔊 to hear it again).
- **Pictures and emojis first**, words second — she can play before she can read.
- **Big, tappable buttons**, instant happy feedback, stars and confetti rewards.
- ⭐ Stars earned are saved per day to celebrate progress (no account needed).

## ▶️ How to use
- **Online:** just open the live link (GitHub Pages — see below).
- **On this computer:** double-click `index.html`.
  *(Tip: the read-aloud voice works best when opened through the live link or a
  simple local server, because some browsers block speech on `file://`.)*

Tap the name (top-left) to personalize the greeting.

## 🌐 Live site
Once GitHub Pages is enabled, the site is live at:

> `https://<your-username>.github.io/<repo-name>/`

## 🛠️ Project structure
```
Logical Study/
├── index.html        # screens: Home, Play, Done
├── css/style.css     # kid-friendly theme
└── js/
    ├── rng.js         # seeded random -> daily-refreshing content
    ├── content.js     # the picture/word banks (easy to extend)
    ├── generators.js  # the academic question logic
    └── app.js         # flow, voice, scoring, confetti
```

Want more content? Add items to the banks in `js/content.js` — the games pick
them up automatically.

Made with ❤️.
