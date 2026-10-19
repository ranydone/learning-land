/* App flow: home -> play -> done. Voice-guided, kid-friendly, daily refresh. */
(function () {
  const $ = (id) => document.getElementById(id);
  const SESSION_LEN = 8; // questions per round (~3-5 min; do a few rounds for 30 min)

  const state = {
    name: localStorage.getItem('ll_name') || 'Star',
    muted: localStorage.getItem('ll_muted') === '1',
    game: null,
    queue: [],
    idx: 0,
    correct: 0,
    locked: false,
    user: null,       // Firebase user (when signed in)
    profile: null,    // { childName, school, points, email, photo }
  };
  const fb = { enabled: false, auth: null, db: null, ready: false };

  // Full rainbow arch used as the Pogogy logo (welcome screen).
  const RAINBOW_SVG = '<svg viewBox="0 0 100 62" fill="none" stroke-width="6.5" stroke-linecap="round">'
    + '<path d="M8 55 A42 42 0 0 1 92 55" stroke="#ff4d6d"/>'
    + '<path d="M16 55 A34 34 0 0 1 84 55" stroke="#ff9f1c"/>'
    + '<path d="M24 55 A26 26 0 0 1 76 55" stroke="#ffd60a"/>'
    + '<path d="M32 55 A18 18 0 0 1 68 55" stroke="#2ec4b6"/>'
    + '<path d="M40 55 A10 10 0 0 1 60 55" stroke="#3a86ff"/>'
    + '</svg>';

  /* ---------- voice ---------- */
  let voice = null;
  const hasTTS = 'speechSynthesis' in window;

  // Rank voices so we auto-pick the clearest, most natural one available.
  // Modern "Natural"/"Neural"/online voices (Edge, Chrome, Android, iOS) score highest.
  function scoreVoice(v) {
    const n = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    let s = 0;
    // Indian English is the preferred DEFAULT — always pick it when available.
    if (lang.startsWith('en-in')) s += 1000;
    else if (lang.startsWith('en-us')) s += 45;
    else if (lang.startsWith('en-gb')) s += 40;
    else if (lang.startsWith('en')) s += 20;
    else s -= 200;                                             // non-English: avoid
    // Quality/warmth ranking WITHIN a language.
    if (/natural|neural|online/.test(n)) s += 120;            // Microsoft/Edge neural voices
    if (/google/.test(n)) s += 60;                             // Chrome's Google voices (clear)
    if (/aria|jenny|libby|sonia|natasha|clara|emma|ava|allison|samantha|neerja|asha|swara|heera/.test(n)) s += 55;
    if (/female|woman|girl/.test(n)) s += 25;                  // warmer for a young child
    if (/zira|heera/.test(n)) s += 10;
    if (/david|mark|guy|ravi|prabhat|george/.test(n)) s -= 30; // default male voices
    return s;
  }

  function bestVoice(vs) {
    if (!vs.length) return null;
    return vs.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
  }

  function englishVoices() {
    if (!hasTTS) return [];
    return speechSynthesis.getVoices()
      .filter(v => (v.lang || '').toLowerCase().startsWith('en'))
      .sort((a, b) => scoreVoice(b) - scoreVoice(a));
  }

  function pickVoice() {
    if (!hasTTS) return;
    const vs = speechSynthesis.getVoices();
    if (!vs.length) return;
    const saved = localStorage.getItem('ll_voice');
    voice = (saved && vs.find(v => v.voiceURI === saved)) || bestVoice(vs);
    populateVoicePicker();
  }

  if (hasTTS) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    if (state.muted || !hasTTS || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      // Warm, clear, slightly playful — good for a 5-year-old.
      u.rate = 0.88; u.pitch = 1.12; u.volume = 1;
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      speechSynthesis.speak(u);
    } catch (e) { /* ignore */ }
  }

  // Fill the home-screen voice dropdown with the device's English voices.
  function populateVoicePicker() {
    const sel = $('voiceSelectGlobal');
    if (!sel) return;
    const vs = englishVoices();
    if (!vs.length) { return; }
    const cur = voice ? voice.voiceURI : '';
    sel.innerHTML = vs.map(v => {
      const nice = v.name.replace(/microsoft|online|\(natural\)|desktop/gi, '').replace(/\s+/g, ' ').trim();
      const star = scoreVoice(v) >= 120 ? '⭐ ' : '';
      return `<option value="${v.voiceURI}"${v.voiceURI === cur ? ' selected' : ''}>${star}${nice} (${v.lang})</option>`;
    }).join('');
  }

  /* ---------- score (per account, per day) ---------- */
  // Scope all points to the signed-in user so accounts never share totals.
  function uKey() { return (state.user && state.user.uid) ? state.user.uid : 'guest'; }
  function todayStarsKey() { return 'll_stars_' + uKey() + '_' + todayKey(); }
  function totalKey() { return 'll_points_' + uKey(); }
  function getTodayStars() { return parseInt(localStorage.getItem(todayStarsKey()) || '0', 10); }
  function getTotal() { return parseInt(localStorage.getItem(totalKey()) || '0', 10); }
  function rankKey() { return 'll_rank_' + uKey(); }
  function addStars(n) {
    localStorage.setItem(todayStarsKey(), String(getTodayStars() + n));
    $('todayStars').textContent = getTodayStars();
    // lifetime total for THIS account (local cache + cloud)
    const before = getTotal();
    const total = before + n;
    localStorage.setItem(totalKey(), String(total));
    if (state.profile) state.profile.points = total;
    cloudAddPoints(n);
    // Did we just climb to a new named level?
    const prevRank = parseInt(localStorage.getItem(rankKey()) || String(rankIndex(before)), 10);
    const newRank = rankIndex(total);
    if (newRank > prevRank) state.pendingLevelUp = LEVELS[newRank];
    localStorage.setItem(rankKey(), String(newRank));
  }

  /* ---------- screens ---------- */
  function show(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(screen).classList.add('active');
  }

  /* ---------- home ---------- */
  function initHome() {
    $('nameBtn').textContent = state.name;
    $('todayStars').textContent = getTodayStars();
    const d = new Date();
    $('dateLabel').textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    $('nameBtn').onclick = () => {
      const n = prompt("What is your name? 😊", state.name);
      if (n && n.trim()) {
        state.name = n.trim().slice(0, 14);
        localStorage.setItem('ll_name', state.name);
        $('nameBtn').textContent = state.name;
        speak('Hi ' + state.name);
      }
    };
    $('profileBtn').onclick = openProfile;
    updateAvatarUI();
    $('copyYear').textContent = new Date().getFullYear();
    document.querySelectorAll('.foot-links [data-info]').forEach(function (b) { b.onclick = function () { openInfo(b.dataset.info); }; });
    document.querySelectorAll('.tile').forEach(t => {
      t.onclick = () => (t.dataset.story ? openStory(null)
        : t.dataset.memory ? startMemory()
          : t.dataset.routine ? startRoutine()
            : t.dataset.games ? openGames()
              : t.dataset.pizza ? startPizza()
                : t.dataset.alpha ? startAlphabet()
                : t.dataset.web ? startWebHero()
                : t.dataset.shapes ? show('shapesHub')
                : t.dataset.tangram ? startTangram()
                : t.dataset.turn ? startTurn()
                : t.dataset.spot ? startSpot()
                : t.dataset.game === 'calendar' ? startCalendar()
                  : t.dataset.game === 'clock' ? startClock()
                    : t.dataset.game === 'subtract' ? startSubtract()
                      : startGame(t.dataset.game));
    });
  }

  /* ---------- global sound dock (on every screen) ---------- */
  function updateMuteUI() {
    const fab = $('muteFab');
    if (fab) fab.textContent = state.muted ? '🔇' : '🔊';
  }
  function toggleMute() {
    state.muted = !state.muted;
    localStorage.setItem('ll_muted', state.muted ? '1' : '0');
    if (state.muted && 'speechSynthesis' in window) speechSynthesis.cancel();
    updateMuteUI();
    if (!state.muted) speak('Sound is on');
  }
  function setupSoundDock() {
    updateMuteUI();
    populateVoicePicker();
    $('muteFab').onclick = toggleMute;
    $('voiceFab').onclick = () => {
      const s = $('voiceSelectGlobal');
      if (s) s.hidden = !s.hidden;
    };
    const sel = $('voiceSelectGlobal');
    if (sel) sel.onchange = (e) => {
      const vs = speechSynthesis.getVoices();
      voice = vs.find(v => v.voiceURI === e.target.value) || voice;
      if (voice) localStorage.setItem('ll_voice', voice.voiceURI);
      const wasMuted = state.muted; state.muted = false;
      speak('Hi ' + state.name + '! This is my voice. Let us have fun!');
      state.muted = wasMuted;
    };
  }

  /* ---------- game ---------- */
  function startGame(game) {
    state.game = game;
    // Daily Play uses today's seed (same all day); free play uses time for variety.
    const seed = game === 'daily' ? 'daily-' + todayKey() : game + '-' + Date.now() + '-' + Math.random();
    const R = makeRNG(seed);
    state.queue = GENERATORS.buildSession(game, R, SESSION_LEN, currentLevel());
    state.idx = 0;
    state.correct = 0;
    state.locked = false;
    $('playStars').textContent = '0';
    show('play');
    renderQuestion();
  }

  function renderQuestion() {
    state.locked = false;
    const q = state.queue[state.idx];
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';
    $('progressBar').style.width = (state.idx / state.queue.length * 100) + '%';

    $('qPrompt').textContent = q.prompt;

    // display area
    const disp = $('qDisplay');
    disp.className = 'q-display';
    disp.innerHTML = '';
    if (q.display.kind === 'huge') { disp.classList.add('huge'); disp.textContent = q.display.value; }
    else if (q.display.kind === 'emojis') { disp.innerHTML = q.display.value; }
    else if (q.display.kind === 'text') { disp.textContent = q.display.value; }
    else if (q.display.kind === 'color') {
      const sw = document.createElement('div');
      sw.className = 'swatch'; sw.style.background = q.display.value;
      disp.appendChild(sw);
    }
    else if (q.display.kind === 'clock') { disp.innerHTML = clockFaceSVG(q.display.value.h, q.display.value.m); } // 'none' -> empty

    // options
    const wrap = $('qOptions');
    wrap.innerHTML = '';
    q.options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'opt';
      let inner = '';
      if (opt.emojiHTML) inner += `<span class="opt-emoji">${opt.emojiHTML}</span>`;
      else if (opt.emoji) inner += `<span class="opt-emoji">${opt.emoji}</span>`;
      if (opt.label) inner += `<span class="opt-label">${opt.label}</span>`;
      if (!opt.emoji && !opt.emojiHTML && opt.label) inner = opt.label; // number/letter only -> big
      b.innerHTML = inner;
      b.onclick = () => choose(b, opt, q);
      wrap.appendChild(b);
    });

    speak(q.speak || q.prompt);
  }

  function choose(btn, opt, q) {
    if (state.locked) return;
    if (opt.correct) {
      state.locked = true;
      btn.classList.add('correct');
      Array.from($('qOptions').children).forEach(c => { if (c !== btn) c.classList.add('dim'); c.disabled = true; });
      const praise = window.CONTENT.praise[Math.floor(Math.random() * window.CONTENT.praise.length)];
      $('feedback').textContent = '🎉 ' + praise;
      $('feedback').className = 'feedback good';
      speak(praise);
      state.correct++;
      addStars(1);
      $('playStars').textContent = state.correct;
      burst();
      setTimeout(next, 1100);
    } else {
      btn.classList.add('wrong');
      btn.disabled = true;
      const ta = window.CONTENT.tryAgain[Math.floor(Math.random() * window.CONTENT.tryAgain.length)];
      $('feedback').textContent = '💪 ' + ta;
      $('feedback').className = 'feedback try';
      speak(ta);
      setTimeout(() => { btn.classList.remove('wrong'); }, 500);
    }
  }

  function next() {
    state.idx++;
    if (state.idx >= state.queue.length) return finish();
    renderQuestion();
  }

  // If the child just crossed into a new named level, celebrate it on the done screen.
  function showLevelUpOnDone() {
    if (!state.pendingLevelUp) return false;
    const lv = state.pendingLevelUp;
    state.pendingLevelUp = null;
    $('doneTitle').textContent = '🎉 LEVEL UP!';
    $('doneMsg').textContent = 'You are now ' + lv.emoji + ' ' + lv.name + '! ' + $('doneMsg').textContent;
    for (let k = 0; k < 4; k++) setTimeout(burst, k * 260);
    speak('Level up! You are now a ' + lv.name + '!');
    return true;
  }

  function finish() {
    $('progressBar').style.width = '100%';
    show('done');
    const total = state.queue.length;
    const score = state.correct;
    const ratio = score / total;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : 1;
    $('doneTitle').textContent = stars === 3 ? 'Perfect! 🌟' : stars === 2 ? 'Great Work! 🎈' : 'Good Try! 👍';
    $('doneMsg').textContent = `You got ${score} out of ${total} right! Total stars today: ${getTodayStars()} ⭐`;
    const row = $('starRow');
    row.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 's' + (i < stars ? ' lit' : '');
      s.textContent = '⭐';
      row.appendChild(s);
      if (i < stars) setTimeout(() => burst(), 300 + i * 300);
    }
    if (!showLevelUpOnDone()) speak(stars === 3 ? 'Perfect! Amazing work ' + state.name : 'Well done ' + state.name);

    $('againBtn').onclick = () => startGame(state.game);
    $('homeBtn').onclick = () => { initHome(); show('home'); };
  }

  /* ---------- play top controls ---------- */
  $('backBtn').onclick = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('speakBtn').onclick = () => { const q = state.queue[state.idx]; if (q) speak(q.speak || q.prompt); };

  /* ---------- STORY TIME ---------- */
  const story = { list: window.STORIES || [], cur: null, idx: 0 };

  function openStory(forceId) {
    if (!story.list.length) return;
    let chosen;
    if (forceId) {
      chosen = story.list.find(s => s.id === forceId) || story.list[0];
    } else {
      // Today's story is the same all day, new each day.
      const R = makeRNG('story-' + todayKey());
      chosen = R.pick(story.list);
    }
    story.cur = chosen;
    story.idx = 0;
    show('story');
    renderScene();
  }

  function newStory() {
    // pick a different random story than the current one
    const others = story.list.filter(s => s.id !== (story.cur && story.cur.id));
    const next = others.length ? others[Math.floor(Math.random() * others.length)] : story.cur;
    story.cur = next; story.idx = 0; renderScene();
  }

  function renderScene() {
    const s = story.cur;
    const scenes = s.scenes;
    const i = story.idx;
    const scene = scenes[i];
    const isMoral = i === scenes.length - 1;

    $('storyTitle').textContent = s.title;
    const sceneEl = $('storyScene');
    sceneEl.textContent = scene.art;
    sceneEl.style.animation = 'none'; void sceneEl.offsetWidth; sceneEl.style.animation = '';
    $('storyText').textContent = scene.text;
    $('storyBar').style.width = ((i + 1) / scenes.length * 100) + '%';
    $('story').querySelector('.story-card').classList.toggle('moral', isMoral);

    $('storyPrev').disabled = i === 0;
    $('storyNext').textContent = isMoral ? '📖 New Story' : 'Next ▶';
    if (isMoral) burst();

    speak(scene.text);
  }

  $('storyHome').onclick = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('storySpeak').onclick = () => { if (story.cur) speak(story.cur.scenes[story.idx].text); };
  $('storyPrev').onclick = () => { if (story.idx > 0) { story.idx--; renderScene(); } };
  $('storyNext').onclick = () => {
    if (story.idx < story.cur.scenes.length - 1) { story.idx++; renderScene(); }
    else { newStory(); }
  };

  /* ---------- MEMORY MATCH ---------- */
  const mem = { cards: [], flipped: [], matched: 0, total: 6, lock: false, moves: 0 };

  function namedPool() {
    const C = window.CONTENT;
    // items that have both a picture and a name -> we can say the word aloud
    return [...C.animals, ...C.fruits, ...C.vehicles].filter(x => x.e && x.name);
  }

  function startMemory() {
    const R = makeRNG('mem-' + Date.now() + '-' + Math.random());
    mem.total = [6, 8, 10][currentLevel() - 1]; // more pairs for higher classes
    const items = R.sample(namedPool(), mem.total);
    let cards = [];
    items.forEach((it, i) => {
      cards.push({ key: 'p' + i, emoji: it.e, name: it.name });
      cards.push({ key: 'p' + i, emoji: it.e, name: it.name });
    });
    mem.cards = R.shuffle(cards);
    mem.flipped = [];
    mem.matched = 0;
    mem.moves = 0;
    mem.lock = false;
    $('memPairs').textContent = '0/' + mem.total;
    $('memFeedback').textContent = '👀 Tap two pictures that are the same!';
    $('memFeedback').className = 'feedback';
    renderMemGrid();
    show('memory');
    speak('Tap two pictures that are the same!');
  }

  function renderMemGrid() {
    const grid = $('memGrid');
    grid.innerHTML = '';
    mem.cards.forEach((card, idx) => {
      const btn = document.createElement('button');
      btn.className = 'mem-card';
      btn.dataset.idx = idx;
      btn.textContent = card.emoji;          // cards stay face-up (easy mode)
      btn.onclick = () => selectCard(btn, card, idx);
      grid.appendChild(btn);
    });
  }

  function selectCard(btn, card, idx) {
    if (mem.lock) return;
    if (btn.classList.contains('selected') || btn.classList.contains('matched')) return;
    btn.classList.add('selected');
    speak(card.name);
    mem.flipped.push({ btn, card, idx });
    if (mem.flipped.length < 2) return;

    mem.lock = true;
    mem.moves++;
    const [a, b] = mem.flipped;
    if (a.card.key === b.card.key) {
      // match!
      setTimeout(() => {
        a.btn.classList.remove('selected'); b.btn.classList.remove('selected');
        a.btn.classList.add('matched'); b.btn.classList.add('matched');
        mem.matched++;
        $('memPairs').textContent = mem.matched + '/' + mem.total;
        addStars(1);
        const praise = window.CONTENT.praise[Math.floor(Math.random() * window.CONTENT.praise.length)];
        $('memFeedback').textContent = '🎉 ' + praise + ' (' + a.card.name + ')';
        $('memFeedback').className = 'feedback good';
        speak(praise);
        burst();
        mem.flipped = [];
        mem.lock = false;
        if (mem.matched === mem.total) setTimeout(finishMemory, 900);
      }, 350);
    } else {
      // not a match -> gently deselect both
      $('memFeedback').textContent = '🔄 Not the same — try again!';
      $('memFeedback').className = 'feedback try';
      a.btn.classList.add('wrong'); b.btn.classList.add('wrong');
      setTimeout(() => {
        a.btn.classList.remove('selected', 'wrong'); b.btn.classList.remove('selected', 'wrong');
        mem.flipped = [];
        mem.lock = false;
      }, 750);
    }
  }

  function finishMemory() {
    show('done');
    const perfect = mem.total;            // fewest possible 2-card turns
    const ratio = perfect / mem.moves;    // 1.0 = perfect memory
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    $('doneTitle').textContent = stars === 3 ? 'Amazing Memory! 🌟' : stars === 2 ? 'Great Matching! 🎈' : 'You did it! 👍';
    $('doneMsg').textContent = `You found all ${mem.total} pairs in ${mem.moves} tries! Total stars today: ${getTodayStars()} ⭐`;
    const row = $('starRow');
    row.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('span');
      s.className = 's' + (i < stars ? ' lit' : '');
      s.textContent = '⭐';
      row.appendChild(s);
      if (i < stars) setTimeout(() => burst(), 300 + i * 300);
    }
    if (!showLevelUpOnDone()) speak('Well done ' + state.name + '! You found all the pairs!');
    $('againBtn').textContent = '▶️ Play Again';
    $('againBtn').onclick = startMemory;
    $('homeBtn').onclick = () => { initHome(); show('home'); };
  }

  $('memHome').onclick = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('memNew').onclick = () => startMemory();

  /* ---------- DAYS/MONTHS SEQUENCE (drag & drop) ---------- */
  const SEQ_DAYS = [['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'], ['Fri', 'Friday'], ['Sat', 'Saturday'], ['Sun', 'Sunday']];
  const SEQ_MONTHS = [['Jan', 'January'], ['Feb', 'February'], ['Mar', 'March'], ['Apr', 'April'], ['May', 'May'], ['Jun', 'June'], ['Jul', 'July'], ['Aug', 'August'], ['Sep', 'September'], ['Oct', 'October'], ['Nov', 'November'], ['Dec', 'December']];
  let seqSpeakText = '';

  // Days sequence -> Months sequence -> the regular calendar quiz.
  function startCalendar() {
    sequenceActivity(SEQ_DAYS, 'days', 'week', function () {
      sequenceActivity(SEQ_MONTHS, 'months', 'year', function () {
        startGame('calendar');
      });
    });
  }

  // Pointer-based drag that also works as a simple tap (easier for little kids).
  function makeSeqDraggable(tile, onAttempt) {
    let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    tile.addEventListener('pointerdown', function (e) {
      if (tile.disabled) return;
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY;
      const r = tile.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
      try { tile.setPointerCapture(e.pointerId); } catch (_) {}
      tile.classList.add('dragging');
      tile.style.width = r.width + 'px'; tile.style.height = r.height + 'px';
      tile.style.position = 'fixed'; tile.style.left = r.left + 'px'; tile.style.top = r.top + 'px'; tile.style.zIndex = '1000';
    });
    tile.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 6) moved = true;
      tile.style.left = (e.clientX - ox) + 'px'; tile.style.top = (e.clientY - oy) + 'px';
    });
    function end(e) {
      if (!dragging) return; dragging = false;
      tile.classList.remove('dragging');
      let overSlots = false;
      try { const sr = $('seqSlots').getBoundingClientRect(); if (e.clientY <= sr.bottom + 30) overSlots = true; } catch (_) {}
      tile.style.position = ''; tile.style.left = ''; tile.style.top = ''; tile.style.zIndex = ''; tile.style.width = ''; tile.style.height = '';
      if (!moved || overSlots) onAttempt(tile); // a tap, or dropped up near the slots, counts as an attempt
    }
    tile.addEventListener('pointerup', end);
    tile.addEventListener('pointercancel', end);
  }

  function sequenceActivity(pairs, kind, unit, onDone) {
    show('sequence');
    const ordered = pairs.map(function (p) { return p[0]; });
    const fullByShort = {}; pairs.forEach(function (p) { fullByShort[p[0]] = p[1]; });
    const N = ordered.length;
    let nextIndex = 0;

    $('seqTitle').textContent = (kind === 'days' ? '📅 ' : '🗓️ ') + 'Put the ' + kind + ' in order!';
    const feed = $('seqFeedback');
    feed.className = 'feedback';
    feed.textContent = 'Drag them into order — there are ' + N + ' ' + kind + '!';

    const slotsEl = $('seqSlots'); slotsEl.innerHTML = ''; slotsEl.classList.remove('seq-visual');
    const slotEls = [];
    for (let i = 0; i < N; i++) {
      const s = document.createElement('div'); s.className = 'seq-slot';
      s.innerHTML = '<span class="seq-num">' + (i + 1) + '</span>';
      slotsEl.appendChild(s); slotEls.push(s);
    }
    const trayEl = $('seqTray'); trayEl.innerHTML = ''; trayEl.classList.remove('seq-visual');
    const R = makeRNG('seq-' + kind + '-' + Date.now() + '-' + Math.random());
    R.shuffle(ordered).forEach(function (short) {
      const t = document.createElement('button');
      t.className = 'seq-tile'; t.type = 'button';
      t.textContent = short; t.dataset.item = short;
      trayEl.appendChild(t);
      makeSeqDraggable(t, attempt);
    });
    announce();

    function announce() {
      slotEls.forEach(function (s, i) { s.classList.toggle('active', i === nextIndex); });
      if (nextIndex < N) {
        seqSpeakText = (kind === 'days' ? 'Which day comes ' : 'Which month comes ') + (nextIndex === 0 ? 'first? ' : 'next? ') + fullByShort[ordered[nextIndex]];
        speak(seqSpeakText);
      }
    }

    function attempt(tile) {
      if (tile.disabled) return;
      const item = tile.dataset.item;
      if (item === ordered[nextIndex]) {
        const slot = slotEls[nextIndex];
        slot.classList.remove('active'); slot.classList.add('filled'); slot.innerHTML = '';
        tile.classList.add('placed'); tile.disabled = true;
        slot.appendChild(tile);
        nextIndex++;
        if (nextIndex === N) finish(); else announce();
      } else {
        tile.classList.add('wrong'); setTimeout(function () { tile.classList.remove('wrong'); }, 450);
        feed.className = 'feedback try';
        feed.textContent = '🔄 Not yet — we need ' + fullByShort[ordered[nextIndex]];
        seqSpeakText = 'Not yet. We need ' + fullByShort[ordered[nextIndex]];
        speak(seqSpeakText);
      }
    }

    function finish() {
      addStars(1);
      feed.className = 'feedback good';
      feed.textContent = '🎉 Yay! There are ' + N + ' ' + kind + ' in a ' + unit + '!';
      seqSpeakText = 'Well done! There are ' + N + ' ' + kind + ' in a ' + unit + '!';
      speak(seqSpeakText);
      burst();
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again seq-next';
      btn.textContent = 'Next ▶️';
      btn.onclick = function () { onDone(); };
      trayEl.appendChild(btn);
    }
  }

  /* ---------- MY DAY (routine ordering, picture tiles) ---------- */
  const ROUTINES = [
    { title: 'Morning Time', steps: [
      { e: '🌅', label: 'Wake up' }, { e: '🪥', label: 'Brush teeth' }, { e: '🛁', label: 'Take a bath' },
      { e: '👕', label: 'Wear dress' }, { e: '🍳', label: 'Eat eggs' }, { e: '🚌', label: 'Catch the bus' },
    ] },
    { title: 'Bedtime', steps: [
      { e: '🍽️', label: 'Eat dinner' }, { e: '🛁', label: 'Take a bath' }, { e: '🪥', label: 'Brush teeth' },
      { e: '👚', label: 'Wear PJs' }, { e: '📖', label: 'Read a story' }, { e: '😴', label: 'Go to sleep' },
    ] },
    { title: 'Wash Your Hands', steps: [
      { e: '💧', label: 'Wet hands' }, { e: '🧼', label: 'Use soap' }, { e: '🙌', label: 'Rub well' },
      { e: '🚰', label: 'Rinse' }, { e: '🧻', label: 'Dry hands' },
    ] },
    { title: 'Get Ready for School', steps: [
      { e: '⏰', label: 'Wake up' }, { e: '👕', label: 'Get dressed' }, { e: '🥪', label: 'Eat snack' },
      { e: '🎒', label: 'Pack bag' }, { e: '👟', label: 'Wear shoes' }, { e: '🏫', label: 'Go to school' },
    ] },
    { title: 'Plant a Seed', steps: [
      { e: '🕳️', label: 'Dig a hole' }, { e: '🌰', label: 'Drop the seed' }, { e: '🟤', label: 'Cover soil' },
      { e: '💧', label: 'Give water' }, { e: '🌱', label: 'It grows!' },
    ] },
    { title: 'Eat an Apple', steps: [
      { e: '🍎', label: 'Get apple' }, { e: '🚰', label: 'Wash it' }, { e: '😋', label: 'Take a bite' },
      { e: '🍏', label: 'Eat it all' }, { e: '🗑️', label: 'Throw core' },
    ] },
    // --- Health & hygiene: keeping germs away ---
    { title: 'Before You Eat', steps: [
      { e: '🖐️', label: 'Dirty hands' }, { e: '🚰', label: 'Turn on water' }, { e: '🧼', label: 'Wash with soap' },
      { e: '🧻', label: 'Dry hands' }, { e: '🍽️', label: 'Now eat!' },
    ] },
    { title: 'Cover Your Sneeze', steps: [
      { e: '🤧', label: 'Feel a sneeze' }, { e: '🙈', label: 'Turn away' }, { e: '💪', label: 'Sneeze in elbow' },
      { e: '🧼', label: 'Wash hands' }, { e: '😊', label: 'Germs gone!' },
    ] },
    { title: 'After the Toilet', steps: [
      { e: '🚽', label: 'Use toilet' }, { e: '🚾', label: 'Flush it' }, { e: '🧼', label: 'Wash with soap' },
      { e: '🧻', label: 'Dry hands' }, { e: '😊', label: 'All clean!' },
    ] },
    { title: 'Blow Your Nose', steps: [
      { e: '🤧', label: 'Runny nose' }, { e: '🧻', label: 'Take a tissue' }, { e: '👃', label: 'Blow your nose' },
      { e: '🗑️', label: 'Throw tissue' }, { e: '🧼', label: 'Wash hands' },
    ] },
    { title: 'Stay Healthy', steps: [
      { e: '🥗', label: 'Eat veggies' }, { e: '💧', label: 'Drink water' }, { e: '🏃', label: 'Run and play' },
      { e: '🛁', label: 'Keep clean' }, { e: '😴', label: 'Sleep well' },
    ] },
  ];
  let lastRoutine = -1;

  function startRoutine() {
    const R = makeRNG('routine-pick-' + Date.now() + '-' + Math.random());
    let idx;
    do { idx = R.int(0, ROUTINES.length - 1); } while (ROUTINES.length > 1 && idx === lastRoutine);
    lastRoutine = idx;
    routineActivity(ROUTINES[idx]);
  }

  function routineActivity(routine) {
    show('sequence');
    const steps = routine.steps;
    const N = steps.length;
    let nextIndex = 0;

    $('seqTitle').textContent = '🌅 ' + routine.title;
    const feed = $('seqFeedback');
    feed.className = 'feedback';
    feed.textContent = 'Put it in the right order — what comes first?';

    const slotsEl = $('seqSlots'); slotsEl.innerHTML = ''; slotsEl.classList.add('seq-visual');
    const slotEls = [];
    for (let i = 0; i < N; i++) {
      const s = document.createElement('div'); s.className = 'seq-slot';
      s.innerHTML = '<span class="seq-num">' + (i + 1) + '</span>';
      slotsEl.appendChild(s); slotEls.push(s);
    }
    const trayEl = $('seqTray'); trayEl.innerHTML = ''; trayEl.classList.add('seq-visual');
    const R = makeRNG('routine-' + routine.title + '-' + Date.now() + '-' + Math.random());
    R.shuffle(steps.map(function (_, i) { return i; })).forEach(function (idx) {
      const st = steps[idx];
      const t = document.createElement('button');
      t.className = 'seq-tile seq-tile-visual'; t.type = 'button'; t.dataset.idx = idx;
      t.innerHTML = '<span class="seq-emoji">' + st.e + '</span><span class="seq-lbl">' + st.label + '</span>';
      trayEl.appendChild(t);
      makeSeqDraggable(t, attempt);
    });
    announce();

    function announce() {
      slotEls.forEach(function (s, i) { s.classList.toggle('active', i === nextIndex); });
      if (nextIndex < N) {
        seqSpeakText = 'What comes ' + (nextIndex === 0 ? 'first' : 'next') + '? ' + steps[nextIndex].label;
        speak(seqSpeakText);
      }
    }

    function attempt(tile) {
      if (tile.disabled) return;
      const idx = parseInt(tile.dataset.idx, 10);
      if (idx === nextIndex) {
        const slot = slotEls[nextIndex];
        slot.classList.remove('active'); slot.classList.add('filled'); slot.innerHTML = '';
        tile.classList.add('placed'); tile.disabled = true;
        slot.appendChild(tile);
        nextIndex++;
        if (nextIndex === N) finish(); else announce();
      } else {
        tile.classList.add('wrong'); setTimeout(function () { tile.classList.remove('wrong'); }, 450);
        feed.className = 'feedback try';
        feed.textContent = '🔄 Not yet — first we ' + steps[nextIndex].label.toLowerCase();
        seqSpeakText = 'Not yet. First we ' + steps[nextIndex].label.toLowerCase();
        speak(seqSpeakText);
      }
    }

    function finish() {
      addStars(1);
      feed.className = 'feedback good';
      feed.textContent = '🎉 Yay! You put your ' + routine.title + ' in order!';
      seqSpeakText = 'Well done! You got the whole routine in order!';
      speak(seqSpeakText);
      burst();
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again seq-next';
      btn.textContent = '▶️ Another one';
      btn.onclick = function () { startRoutine(); };
      trayEl.appendChild(btn);
    }
  }

  $('seqHome').onclick = function () { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('seqSpeak').onclick = function () { if (seqSpeakText) speak(seqSpeakText); };

  /* ---------- PIZZA CHEF (build a pizza step by step) ---------- */
  let pizzaSpeakText = '';

  function startPizza() {
    show('pizza');
    const base = $('pizzaBase');
    base.className = 'pizza-base';
    base.querySelectorAll('.pizza-topping').forEach(function (n) { n.remove(); });
    $('pizzaEmoji').textContent = '';
    $('pizzaTitle').textContent = '🍕 Make a Pizza!';

    const recipe = [
      { e: '🫓', label: 'Dough', layer: 'has-base' },
      { e: '🥫', label: 'Sauce', layer: 'has-sauce' },
      { e: '🧀', label: 'Cheese', layer: 'has-cheese' },
      { e: '🍅', label: 'Tomato', top: '🍅' },
      { e: '🍄', label: 'Mushroom', top: '🍄' },
      { e: '🫒', label: 'Olives', top: '🫒' },
      { e: '🔥', label: 'Bake!', bake: true },
    ];
    let nextIndex = 0;
    const tray = $('pizzaTray'); tray.innerHTML = '';
    const feed = $('pizzaFeedback');
    const itemEls = [];
    recipe.forEach(function (r, i) {
      const b = document.createElement('button');
      b.className = 'pizza-item'; b.type = 'button';
      b.innerHTML = '<span class="pi-e">' + r.e + '</span><span class="pi-l">' + r.label + '</span>';
      b.onclick = function () { pick(i, b); };
      tray.appendChild(b); itemEls.push(b);
    });
    announce();

    function announce() {
      itemEls.forEach(function (b, i) { b.classList.toggle('next', i === nextIndex); });
      const r = recipe[nextIndex];
      if (r.bake) { feed.className = 'feedback'; feed.textContent = '🔥 Now tap Bake!'; pizzaSpeakText = 'Now bake the pizza!'; }
      else { feed.className = 'feedback'; feed.textContent = '👉 Add the ' + r.label; pizzaSpeakText = 'Add the ' + r.label; }
      speak(pizzaSpeakText);
    }

    function scatter(emoji, n) {
      for (let k = 0; k < n; k++) {
        const s = document.createElement('span');
        s.className = 'pizza-topping'; s.textContent = emoji;
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.random() * 0.34 + 0.04;
        s.style.left = (50 + Math.cos(ang) * rad * 100) + '%';
        s.style.top = (50 + Math.sin(ang) * rad * 100) + '%';
        base.appendChild(s);
      }
    }

    function pick(i, b) {
      if (b.classList.contains('done')) return;
      if (i !== nextIndex) {
        b.classList.add('wrong'); setTimeout(function () { b.classList.remove('wrong'); }, 400);
        feed.className = 'feedback try';
        feed.textContent = '🔄 Not yet — add the ' + recipe[nextIndex].label + ' first!';
        pizzaSpeakText = 'Not yet. First add the ' + recipe[nextIndex].label; speak(pizzaSpeakText);
        return;
      }
      const r = recipe[i];
      if (r.bake) { b.classList.remove('next'); b.classList.add('done'); b.disabled = true; return finish(); }
      if (r.layer) base.classList.add(r.layer);
      if (r.top) scatter(r.top, 4);
      b.classList.remove('next'); b.classList.add('done'); b.disabled = true;
      nextIndex++;
      announce();
    }

    function finish() {
      base.className = 'pizza-base done';
      base.querySelectorAll('.pizza-topping').forEach(function (n) { n.remove(); });
      $('pizzaEmoji').textContent = '🍕';
      $('pizzaEmoji').style.animation = 'none'; void $('pizzaEmoji').offsetWidth; $('pizzaEmoji').style.animation = 'pop .5s ease';
      $('pizzaTitle').textContent = '🎉 Pizza Ready!';
      feed.className = 'feedback good'; feed.textContent = '🎉 Yummy! Your pizza is ready!';
      pizzaSpeakText = 'Yummy! Your pizza is ready! Great job!'; speak(pizzaSpeakText);
      addStars(1); burst();
      tray.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again pizza-again';
      btn.textContent = '🍕 Make Another';
      btn.onclick = startPizza;
      tray.appendChild(btn);
    }
  }

  $('pizzaHome').onclick = function () { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('pizzaSpeak').onclick = function () { if (pizzaSpeakText) speak(pizzaSpeakText); };

  /* ---------- GAMES HUB (hosts mini-games) ---------- */
  function openGames() { show('games'); }
  $('gamesHome').onclick = function () { initHome(); show('home'); };

  /* ---------- A TO Z (drag the alphabet in order) ---------- */
  let alphaSpeakText = '';

  // Pointer-based drag that also works as a tap; fires onRelease on any release.
  function makeGrabbable(tile, onRelease) {
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    tile.addEventListener('pointerdown', function (e) {
      if (tile.disabled) return;
      dragging = true; sx = e.clientX; sy = e.clientY;
      const r = tile.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
      try { tile.setPointerCapture(e.pointerId); } catch (_) {}
      tile.classList.add('dragging');
      tile.style.width = r.width + 'px'; tile.style.height = r.height + 'px';
      tile.style.position = 'fixed'; tile.style.left = r.left + 'px'; tile.style.top = r.top + 'px'; tile.style.zIndex = '1000';
    });
    tile.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      tile.style.left = (e.clientX - ox) + 'px'; tile.style.top = (e.clientY - oy) + 'px';
    });
    function end() {
      if (!dragging) return; dragging = false;
      tile.classList.remove('dragging');
      tile.style.position = ''; tile.style.left = ''; tile.style.top = ''; tile.style.zIndex = ''; tile.style.width = ''; tile.style.height = '';
      onRelease(tile);
    }
    tile.addEventListener('pointerup', end);
    tile.addEventListener('pointercancel', end);
  }

  function startAlphabet() {
    show('alphabet');
    const ordered = (window.CONTENT.abcThings || []).slice(); // target sequence: A..Z
    let idx = 0;
    const grid = $('alphaGrid'); grid.innerHTML = '';
    const R = makeRNG('atoz-' + Date.now() + '-' + Math.random());
    R.shuffle(ordered).forEach(function (it) { // tiles are RANDOMLY placed, and show no letter
      const t = document.createElement('button');
      t.className = 'alpha-tile'; t.type = 'button'; t.dataset.letter = it.l;
      t.innerHTML = '<span class="al-emoji">' + it.e + '</span><span class="al-word">' + it.word + '</span>';
      makeGrabbable(t, function () { pick(it, t); });
      grid.appendChild(t);
    });
    updateBar();

    function updateBar() {
      const it = ordered[idx];
      $('alphaTarget').textContent = it.l;
      $('alphaTitle').textContent = '🔠 Find the letter ' + it.l;
      $('alphaFeedback').className = 'feedback';
      $('alphaFeedback').textContent = 'Drag ' + it.l + ' — ' + it.l + ' for ' + it.word + '!';
      alphaSpeakText = 'Find the letter ' + it.l + '. ' + it.l + ' for ' + it.word + '.';
      speak(alphaSpeakText);
    }

    function pick(it, t) {
      if (t.classList.contains('done')) return;
      const target = ordered[idx];
      if (it.l === target.l) {
        t.classList.add('done');
        idx++;
        if (idx % 5 === 0) addStars(1); // a star every 5 letters
        if (idx >= ordered.length) finish(); else updateBar();
      } else {
        t.classList.add('wrong'); setTimeout(function () { t.classList.remove('wrong'); }, 400);
        $('alphaFeedback').className = 'feedback try';
        $('alphaFeedback').textContent = '🔄 That is ' + it.l + '. We need ' + target.l + '!';
        alphaSpeakText = 'That is ' + it.l + '. We need ' + target.l + '.';
        speak(alphaSpeakText);
      }
    }

    function finish() {
      addStars(2);
      $('alphaTitle').textContent = '🎉 A to Z done!';
      $('alphaTarget').textContent = '🏆';
      $('alphaDrop').textContent = 'You know the whole alphabet!';
      $('alphaFeedback').className = 'feedback good';
      $('alphaFeedback').textContent = '🎉 Amazing! You found A to Z!';
      alphaSpeakText = 'Amazing! You found the whole alphabet, A to Z!';
      speak(alphaSpeakText);
      for (let k = 0; k < 4; k++) setTimeout(burst, k * 260);
    }
  }

  $('alphaHome').onclick = function () { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('alphaSpeak').onclick = function () { if (alphaSpeakText) speak(alphaSpeakText); };

  /* ---------- CLOCK (tell the time) ---------- */
  let clockSpeakText = '';

  // Draws a friendly analog clock showing h:m. Hour numbers carry data-hour for taps.
  function clockFaceSVG(h, m) {
    const cx = 100, cy = 100, R = 92, numR = 72, hourLen = 42, minLen = 62;
    let ticks = '', nums = '';
    for (let n = 0; n < 12; n++) {
      const a = n * 30 * Math.PI / 180;
      const x1 = cx + (R - 6) * Math.sin(a), y1 = cy - (R - 6) * Math.cos(a);
      const x2 = cx + (R - 14) * Math.sin(a), y2 = cy - (R - 14) * Math.cos(a);
      ticks += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#e0d0f5" stroke-width="3" stroke-linecap="round"/>';
    }
    for (let n = 1; n <= 12; n++) {
      const a = n * 30 * Math.PI / 180;
      const x = cx + numR * Math.sin(a), y = cy - numR * Math.cos(a) + 6;
      nums += '<text class="clk-num" data-hour="' + n + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="middle">' + n + '</text>';
    }
    const ha = ((h % 12) + m / 60) * 30 * Math.PI / 180;
    const ma = m * 6 * Math.PI / 180;
    const hx = cx + hourLen * Math.sin(ha), hy = cy - hourLen * Math.cos(ha);
    const mx = cx + minLen * Math.sin(ma), my = cy - minLen * Math.cos(ma);
    return '<svg viewBox="0 0 200 200" class="clock-svg">'
      + '<circle cx="100" cy="100" r="92" fill="#fff" stroke="#9b5de5" stroke-width="6"/>'
      + ticks + nums
      + '<line x1="100" y1="100" x2="' + hx.toFixed(1) + '" y2="' + hy.toFixed(1) + '" stroke="#3a2c5a" stroke-width="7" stroke-linecap="round"/>'
      + '<line x1="100" y1="100" x2="' + mx.toFixed(1) + '" y2="' + my.toFixed(1) + '" stroke="#ff5da2" stroke-width="5" stroke-linecap="round"/>'
      + '<circle cx="100" cy="100" r="7" fill="#3a2c5a"/></svg>';
  }

  // Interactive "set the clock" intro, then the reading quiz.
  function startClock() {
    show('clock');
    const R = makeRNG('clock-' + Date.now() + '-' + Math.random());
    const targets = R.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 5);
    let idx = 0, currentHour = 12;
    const faceEl = $('clockFace'), feed = $('clockFeedback');

    function render() {
      faceEl.innerHTML = clockFaceSVG(currentHour, 0);
      faceEl.querySelectorAll('.clk-num').forEach(function (t) {
        t.addEventListener('click', function () { onPick(parseInt(t.dataset.hour, 10)); });
      });
    }
    function ask() {
      const target = targets[idx];
      $('clockTitle').textContent = "🕐 Make it " + target + " o'clock!";
      feed.className = 'feedback';
      feed.textContent = 'Tap the number ' + target + ' on the clock';
      clockSpeakText = "Make the clock show " + target + " o'clock. Tap the number " + target;
      speak(clockSpeakText);
    }
    function onPick(n) {
      currentHour = n; render();
      const target = targets[idx];
      if (n === target) {
        addStars(1); burst();
        feed.className = 'feedback good'; feed.textContent = "🎉 Yes! " + n + " o'clock!";
        clockSpeakText = n + " o'clock! Well done!"; speak(clockSpeakText);
        idx++;
        if (idx >= targets.length) finish(); else setTimeout(ask, 950);
      } else {
        feed.className = 'feedback try'; feed.textContent = "That's " + n + " o'clock — we want " + target + "!";
        clockSpeakText = "That is " + n + " o'clock. We want " + target + " o'clock."; speak(clockSpeakText);
      }
    }
    function finish() {
      $('clockTitle').textContent = '🎉 Great job!';
      feed.className = 'feedback good'; feed.textContent = 'You can set the clock! Now read some clocks.';
      clockSpeakText = 'Great job! Now let us read some clocks!'; speak(clockSpeakText);
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again seq-next';
      btn.textContent = 'Next ▶️';
      btn.onclick = function () { startGame('clock'); };
      faceEl.appendChild(btn);
    }
    render(); ask();
  }

  $('clockHome').onclick = function () { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('clockSpeak').onclick = function () { if (clockSpeakText) speak(clockSpeakText); };

  /* ---------- TAKE AWAY (subtraction with tally lines) ---------- */
  let subSpeakText = '';
  function startSubtract() {
    show('subtract');
    const R = makeRNG('sub-' + Date.now() + '-' + Math.random());
    const lvl = currentLevel();
    const maxTop = lvl === 1 ? 9 : lvl === 2 ? 13 : 18;
    // Build 5 problems: top − take, always leaving at least 1 behind.
    const probs = [];
    for (let i = 0; i < 5; i++) {
      const top = R.int(3, maxTop);
      const take = R.int(1, top - 1);
      probs.push({ top: top, take: take });
    }
    let idx = 0, struck = 0, phase = 'strike';
    const eq = $('subEq'), hint = $('subHint'), stage = $('subStage'),
      ans = $('subAnswer'), feed = $('subFeedback'), title = $('subTitle');

    function say(t) { subSpeakText = t; speak(t); }

    function renderLines(p) {
      stage.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'sub-lines';
      for (let i = 0; i < p.top; i++) {
        const b = document.createElement('button');
        b.className = 'sub-line';
        b.type = 'button';
        b.setAttribute('aria-label', 'line');
        b.innerHTML = '<span class="sub-stick"></span><span class="sub-cross">✗</span>';
        b.onclick = function () { onStrike(b); };
        wrap.appendChild(b);
      }
      stage.appendChild(wrap);
    }

    function ask() {
      const p = probs[idx];
      struck = 0; phase = 'strike';
      title.textContent = '➖ Take Away (' + (idx + 1) + '/5)';
      eq.innerHTML = '<span class="sub-top">' + p.top + '</span> − <span class="sub-take">' +
        p.take + '</span> = <span class="sub-q">?</span>';
      hint.textContent = 'Tap ' + p.take + ' line' + (p.take > 1 ? 's' : '') + ' to cross out ✗';
      feed.className = 'feedback'; feed.textContent = '';
      ans.innerHTML = '';
      renderLines(p);
      say('Let us take away. We have ' + p.top + '. Cross out ' + p.take +
        ' line' + (p.take > 1 ? 's' : '') + ' by tapping them.');
    }

    function onStrike(b) {
      if (phase !== 'strike' || b.classList.contains('struck')) return;
      const p = probs[idx];
      b.classList.add('struck');
      struck++;
      hint.textContent = 'Crossed out ' + struck + ' of ' + p.take;
      say(String(struck));
      if (struck >= p.take) {
        phase = 'count';
        setTimeout(showCount, 650);
      }
    }

    function showCount() {
      const p = probs[idx], answer = p.top - p.take;
      // Gently highlight the lines that are still standing.
      stage.querySelectorAll('.sub-line:not(.struck)').forEach(function (el) {
        el.classList.add('left');
      });
      hint.textContent = 'Now count the lines left. How many? 🔢';
      say('Now count the lines that are left. How many are still standing?');
      // Build number options around the correct answer.
      const opts = [answer];
      let guard = 0;
      while (opts.length < 4 && guard++ < 40) {
        const d = answer + R.int(-2, 3);
        if (d >= 0 && d <= p.top && opts.indexOf(d) === -1) opts.push(d);
      }
      let f = 0;
      while (opts.length < 4 && f <= p.top) { if (opts.indexOf(f) === -1) opts.push(f); f++; }
      const shuffled = R.sample(opts, opts.length);
      ans.innerHTML = '';
      shuffled.forEach(function (n) {
        const btn = document.createElement('button');
        btn.className = 'sub-opt';
        btn.type = 'button';
        btn.textContent = n;
        btn.onclick = function () { onAnswer(n, answer, btn); };
        ans.appendChild(btn);
      });
    }

    function onAnswer(n, answer, btn) {
      if (phase !== 'count') return;
      const p = probs[idx];
      if (n === answer) {
        phase = 'done';
        eq.querySelector('.sub-q').textContent = answer;
        eq.querySelector('.sub-q').classList.add('sub-solved');
        ans.querySelectorAll('.sub-opt').forEach(function (o) { o.disabled = true; });
        btn.classList.add('right');
        addStars(1); burst();
        feed.className = 'feedback good';
        feed.textContent = '🎉 Yes! ' + p.top + ' − ' + p.take + ' = ' + answer;
        say('Well done! ' + p.top + ' take away ' + p.take + ' is ' + answer + '!');
        idx++;
        if (idx >= probs.length) setTimeout(finish, 1300);
        else setTimeout(ask, 1300);
      } else {
        btn.classList.add('wrong');
        feed.className = 'feedback try';
        feed.textContent = 'Not quite — count the lines still standing 👆';
        say('Not quite. Count the lines that are still standing.');
      }
    }

    function finish() {
      title.textContent = '🎉 Great job!';
      eq.innerHTML = '⭐ You are a Take Away star! ⭐';
      hint.textContent = '';
      stage.innerHTML = '';
      feed.className = 'feedback good'; feed.textContent = 'You crossed out and counted 5 problems!';
      say('Amazing! You are a take away star!');
      ans.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again seq-next';
      btn.textContent = 'Play Again ▶️';
      btn.onclick = startSubtract;
      ans.appendChild(btn);
    }

    ask();
  }

  $('subHome').onclick = function () { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('subSpeak').onclick = function () { if (subSpeakText) speak(subSpeakText); };

  /* ---------- WEB HERO (spider hero swings to the right number) ---------- */
  // "Webby" is our own little spider hero: a round red spider with a blue mask.
  const WEBBY_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<g stroke="#2b2d42" stroke-width="5" stroke-linecap="round" fill="none">' +
    '<path d="M30 50 Q16 38 8 46"/><path d="M27 58 Q10 54 4 62"/><path d="M28 66 Q12 70 8 80"/><path d="M33 74 Q24 84 22 94"/>' +
    '<path d="M70 50 Q84 38 92 46"/><path d="M73 58 Q90 54 96 62"/><path d="M72 66 Q88 70 92 80"/><path d="M67 74 Q76 84 78 94"/>' +
    '</g>' +
    '<circle cx="50" cy="58" r="26" fill="#e63946"/>' +
    '<circle cx="50" cy="70" r="9" fill="#ff6b6b"/>' +
    '<ellipse cx="50" cy="50" rx="25" ry="11" fill="#1d4ed8"/>' +
    '<ellipse cx="40" cy="50" rx="8" ry="9" fill="#fff"/><ellipse cx="60" cy="50" rx="8" ry="9" fill="#fff"/>' +
    '<circle cx="41" cy="51" r="4" fill="#2b2d42"/><circle cx="61" cy="51" r="4" fill="#2b2d42"/>' +
    '<path d="M42 64 Q50 71 58 64" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>' +
    '</svg>';
  let webSpeakText = '';
  let webPlace = null; // re-seats the hero on its roof when the screen resizes
  window.addEventListener('resize', function () { if (webPlace) webPlace(); });

  function startWebHero() {
    show('webhero');
    const R = makeRNG('web-' + Date.now() + '-' + Math.random());
    const lvl = currentLevel();
    const ROUNDS = 6;
    let idx = 0, phase = 'pick', cur = null, hero = null;
    const title = $('webTitle'), qEl = $('webQ'), stage = $('webStage'),
      feed = $('webFeedback'), ctrl = $('webControls');

    function say(t) { webSpeakText = t; speak(t); }

    // One question per swing; harder kinds unlock as the child's rank grows.
    function makeQ() {
      const kinds = lvl === 1 ? ['find', 'count', 'next']
        : lvl === 2 ? ['find', 'count', 'next', 'add'] : ['find', 'next', 'add', 'sub'];
      const kind = R.pick(kinds);
      const maxN = lvl === 1 ? 10 : lvl === 2 ? 20 : 50;
      if (kind === 'find') {
        const n = R.int(1, maxN);
        return { answer: n, html: 'Swing to number <b>' + n + '</b>!', speech: 'Swing to the building with number ' + n + '!' };
      }
      if (kind === 'count') {
        const n = R.int(1, lvl === 1 ? 6 : 10);
        return { answer: n, html: 'How many bugs? <span class="web-bugs">' + '🐞'.repeat(n) + '</span>', speech: 'Count the bugs. How many bugs are there?' };
      }
      if (kind === 'next') {
        const n = R.int(1, maxN - 1);
        return { answer: n + 1, html: 'What comes after <b>' + n + '</b>?', speech: 'What number comes after ' + n + '?' };
      }
      if (kind === 'add') {
        const top = lvl === 2 ? 10 : 20;
        const a = R.int(1, top - 1), b = R.int(1, top - a);
        return { answer: a + b, html: '<b>' + a + ' + ' + b + ' = ?</b>', speech: a + ' plus ' + b + '. Swing to the answer!' };
      }
      const a = R.int(5, 20), b = R.int(1, a - 1);
      return { answer: a - b, html: '<b>' + a + ' − ' + b + ' = ?</b>', speech: a + ' take away ' + b + '. Swing to the answer!' };
    }

    function choices(answer) {
      const opts = [answer];
      let guard = 0;
      while (opts.length < 3 && guard++ < 60) {
        const d = answer + R.int(-3, 3);
        if (d >= 1 && opts.indexOf(d) === -1) opts.push(d);
      }
      return R.shuffle(opts);
    }

    // Put the hero on top of a building (or roof element).
    function seat(el) {
      const s = stage.getBoundingClientRect(), t = el.getBoundingClientRect();
      hero.style.left = (t.left - s.left + t.width / 2 - hero.offsetWidth / 2) + 'px';
      hero.style.top = (t.top - s.top - hero.offsetHeight + 8) + 'px';
      hero.style.transform = '';
    }

    function ask() {
      cur = makeQ(); phase = 'pick';
      title.textContent = '🕷️ Web Hero (' + (idx + 1) + '/' + ROUNDS + ')';
      qEl.innerHTML = cur.html;
      feed.className = 'feedback'; feed.textContent = '';
      ctrl.innerHTML = '';
      stage.innerHTML = '<svg class="web-line" aria-hidden="true"><line x1="0" y1="0" x2="0" y2="0"/></svg>' +
        '<span class="web-sun">☀️</span><span class="web-cloud c1">☁️</span><span class="web-cloud c2">☁️</span>';
      const city = document.createElement('div');
      city.className = 'web-city';
      const home = document.createElement('div');
      home.className = 'web-bld web-home';
      city.appendChild(home);
      const heights = R.shuffle([56, 68, 80]);
      choices(cur.answer).forEach(function (n, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'web-bld web-pick c' + i;
        b.style.height = heights[i] + '%';
        b.setAttribute('aria-label', 'Building number ' + n);
        b.innerHTML = '<span class="web-num">' + n + '</span>';
        b.onclick = function () { onPick(b, n); };
        city.appendChild(b);
      });
      stage.appendChild(city);
      hero = document.createElement('div');
      hero.className = 'web-hero';
      hero.innerHTML = WEBBY_SVG;
      stage.appendChild(hero);
      seat(home);
      webPlace = function () { if (phase === 'pick' && $('webhero').classList.contains('active')) seat(home); };
      say(cur.speech);
    }

    function onPick(b, n) {
      if (phase !== 'pick') return;
      if (n !== cur.answer) {
        b.classList.remove('web-wrong'); void b.offsetWidth; b.classList.add('web-wrong');
        feed.className = 'feedback try';
        feed.textContent = 'Oops! Try another building 👆';
        say('Oops! Not that one. Try again.');
        return;
      }
      phase = 'swing';
      feed.className = 'feedback good';
      feed.textContent = '🕸️ Thwip! Yes, ' + n + '!';
      say('Thwip! Yes, ' + n + '!');
      swingTo(b, function () {
        b.classList.add('web-landed');
        addStars(1); burst();
        idx++;
        setTimeout(idx >= ROUNDS ? finish : ask, 1100);
      });
    }

    // Shoot a web to a point high above the gap, then swing down and up onto the roof.
    function swingTo(b, done) {
      const s = stage.getBoundingClientRect(), t = b.getBoundingClientRect();
      const hw = hero.offsetWidth, hh = hero.offsetHeight;
      const x0 = parseFloat(hero.style.left), y0 = parseFloat(hero.style.top);
      const x1 = t.left - s.left + t.width / 2 - hw / 2, y1 = t.top - s.top - hh + 8;
      const ax = (x0 + x1) / 2 + hw / 2, ay = 6;
      const dip = Math.min(70, s.height * 0.18);
      const line = stage.querySelector('.web-line line');
      const lineSvg = stage.querySelector('.web-line');
      lineSvg.classList.add('on');
      const t0 = performance.now(), dur = 1000;
      function frame(now) {
        const raw = Math.min(1, (now - t0) / dur);
        const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
        const x = x0 + (x1 - x0) * p;
        const y = y0 + (y1 - y0) * p + Math.sin(Math.PI * p) * dip;
        hero.style.left = x + 'px';
        hero.style.top = y + 'px';
        hero.style.transform = 'rotate(' + ((0.5 - p) * 40) + 'deg)';
        line.setAttribute('x1', ax); line.setAttribute('y1', ay);
        line.setAttribute('x2', x + hw / 2); line.setAttribute('y2', y + hh * 0.35);
        if (raw < 1) requestAnimationFrame(frame);
        else { hero.style.transform = ''; lineSvg.classList.remove('on'); done(); }
      }
      requestAnimationFrame(frame);
    }

    function finish() {
      webPlace = null;
      title.textContent = '🎉 Great job!';
      qEl.innerHTML = '⭐ You saved the kitty! ⭐';
      stage.innerHTML = '<div class="web-win"><div class="web-hero big">' + WEBBY_SVG + '</div><span class="web-kitty">🐱</span></div>';
      feed.className = 'feedback good'; feed.textContent = 'Webby swung across ' + ROUNDS + ' buildings with you!';
      say('Hooray! You helped Webby save the kitty! You are a web hero!');
      ctrl.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again seq-next';
      btn.textContent = 'Play Again ▶️';
      btn.onclick = startWebHero;
      ctrl.appendChild(btn);
    }

    ask();
  }

  $('webHome').onclick = function () { webPlace = null; if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('webSpeak').onclick = function () { if (webSpeakText) speak(webSpeakText); };

  /* ---------- SHAPES & SPACE (hub + three spatial-reasoning games) ---------- */
  function goHomeFromShapes() { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); }
  $('shapesHubHome').onclick = goHomeFromShapes;

  // Draw one shape inside a 100x100 box (stretched to the element's size).
  const SHAPE_NAMES = { sq: 'square', rect: 'rectangle', tri: 'triangle', circ: 'circle', semi: 'half circle' };
  function shapeSVG(kind, fill, outline) {
    const a = outline
      ? 'fill="rgba(255,255,255,.55)" stroke="#7b6fd6" stroke-width="3" stroke-dasharray="7 5" vector-effect="non-scaling-stroke"'
      : 'fill="' + fill + '" stroke="rgba(0,0,0,.18)" stroke-width="2" vector-effect="non-scaling-stroke"';
    const body = kind === 'tri' ? '<polygon points="50,1 99,99 1,99" ' + a + '/>'
      : kind === 'circ' ? '<ellipse cx="50" cy="50" rx="49" ry="49" ' + a + '/>'
        : kind === 'semi' ? '<path d="M1 1 H99 A49 98 0 0 1 1 1 Z" ' + a + '/>'
          : '<rect x="1" y="1" width="98" height="98" rx="4" ' + a + '/>';
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + body + '</svg>';
  }
  // Is a piece turned to `a` the same as a slot turned to `b`? (squares/circles look the same any way up)
  function sameTurn(kind, a, b) {
    a = ((a % 360) + 360) % 360; b = ((b % 360) + 360) % 360;
    if (kind === 'sq' || kind === 'circ') return true;
    if (kind === 'rect') return a % 180 === b % 180;
    return a === b;
  }

  /* --- Shape Builder: drag shapes into a picture outline (tap a shape to turn it) --- */
  // Each piece: [kind, centreX, centreY, width, height, turn] in board units (0-100).
  const TG_PICS = [
    { name: 'house', emoji: '🏠', lvl: 1, pieces: [['tri', 50, 30, 64, 28, 0], ['sq', 50, 64, 40, 40, 0], ['rect', 72, 22, 8, 16, 0]] },
    { name: 'ice cream', emoji: '🍦', lvl: 1, pieces: [['circ', 50, 12, 10, 10, 0], ['circ', 50, 34, 36, 36, 0], ['tri', 50, 70, 32, 36, 180]] },
    { name: 'snowman', emoji: '⛄', lvl: 1, pieces: [['circ', 50, 76, 36, 36, 0], ['circ', 50, 45, 28, 28, 0], ['circ', 50, 21, 20, 20, 0]] },
    { name: 'tree', emoji: '🌲', lvl: 1, pieces: [['tri', 50, 24, 40, 28, 0], ['tri', 50, 49, 58, 28, 0], ['rect', 50, 75, 12, 22, 0]] },
    { name: 'boat', emoji: '⛵', lvl: 1, pieces: [['semi', 50, 76, 66, 18, 0], ['tri', 42, 44, 36, 40, 0], ['tri', 70, 50, 20, 28, 0]] },
    { name: 'fish', emoji: '🐟', lvl: 1, pieces: [['circ', 42, 50, 44, 44, 0], ['tri', 76, 50, 26, 24, 270]] },
    { name: 'rocket', emoji: '🚀', lvl: 1, pieces: [['tri', 50, 17, 26, 22, 0], ['rect', 50, 48, 26, 40, 0], ['tri', 30, 72, 14, 18, 0], ['tri', 70, 72, 14, 18, 0]] },
    { name: 'car', emoji: '🚗', lvl: 1, pieces: [['rect', 50, 40, 34, 16, 0], ['rect', 50, 56, 72, 18, 0], ['circ', 30, 72, 16, 16, 0], ['circ', 70, 72, 16, 16, 0]] },
    { name: 'robot', emoji: '🤖', lvl: 3, pieces: [['sq', 50, 22, 28, 28, 0], ['rect', 50, 55, 40, 34, 0], ['rect', 20, 54, 10, 26, 0], ['rect', 80, 54, 10, 26, 0], ['rect', 41, 82, 10, 18, 0], ['rect', 59, 82, 10, 18, 0]] },
    { name: 'castle', emoji: '🏰', lvl: 3, pieces: [['sq', 50, 62, 40, 40, 0], ['rect', 20, 60, 16, 44, 0], ['rect', 80, 60, 16, 44, 0], ['tri', 20, 28, 20, 20, 0], ['tri', 80, 28, 20, 20, 0], ['semi', 50, 37, 24, 10, 180]] }
  ];
  function aAn(w) { return (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w; }
  const TG_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#4cc9f0'];
  let tgSpeakText = '';
  let tgResize = null;
  window.addEventListener('resize', function () { if (tgResize) tgResize(); });

  function startTangram() {
    show('tangram');
    const R = makeRNG('tg-' + Date.now() + '-' + Math.random());
    const lvl = currentLevel();
    const canTurn = lvl >= 2;
    const pics = R.sample(TG_PICS.filter(function (p) { return p.lvl <= lvl; }), 3);
    let idx = 0, slots = [], left = 0, busy = false;
    const board = $('tgBoard'), tray = $('tgTray'), hint = $('tgHint'), feed = $('tgFeedback'),
      ctrl = $('tgControls'), title = $('tgTitle'), screen = $('tangram');

    function say(t) { tgSpeakText = t; speak(t); }
    function sizeVar() { screen.style.setProperty('--tgB', board.clientWidth + 'px'); }
    tgResize = function () { if (screen.classList.contains('active')) sizeVar(); };

    function ask() {
      const pic = pics[idx];
      busy = false;
      title.textContent = '🏠 Shape Builder (' + (idx + 1) + '/' + pics.length + ')';
      hint.textContent = canTurn ? 'Drag each shape into its place. Tap a shape to turn it 🔄' : 'Drag each shape into its place!';
      feed.className = 'feedback'; feed.textContent = '';
      ctrl.innerHTML = '';
      board.className = 'tg-board'; board.innerHTML = '';
      tray.innerHTML = '';
      slots = pic.pieces.map(function (p, i) {
        const el = document.createElement('div');
        el.className = 'tg-slot';
        el.style.left = p[1] + '%'; el.style.top = p[2] + '%';
        el.style.width = p[3] + '%'; el.style.height = p[4] + '%';
        el.style.transform = 'translate(-50%,-50%) rotate(' + p[5] + 'deg)';
        el.innerHTML = shapeSVG(p[0], null, true);
        board.appendChild(el);
        return { kind: p[0], cx: p[1], cy: p[2], w: p[3], h: p[4], turn: p[5], el: el, filled: false, color: TG_COLORS[i % TG_COLORS.length] };
      });
      left = slots.length;
      sizeVar();
      // Tray pieces: same sizes as the outline; at higher ranks they arrive turned.
      const pieces = slots.map(function (s) { return { kind: s.kind, w: s.w, h: s.h, color: s.color, turn: s.turn }; });
      if (lvl >= 3) {
        const d = R.pick(slots); // one extra shape that does not belong
        const side = Math.min(d.w, 30); // 30 matches no real circle or square in any picture
        pieces.push({ kind: d.kind === 'circ' ? 'sq' : 'circ', w: side, h: side, color: '#adb5bd', turn: 0 });
      }
      R.shuffle(pieces).forEach(function (pc) {
        if (canTurn && pc.kind !== 'sq' && pc.kind !== 'circ') pc.turn = R.pick([0, 90, 180, 270]);
        tray.appendChild(makePiece(pc));
      });
      say('Let us build ' + aAn(pic.name) + '! Drag each shape into its place.' + (canTurn ? ' Tap a shape to turn it.' : ''));
    }

    function makePiece(pc) {
      const wrap = document.createElement('div');
      wrap.className = 'tg-piece';
      const inner = document.createElement('div');
      inner.className = 'tg-shape';
      inner.innerHTML = shapeSVG(pc.kind, pc.color, false);
      wrap.appendChild(inner);
      function fit() {
        const side = pc.turn % 180 === 0;
        wrap.style.width = 'calc(var(--tgB) * ' + ((side ? pc.w : pc.h) / 100) + ')';
        wrap.style.height = 'calc(var(--tgB) * ' + ((side ? pc.h : pc.w) / 100) + ')';
        inner.style.width = 'calc(var(--tgB) * ' + (pc.w / 100) + ')';
        inner.style.height = 'calc(var(--tgB) * ' + (pc.h / 100) + ')';
        inner.style.transform = 'translate(-50%,-50%) rotate(' + pc.turn + 'deg)';
      }
      fit();
      let down = false, moved = false, sx = 0, sy = 0;
      wrap.addEventListener('pointerdown', function (e) {
        if (busy) return;
        down = true; moved = false; sx = e.clientX; sy = e.clientY;
        try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
      });
      wrap.addEventListener('pointermove', function (e) {
        if (!down) return;
        if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
        if (!moved) { moved = true; wrap.classList.add('dragging'); }
        wrap.style.left = (e.clientX - wrap.offsetWidth / 2) + 'px';
        wrap.style.top = (e.clientY - wrap.offsetHeight / 2) + 'px';
      });
      function end(e) {
        if (!down) return; down = false;
        if (!moved) { onTap(pc, wrap, fit); return; }
        wrap.classList.remove('dragging'); wrap.style.left = ''; wrap.style.top = '';
        if (e.type === 'pointerup') onDrop(pc, wrap, e.clientX, e.clientY);
      }
      wrap.addEventListener('pointerup', end);
      wrap.addEventListener('pointercancel', end);
      return wrap;
    }

    function onTap(pc, wrap, fit) {
      if (canTurn && pc.kind !== 'sq' && pc.kind !== 'circ') {
        pc.turn = (pc.turn + 90) % 360; fit();
        say('Turn!');
        return;
      }
      // Starter level: show where this shape could go.
      const match = slots.filter(function (s) { return !s.filled && s.kind === pc.kind && s.w === pc.w && s.h === pc.h; });
      match.forEach(function (s) { s.el.classList.remove('tg-glow'); void s.el.offsetWidth; s.el.classList.add('tg-glow'); });
      say(match.length ? 'A ' + SHAPE_NAMES[pc.kind] + '! Drag it to the glowing spot.' : 'This ' + SHAPE_NAMES[pc.kind] + ' does not belong in the picture.');
    }

    function onDrop(pc, wrap, x, y) {
      const r = board.getBoundingClientRect();
      const bx = (x - r.left) / r.width * 100, by = (y - r.top) / r.height * 100;
      const onBoard = bx > -10 && bx < 110 && by > -10 && by < 110;
      let best = null, bestD = 1e9;
      slots.forEach(function (s) {
        if (s.filled || s.kind !== pc.kind || s.w !== pc.w || s.h !== pc.h) return;
        const d = Math.hypot(s.cx - bx, s.cy - by);
        if (d < bestD) { bestD = d; best = s; }
      });
      if (best && bestD <= 24) {
        if (!sameTurn(pc.kind, pc.turn, best.turn)) {
          feed.className = 'feedback try';
          feed.textContent = '🔄 Right shape! Tap it to turn it, then try again';
          say('Right shape! Tap it to turn it around, then try again.');
          return;
        }
        best.filled = true;
        best.el.classList.add('filled');
        best.el.innerHTML = shapeSVG(best.kind, pc.color, false);
        wrap.remove();
        left--;
        feed.className = 'feedback good'; feed.textContent = '✨ ' + SHAPE_NAMES[pc.kind] + '!';
        say(SHAPE_NAMES[pc.kind] + '!');
        if (left === 0) done();
      } else if (onBoard) {
        feed.className = 'feedback try';
        feed.textContent = 'Hmm, that shape does not fit there 🤔';
        say('Hmm, that shape does not fit there. Look for the same shape and size.');
      }
    }

    function done() {
      const pic = pics[idx];
      busy = true;
      Array.prototype.forEach.call(tray.children, function (c) { c.remove(); });
      board.classList.add('tg-done');
      const badge = document.createElement('div');
      badge.className = 'tg-badge';
      badge.textContent = pic.emoji;
      board.appendChild(badge);
      feed.className = 'feedback good'; feed.textContent = '🎉 You built ' + aAn(pic.name) + '!';
      say('Wow! You built ' + aAn(pic.name) + '!');
      addStars(1); burst();
      idx++;
      setTimeout(idx >= pics.length ? finish : ask, 2000);
    }

    function finish() {
      title.textContent = '🎉 Great job!';
      hint.textContent = '⭐ You are a Shape Builder! ⭐';
      board.innerHTML = '<div class="tg-win">' + pics.map(function (p) { return p.emoji; }).join(' ') + '</div>';
      feed.className = 'feedback good'; feed.textContent = 'You built ' + pics.length + ' pictures with shapes!';
      say('Amazing! You built ' + pics.length + ' pictures with shapes!');
      ctrl.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again seq-next';
      btn.textContent = 'Play Again ▶️';
      btn.onclick = startTangram;
      ctrl.appendChild(btn);
    }

    ask();
  }
  $('tgHome').onclick = function () { tgResize = null; goHomeFromShapes(); };
  $('tgSpeak').onclick = function () { if (tgSpeakText) speak(tgSpeakText); };

  /* --- Which is Turned?: find the same picture turned, not flipped like a mirror --- */
  // Pictures that clearly face one way, so a mirror flip looks different.
  const TURN_PICS = ['🦒', '🐘', '🦕', '🦖', '🐌', '🦆', '🐿️', '🐎', '🐓', '🦜', '🐢', '🚲', '🛴', '👢', '🎺', '🐇', '🐈', '🐕', '🦩', '🐪'];
  let turnSpeakText = '';

  function startTurn() {
    show('turn');
    const R = makeRNG('turn-' + Date.now() + '-' + Math.random());
    const lvl = currentLevel();
    const ROUNDS = 6;
    let idx = 0, locked = false;
    const hint = $('turnHint'), target = $('turnTarget'), opts = $('turnOpts'),
      feed = $('turnFeedback'), ctrl = $('turnControls'), title = $('turnTitle');

    function say(t) { turnSpeakText = t; speak(t); }

    function ask() {
      locked = false;
      const pic = R.pick(TURN_PICS);
      const angles = lvl >= 3 ? [45, 90, 135, 180, 225, 270, 315] : [90, 180, 270];
      const others = TURN_PICS.filter(function (p) { return p !== pic; });
      // Starter: the twin vs other pictures. Higher ranks: the twin vs mirror-flipped copies.
      const choices = [{ pic: pic, turn: R.pick(angles), flip: false, ok: true }];
      if (lvl === 1) {
        R.sample(others, 2).forEach(function (o) { choices.push({ pic: o, turn: R.pick(angles), flip: false, ok: false }); });
      } else {
        const mirrors = lvl >= 3 ? 2 : 1;
        for (let i = 0; i < mirrors; i++) choices.push({ pic: pic, turn: R.pick([0].concat(angles)), flip: true, ok: false });
        choices.push({ pic: R.pick(others), turn: R.pick(angles), flip: false, ok: false });
      }
      title.textContent = '🔄 Which is Turned? (' + (idx + 1) + '/' + ROUNDS + ')';
      hint.textContent = lvl === 1 ? 'Find the same picture, just turned around!' : 'Find the one that is turned — not flipped like a mirror 🪞';
      feed.className = 'feedback'; feed.textContent = '';
      ctrl.innerHTML = '';
      target.innerHTML = '<span class="turn-pic">' + pic + '</span>';
      opts.innerHTML = '';
      R.shuffle(choices).forEach(function (c) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'turn-opt';
        b.innerHTML = '<span class="turn-pic" style="transform:rotate(' + c.turn + 'deg)' + (c.flip ? ' scaleX(-1)' : '') + '">' + c.pic + '</span>';
        b.onclick = function () { onPick(c, b); };
        opts.appendChild(b);
      });
      say(lvl === 1 ? 'Which one is the same picture, just turned around?'
        : 'Which one is the same picture, just turned? Watch out for the mirror flip!');
    }

    function onPick(c, b) {
      if (locked) return;
      if (c.ok) {
        locked = true;
        b.classList.add('right');
        feed.className = 'feedback good'; feed.textContent = '🎉 Yes! It is just turned!';
        say('Yes! That one is just turned around!');
        addStars(1); burst();
        idx++;
        setTimeout(idx >= ROUNDS ? finish : ask, 1400);
        return;
      }
      b.classList.add('wrong');
      b.disabled = true;
      feed.className = 'feedback try';
      if (c.flip) {
        feed.textContent = '🪞 That one is flipped like a mirror. Try again!';
        say('That one is flipped, like in a mirror. Try again!');
      } else {
        feed.textContent = 'That is a different picture. Try again!';
        say('That is a different picture. Try again!');
      }
    }

    function finish() {
      title.textContent = '🎉 Great job!';
      hint.textContent = '⭐ Super spinning brain! ⭐';
      target.innerHTML = '<span class="turn-pic turn-spin">🌀</span>';
      opts.innerHTML = '';
      feed.className = 'feedback good'; feed.textContent = 'You found ' + ROUNDS + ' turned pictures!';
      say('Amazing! You have a super spinning brain!');
      ctrl.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again seq-next';
      btn.textContent = 'Play Again ▶️';
      btn.onclick = startTurn;
      ctrl.appendChild(btn);
    }

    ask();
  }
  $('turnHome').onclick = goHomeFromShapes;
  $('turnSpeak').onclick = function () { if (turnSpeakText) speak(turnSpeakText); };

  /* --- Spot the Difference: two scenes, tap what changed --- */
  const SPOT_THEMES = [
    { name: 'garden', bg: 'sp-garden', items: ['🌸', '🌻', '🌷', '🐝', '🦋', '🐞', '🍄', '🐛', '🐌', '🌳', '🐦', '🌼'] },
    { name: 'ocean', bg: 'sp-ocean', items: ['🐟', '🐠', '🐙', '🦀', '🐚', '🐬', '🐳', '🦑', '🐡', '⭐', '🦈', '🐢'] },
    { name: 'kitchen', bg: 'sp-kitchen', items: ['🍎', '🍌', '🍇', '🍓', '🥕', '🧀', '🍪', '🥛', '🍞', '🥚', '🍉', '🍒'] },
    { name: 'toy box', bg: 'sp-toys', items: ['🧸', '⚽', '🎈', '🎨', '🧩', '🎲', '🚗', '🥁', '🎺', '🏀', '🚀', '🎁'] }
  ];
  let spotSpeakText = '';

  function startSpot() {
    show('spot');
    const R = makeRNG('spot-' + Date.now() + '-' + Math.random());
    const lvl = currentLevel();
    const cols = lvl === 1 ? 3 : 4, rows = lvl >= 3 ? 4 : 3, nDiff = lvl === 1 ? 2 : lvl === 2 ? 3 : 4;
    const themes = R.sample(SPOT_THEMES, 3);
    let idx = 0, found = 0, diffs = [], locked = false;
    const hint = $('spotHint'), scenes = $('spotScenes'), feed = $('spotFeedback'),
      ctrl = $('spotControls'), title = $('spotTitle');

    function say(t) { spotSpeakText = t; speak(t); }
    function progress() {
      let dots = '';
      for (let i = 0; i < nDiff; i++) dots += i < found ? '🔴' : '⚪';
      hint.textContent = 'Find ' + nDiff + ' differences: ' + dots;
    }

    function ask() {
      const th = themes[idx];
      locked = false; found = 0;
      title.textContent = '🔍 Spot the Difference (' + (idx + 1) + '/' + themes.length + ')';
      feed.className = 'feedback'; feed.textContent = '';
      ctrl.innerHTML = '';
      // Left picture: every cell gets an item, nudged a little so it looks natural.
      const cells = [];
      for (let i = 0; i < cols * rows; i++) {
        cells.push({ e: R.pick(th.items), dx: R.int(-12, 12), dy: R.int(-12, 12), s: 0.85 + R.next() * 0.3 });
      }
      // Right picture: a copy with a few changes.
      const kinds = lvl >= 2 ? ['swap', 'gone', 'big'] : ['swap', 'gone'];
      diffs = R.sample(cells.map(function (_, i) { return i; }), nDiff);
      const right = cells.map(function (c) { return { e: c.e, dx: c.dx, dy: c.dy, s: c.s }; });
      diffs.forEach(function (i, k) {
        const kind = k === 0 ? 'swap' : R.pick(kinds);
        if (kind === 'swap') right[i].e = R.pick(th.items.filter(function (x) { return x !== cells[i].e; }));
        else if (kind === 'gone') right[i].e = '';
        else right[i].s = cells[i].s * 1.6;
      });
      scenes.innerHTML = '';
      scenes.style.setProperty('--spCols', cols);
      [cells, right].forEach(function (list) {
        const sc = document.createElement('div');
        sc.className = 'sp-scene ' + th.bg;
        list.forEach(function (c, i) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'sp-cell';
          b.dataset.i = i;
          b.innerHTML = '<span class="sp-item" style="transform:translate(' + c.dx + '%,' + c.dy + '%) scale(' + c.s + ')">' + c.e + '</span>';
          b.onclick = function () { onTap(i, sc); };
          sc.appendChild(b);
        });
        scenes.appendChild(sc);
      });
      progress();
      say('Look at the two ' + th.name + ' pictures. Find ' + nDiff + ' things that are different!');
    }

    function onTap(i, sc) {
      if (locked) return;
      if (diffs.indexOf(i) === -1) {
        sc.classList.remove('sp-nope'); void sc.offsetWidth; sc.classList.add('sp-nope');
        feed.className = 'feedback try'; feed.textContent = 'Those look the same. Look closely 👀';
        say('Those look the same. Look closely!');
        return;
      }
      const cellsAt = scenes.querySelectorAll('.sp-cell[data-i="' + i + '"]');
      if (cellsAt[0].classList.contains('found')) return;
      cellsAt.forEach(function (c) { c.classList.add('found'); });
      found++;
      progress();
      if (found >= nDiff) {
        locked = true;
        feed.className = 'feedback good'; feed.textContent = '🎉 You found them all!';
        say('Wow! You found all the differences!');
        addStars(1); burst();
        idx++;
        setTimeout(idx >= themes.length ? finish : ask, 1600);
      } else {
        feed.className = 'feedback good'; feed.textContent = '⭕ You found one!';
        say('You found one! ' + (nDiff - found) + ' more to go.');
      }
    }

    function finish() {
      title.textContent = '🎉 Great job!';
      hint.textContent = '⭐ Super sharp eyes! ⭐';
      scenes.innerHTML = '<div class="tg-win">🔍👀✨</div>';
      feed.className = 'feedback good'; feed.textContent = 'You spotted every difference in ' + themes.length + ' pictures!';
      say('Amazing! You have super sharp eyes!');
      ctrl.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'big-btn play-again seq-next';
      btn.textContent = 'Play Again ▶️';
      btn.onclick = startSpot;
      ctrl.appendChild(btn);
    }

    ask();
  }
  $('spotHome').onclick = goHomeFromShapes;
  $('spotSpeak').onclick = function () { if (spotSpeakText) speak(spotSpeakText); };

  /* ---------- confetti ---------- */
  const cv = $('confetti'); const ctx = cv.getContext('2d');
  let parts = [];
  function resize() { cv.width = innerWidth; cv.height = innerHeight; }
  resize(); addEventListener('resize', resize);
  function burst() {
    const colors = ['#ff5da2', '#ffb703', '#3aa0ff', '#27c46b', '#9b5de5', '#ef476f'];
    for (let i = 0; i < 60; i++) {
      parts.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: innerHeight / 3,
        vx: (Math.random() - 0.5) * 9,
        vy: Math.random() * -9 - 3,
        g: 0.28 + Math.random() * 0.15,
        s: 6 + Math.random() * 8,
        c: colors[(Math.random() * colors.length) | 0],
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        life: 90,
      });
    }
    if (!raf) loop();
  }
  let raf = null;
  function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach(p => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    parts = parts.filter(p => p.life > 0 && p.y < cv.height + 30);
    if (parts.length) raf = requestAnimationFrame(loop);
    else { ctx.clearRect(0, 0, cv.width, cv.height); raf = null; }
  }

  /* ---------- FIREBASE AUTH + CLOUD PROFILE / POINTS ---------- */
  let welcomeFallbackTimer = null;

  function initFirebase() {
    try {
      const cfg = window.APP_CONFIG && window.APP_CONFIG.firebase;
      if (!cfg || !cfg.apiKey || typeof firebase === 'undefined') return;
      firebase.initializeApp(cfg);
      fb.auth = firebase.auth();
      fb.db = firebase.firestore();
      fb.enabled = true;
      try { fb.auth.useDeviceLanguage(); } catch (e) {}
      // Keep the Google session across visits (survives reloads/closing the tab).
      try { fb.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (e) {}
      // Complete any redirect-based sign-in (mobile browsers that block popups).
      try { fb.auth.getRedirectResult().catch(function () {}); } catch (e) {}
      fb.auth.onAuthStateChanged(handleAuthChange);
    } catch (e) { console.warn('Firebase init skipped:', e && e.message); }
  }

  function currentScreen() { const s = document.querySelector('.screen.active'); return s ? s.id : ''; }

  function handleAuthChange(user) {
    fb.ready = true;
    if (welcomeFallbackTimer) { clearTimeout(welcomeFallbackTimer); welcomeFallbackTimer = null; }
    if (user) {
      state.user = user;
      loadProfile(user).then((prof) => {
        if (!prof || !prof.childName) prof = cachedProfile(user.uid); // same-device fallback
        if (prof && prof.childName) {
          applyProfile(prof);
          cacheProfile(user.uid, prof);
          if (currentScreen() === 'welcome') stepMood();
          else if (currentScreen() === 'profile') renderProfile();
          else initHome();
        } else {
          state.profile = null; // brand-new account -> no stale data from a previous user
          if (currentScreen() !== 'welcome') show('welcome');
          stepProfileSetup(user);
        }
      });
    } else {
      state.user = null; state.profile = null;
      if (currentScreen() === 'welcome') stepAuth();
      else if (currentScreen() === 'profile') renderProfile();
    }
  }

  // Resolve a promise but never wait forever (Firestore can hang if the DB
  // isn't created yet) — fall back to `fallback` after `ms`.
  function withTimeout(promise, ms, fallback) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const t = setTimeout(() => finish(fallback), ms);
      promise.then((v) => { clearTimeout(t); finish(v); })
        .catch(() => { clearTimeout(t); finish(fallback); });
    });
  }

  function loadProfile(user) {
    if (!fb.enabled) return Promise.resolve(null);
    const get = fb.db.collection('users').doc(user.uid).get()
      .then((doc) => (doc.exists ? doc.data() : null))
      .catch(() => null);
    return withTimeout(get, 6000, null); // never hang the welcome screen
  }

  // Per-account cache so a returning user on the SAME device skips setup even
  // if Firestore is unreachable/locked. (Cloud sync still needs Firestore.)
  function cacheProfile(uid, prof) {
    try { localStorage.setItem('ll_prof_' + uid, JSON.stringify(prof)); } catch (e) {}
  }
  function cachedProfile(uid) {
    try { return JSON.parse(localStorage.getItem('ll_prof_' + uid) || 'null'); } catch (e) { return null; }
  }

  function applyProfile(prof) {
    state.profile = prof;
    // Fully replace this device's cached view with THIS account's data.
    state.name = prof.childName || 'Star';
    localStorage.setItem('ll_name', state.name);
    localStorage.setItem('ll_school', prof.school || '');
    localStorage.setItem('ll_avatar', prof.avatar || '🧒');
    const pts = typeof prof.points === 'number' ? prof.points : 0;
    localStorage.setItem(totalKey(), String(pts));
    localStorage.setItem(rankKey(), String(rankIndex(pts)));
    updateAvatarUI();
  }

  function saveProfile(data) {
    if (!fb.enabled || !state.user) return Promise.resolve();
    const ref = fb.db.collection('users').doc(state.user.uid);
    return ref.set(Object.assign({
      email: state.user.email || '',
      photo: state.user.photoURL || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, data), { merge: true }).catch((e) => console.warn('saveProfile', e));
  }

  function cloudAddPoints(n) {
    if (!fb.enabled || !state.user) return;
    try {
      fb.db.collection('users').doc(state.user.uid).set({
        points: firebase.firestore.FieldValue.increment(n),
        lastPlayed: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e) { /* ignore */ }
  }

  function signInGoogle() {
    if (!fb.enabled) return;
    const provider = new firebase.auth.GoogleAuthProvider();
    setWelcome({ emoji: '⏳', title: 'Opening Google sign-in…' });
    fb.auth.signInWithPopup(provider).catch((err) => {
      const code = err && err.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' || code === 'auth/cancelled-popup-request') {
        fb.auth.signInWithRedirect(provider).catch(showSignInError);
      } else if (code === 'auth/popup-closed-by-user') {
        stepAuth();
      } else {
        showSignInError(err);
      }
    });
  }

  function showSignInError(err) {
    const code = (err && err.code) ? err.code : 'unknown-error';
    const body = setWelcome({ emoji: '😕', title: 'Sign in did not work', sub: 'Please try again.' });
    $('welcomeHome').hidden = true; // sign-in required — no bypass
    // show the real reason so a grown-up can fix the Firebase setting
    const detail = document.createElement('p');
    detail.className = 'welcome-note';
    detail.textContent = '⚠️ ' + code;
    body.appendChild(detail);
    const retry = document.createElement('button');
    retry.className = 'welcome-opt blue';
    retry.textContent = '🔵 Try Google again';
    retry.onclick = signInGoogle;
    body.appendChild(retry);
    console.warn('Google sign-in error:', code, err && err.message);
  }

  function doSignOut() {
    if (fb.enabled && fb.auth) { try { fb.auth.signOut(); } catch (e) {} }
    state.user = null; state.profile = null;
    show('welcome'); startWelcome();
  }

  function stepLoading() {
    setWelcome({ emoji: '🌈', title: 'Just a moment…', sub: 'Getting things ready' });
    $('welcomeHome').hidden = true; // don't allow bypass before auth is known
    if (welcomeFallbackTimer) clearTimeout(welcomeFallbackTimer);
    welcomeFallbackTimer = setTimeout(() => { if (!fb.ready) stepAuth(); }, 5000);
  }

  function stepAuth() {
    const body = setWelcome({ emoji: '🌈', title: 'Welcome to Pogogy!', sub: 'Sign in to start playing ⭐' });
    $('welcomeHome').hidden = true; // sign-in required — no bypass
    const g = document.createElement('button');
    g.className = 'welcome-opt blue';
    g.textContent = '🔵 Sign in with Google';
    g.onclick = signInGoogle;
    body.appendChild(g);
    speak('Welcome to Pogogy! Please ask a grown up to sign in with Google.');
  }

  function stepProfileSetup(user) {
    const guess = (user && user.displayName ? user.displayName.split(' ')[0] : '') || (state.name !== 'Star' ? state.name : '');
    const body = setWelcome({ emoji: '🧒', title: 'Set up your profile', sub: 'Tell us about the child' });
    $('welcomeHome').hidden = true; // finish the profile before entering
    const nameIn = entryInput("Child's name", guess, 14);
    const schoolIn = entryInput('School name', localStorage.getItem('ll_school') || '', 40);
    const avatarLabel = document.createElement('p');
    avatarLabel.className = 'welcome-note';
    avatarLabel.textContent = 'Choose your character';
    const avatarPick = entryAvatarPicker(localStorage.getItem('ll_avatar'));
    const btn = document.createElement('button');
    btn.className = 'welcome-opt welcome-start';
    btn.textContent = 'Save & Play 🎉';
    btn.onclick = () => {
      const child = nameIn.value.trim();
      const school = schoolIn.value.trim();
      const avatar = avatarPick.dataset.value || '🧒';
      if (!child) return nudge(nameIn);
      if (!school) return nudge(schoolIn);
      state.name = child.slice(0, 14);
      localStorage.setItem('ll_name', state.name);
      localStorage.setItem('ll_school', school);
      localStorage.setItem('ll_avatar', avatar);
      state.profile = Object.assign(state.profile || {}, { childName: state.name, school: school, avatar: avatar });
      if (state.user) cacheProfile(state.user.uid, state.profile); // remember on this device
      saveProfile({ childName: state.name, school: school, avatar: avatar }); // fire-and-forget (offline-safe)
      updateAvatarUI();
      stepMood(); // proceed immediately; never wait on the network
    };
    body.appendChild(nameIn);
    body.appendChild(schoolIn);
    body.appendChild(avatarLabel);
    body.appendChild(avatarPick);
    body.appendChild(btn);
    setTimeout(() => { try { nameIn.focus(); } catch (e) {} }, 120);
    speak('Please type the child name and school.');
  }

  /* ----- profile screen ----- */
  function openProfile() {
    if (fb.enabled && state.user) {
      loadProfile(state.user).then((p) => { if (p) applyProfile(p); renderProfile(); });
    }
    renderProfile();
    show('profile');
  }

  // Named levels earned by total stars — the progression/rank shown on the profile.
  const LEVELS = [
    { min: 0, name: 'Seedling', emoji: '🌱' },
    { min: 30, name: 'Sprout', emoji: '🌿' },
    { min: 75, name: 'Blossom', emoji: '🌼' },
    { min: 150, name: 'Little Star', emoji: '⭐' },
    { min: 250, name: 'Rainbow Kid', emoji: '🌈' },
    { min: 400, name: 'Rocket Star', emoji: '🚀' },
    { min: 600, name: 'Champion', emoji: '🏆' },
    { min: 900, name: 'Superstar', emoji: '👑' },
  ];
  function rankIndex(total) {
    let i = 0;
    for (let k = 0; k < LEVELS.length; k++) if (total >= LEVELS[k].min) i = k;
    return i;
  }
  function rankInfo(total) {
    const i = rankIndex(total);
    return { i: i, level: i + 1, cur: LEVELS[i], next: LEVELS[i + 1] || null };
  }

  function renderProfile() {
    const signedIn = !!(fb.enabled && state.user);
    const name = (state.name && state.name !== 'Star') ? state.name : (localStorage.getItem('ll_name') || 'Little Star');
    $('profileName').textContent = name;
    const school = (state.profile && state.profile.school) || localStorage.getItem('ll_school') || '';
    $('profileSchool').textContent = school ? '🏫 ' + school : '';
    $('profileEmail').textContent = signedIn ? (state.user.email || '') : '';
    // Show the child's chosen boy/girl avatar (tap to switch).
    $('profilePhoto').hidden = true;
    $('profileAvatar').hidden = false;
    $('profileAvatar').textContent = getAvatar();
    $('profileAvatar').title = 'Tap to change character';
    const total = getTotal();
    const rank = rankInfo(total);
    $('statTotal').textContent = total;
    $('statToday').textContent = getTodayStars();
    $('statBadge').textContent = rank.cur.emoji;
    $('statLevelLabel').textContent = 'Lv ' + rank.level + ' ' + rank.cur.name;
    // Progress to the next level (games also get a little harder as you climb).
    $('profileDifficulty').textContent = rank.next
      ? '⭐ ' + (rank.next.min - total) + ' more stars to become ' + rank.next.emoji + ' ' + rank.next.name + '!'
      : '👑 Top level reached — you are a Superstar!';
    $('profileSignIn').hidden = signedIn || !fb.enabled;
    $('profileSignOut').hidden = !signedIn;
    $('profileSignedOutNote').hidden = signedIn || !fb.enabled;
    $('profileSignIn').onclick = () => { show('welcome'); stepAuth(); };
    $('profileSignOut').onclick = doSignOut;
  }

  $('profileHome').onclick = () => { initHome(); show('home'); };
  $('welcomeHome').onclick = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  // Tap the avatar to switch between boy and girl.
  $('profileAvatar').onclick = () => { setAvatar(getAvatar() === '👦' ? '👧' : '👦'); };

  /* ---------- info modal (About / Privacy / Contact) ---------- */
  const INFO = {
    about: {
      title: 'About Pogogy',
      html: '<p><b>Pogogy</b> is a playful, safe learning world for little ones (ages 3–6, KG / PP1).</p>'
        + '<p>Through colorful, voice-guided games, children explore numbers, letters, addition, telling time, days &amp; months, logic, stories and more — with fresh puzzles every day.</p>'
        + '<p>Built with ❤️ to make early learning joyful, gentle and fun.</p>',
    },
    privacy: {
      title: 'Privacy',
      html: '<p>Your child’s safety and privacy come first. 🔒</p>'
        + '<p>To personalize learning and save progress, we collect a first name, school, class, a chosen character, and a parent’s Google account. We use <b>Google Sign-In</b> and store data securely with Google Firebase.</p>'
        + '<p>We <b>never</b> sell your data, and we show <b>no ads</b>.</p>'
        + '<p>You can ask us to delete your account and data at any time — just contact us.</p>',
    },
    contact: {
      title: 'Contact Us',
      html: '<p>We’d love to hear from you! 💌</p>'
        + '<p>For questions, feedback, or to remove your data, email us at:</p>'
        + '<p><a href="mailto:hello@pogogy.com">hello@pogogy.com</a></p>',
    },
  };
  function openInfo(type) {
    const info = INFO[type];
    if (!info) return;
    $('infoTitle').textContent = info.title;
    $('infoBody').innerHTML = info.html;
    $('infoModal').hidden = false;
  }
  function closeInfo() { $('infoModal').hidden = true; }
  $('infoClose').onclick = closeInfo;
  $('infoModal').addEventListener('click', (e) => { if (e.target === $('infoModal')) closeInfo(); });

  /* ---------- WELCOME / DAILY CHECK-IN ---------- */
  let welcomeTimer = null;

  function setWelcome(opts) {
    const el = $('welcomeEmoji');
    if (opts.emoji === '🌈') { el.innerHTML = RAINBOW_SVG; el.classList.add('is-logo'); }
    else { el.textContent = opts.emoji; el.classList.remove('is-logo'); }
    $('welcomeTitle').textContent = opts.title;
    $('welcomeSub').textContent = opts.sub || '';
    $('welcomeHome').hidden = false; // shown by default; gate screens hide it
    const body = $('welcomeBody');
    body.innerHTML = '';
    return body;
  }

  function addWelcomeOption(body, label, color, fn) {
    let row = body.querySelector('.welcome-options');
    if (!row) { row = document.createElement('div'); row.className = 'welcome-options'; body.appendChild(row); }
    const b = document.createElement('button');
    b.className = 'welcome-opt ' + color;
    b.textContent = label;
    b.onclick = fn;
    row.appendChild(b);
  }

  // Show a warm reaction, give her time to enjoy it, then move on.
  // Auto-advances after a relaxed pause, or she can tap "Next" to continue sooner.
  function reactThen(emoji, text, next) {
    const body = setWelcome({ emoji: emoji, title: text });
    speak(text);
    const go = () => {
      if (welcomeTimer) { clearTimeout(welcomeTimer); welcomeTimer = null; }
      next();
    };
    const btn = document.createElement('button');
    btn.className = 'welcome-opt blue';
    btn.textContent = 'Next ▶️';
    btn.onclick = go;
    body.appendChild(btn);
    if (welcomeTimer) clearTimeout(welcomeTimer);
    welcomeTimer = setTimeout(go, 4500);   // relaxed pause (was too quick before)
  }

  function startWelcome() {
    show('welcome');
    if (fb.enabled) stepLoading();   // wait for Google auth state, then route
    else stepEntry();                // no Firebase configured -> on-device flow
  }

  // Send a signup row to the owner's Google Sheet (via Apps Script web app).
  // Configured in js/config.js -> window.APP_CONFIG.signupEndpoint
  function recordSignup(data) {
    const url = (window.APP_CONFIG && window.APP_CONFIG.signupEndpoint) || '';
    if (!url) return; // not set up yet -> app still works, just doesn't log
    try {
      fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
      });
    } catch (e) { /* never block play on a logging error */ }
  }

  function entryInput(placeholder, value, max) {
    const i = document.createElement('input');
    i.className = 'name-input entry-field';
    i.type = 'text';
    i.maxLength = max;
    i.setAttribute('autocomplete', 'off');
    i.placeholder = placeholder;
    i.value = value || '';
    return i;
  }
  function nudge(el) {
    el.focus();
    el.classList.add('shake-input');
    setTimeout(() => el.classList.remove('shake-input'), 450);
  }

  // Boy / girl avatar picker used in profile setup.
  const AVATARS = ['👦', '👧'];
  function getAvatar() {
    return (state.profile && state.profile.avatar) || localStorage.getItem('ll_avatar') || '🧒';
  }
  function updateAvatarUI() {
    const b = $('profileBtn'); if (b) b.textContent = getAvatar();
  }
  function setAvatar(emoji) {
    localStorage.setItem('ll_avatar', emoji);
    state.profile = Object.assign(state.profile || {}, { avatar: emoji });
    if (state.user) { cacheProfile(state.user.uid, state.profile); saveProfile({ avatar: emoji }); }
    updateAvatarUI();
    if (currentScreen() === 'profile') renderProfile();
  }
  function entryAvatarPicker(current) {
    const wrap = document.createElement('div');
    wrap.className = 'avatar-pick';
    wrap.dataset.value = current || '';
    AVATARS.forEach((emoji) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-opt' + (current === emoji ? ' selected' : '');
      b.textContent = emoji;
      b.onclick = () => {
        wrap.querySelectorAll('.avatar-opt').forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
        wrap.dataset.value = emoji;
      };
      wrap.appendChild(b);
    });
    return wrap;
  }

  // Difficulty AUTO-ADAPTS to the child's progress (total stars) — no manual
  // class/level picker. It's tied to the earned rank (see LEVELS), so games get
  // harder as the child levels up. Seed for future AI/ML personalization.
  function currentLevel() {
    const i = rankIndex(getTotal());
    return i <= 2 ? 1 : i <= 4 ? 2 : 3; // Seedling–Blossom=easy, LittleStar–Rainbow=med, Rocket+=hard
  }

  // "Enter to have fun" sign-in: collects name + school (+ optional parent contact).
  function stepEntry() {
    const body = setWelcome({ emoji: '🎉', title: 'Welcome!', sub: "Let's have some fun!" });
    const note = document.createElement('p');
    note.className = 'welcome-note';
    note.textContent = '👩‍👧 Grown-up: please fill this in';
    const nameIn = entryInput("Child's name", (state.name && state.name !== 'Star') ? state.name : '', 14);
    const schoolIn = entryInput('School name', localStorage.getItem('ll_school') || '', 40);
    const parentIn = entryInput('Parent phone or email (optional)', localStorage.getItem('ll_parent') || '', 60);
    const btn = document.createElement('button');
    btn.className = 'welcome-opt welcome-start';
    btn.textContent = 'Enter to have fun! 🎉';
    const go = () => {
      const child = nameIn.value.trim();
      const school = schoolIn.value.trim();
      const parent = parentIn.value.trim();
      if (!child) return nudge(nameIn);
      if (!school) return nudge(schoolIn);
      state.name = child.slice(0, 14);
      localStorage.setItem('ll_name', state.name);
      localStorage.setItem('ll_school', school);
      localStorage.setItem('ll_parent', parent);
      // Log each new/changed signup once per device (don't spam on every visit).
      const sig = child + '|' + school + '|' + parent;
      if (localStorage.getItem('ll_signup_sig') !== sig) {
        recordSignup({ child: child, school: school, parent: parent, ts: new Date().toISOString(), ref: document.referrer || '', ua: navigator.userAgent });
        localStorage.setItem('ll_signup_sig', sig);
      }
      stepMood();
    };
    btn.onclick = go;
    parentIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    body.appendChild(note);
    body.appendChild(nameIn);
    body.appendChild(schoolIn);
    body.appendChild(parentIn);
    body.appendChild(btn);
    setTimeout(() => { try { nameIn.focus(); } catch (e) {} }, 120);
    speak('Welcome! Please ask a grown up to type your name and school.');
  }

  function stepMood() {
    const body = setWelcome({ emoji: '😊', title: 'Hi, ' + state.name + '!', sub: 'How are you today?' });
    addWelcomeOption(body, '😊 Good', 'green', () => reactThen('🎉', 'Yay! I am so happy! Let us play!', stepSchool));
    addWelcomeOption(body, '🤒 Not feeling well', 'pink', () => reactThen('💖', 'Aww, I hope you feel better soon. Let us play gently.', stepSchool));
    speak('Hi ' + state.name + '! How are you today?');
  }

  function stepSchool() {
    const body = setWelcome({ emoji: '🏫', title: state.name + ', did you go to school today?' });
    addWelcomeOption(body, '👍 Yes', 'blue', () => reactThen('🌟', 'Great! Learning is so much fun!', stepReady));
    addWelcomeOption(body, '👋 No', 'orange', () => reactThen('🤗', 'That is okay! We will learn together today!', stepReady));
    speak(state.name + ', did you go to school today?');
  }

  function stepReady() {
    const body = setWelcome({ emoji: '🎈', title: "Let's go have some fun!" });
    const btn = document.createElement('button');
    btn.className = 'welcome-opt welcome-start';
    btn.textContent = "▶️ Let's Go!";
    btn.onclick = () => { initHome(); show('home'); burst(); speak('Hi ' + state.name + '! Let us learn and play!'); };
    body.appendChild(btn);
    speak("Let's go have some fun!");
  }

  /* ---------- go ---------- */
  setupSoundDock();
  initHome();
  initFirebase();
  startWelcome();
})();
