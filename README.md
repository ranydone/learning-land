# 🌈 Learning Land

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
| 🔤 **Alphabets** | Letter recognition & phonics | "Apple starts with…?", "Find the letter B", "What comes after C?" |
| 🍎 **Fun Quiz** | World knowledge & reasoning | Animal sounds, "Which is a fruit?", odd-one-out, colors, real-life situations |
| 🧠 **Think & Code** | Logic / early coding | Continue the pattern, odd one out, biggest/smallest, "what happens first?", more/fewer |

### Why "Think & Code" counts as coding for a 5-year-old
Early coding is really **logical thinking**: spotting patterns, sequencing steps
in order, sorting, and comparing. Those are exactly the puzzles in this section —
the building blocks every programmer uses, taught at a KG1 level. (See
`PARENTS.md` for the full learning plan and a 30-minute routine.)

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
