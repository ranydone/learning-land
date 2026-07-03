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

  /* ---------- score (per day) ---------- */
  function todayStarsKey() { return 'll_stars_' + todayKey(); }
  function getTodayStars() { return parseInt(localStorage.getItem(todayStarsKey()) || '0', 10); }
  function addStars(n) {
    localStorage.setItem(todayStarsKey(), String(getTodayStars() + n));
    $('todayStars').textContent = getTodayStars();
    // also bump lifetime total locally + in the cloud (if signed in)
    const total = parseInt(localStorage.getItem('ll_points_total') || '0', 10) + n;
    localStorage.setItem('ll_points_total', String(total));
    if (state.profile) state.profile.points = total;
    cloudAddPoints(n);
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
    document.querySelectorAll('.tile').forEach(t => {
      t.onclick = () => (t.dataset.story ? openStory(null)
        : t.dataset.memory ? startMemory()
          : t.dataset.game === 'calendar' ? startCalendar()
            : t.dataset.game === 'clock' ? startClock()
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
    state.queue = GENERATORS.buildSession(game, R, SESSION_LEN);
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
    speak(stars === 3 ? 'Perfect! Amazing work ' + state.name : 'Well done ' + state.name);

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
    mem.total = 6;
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
    speak('Well done ' + state.name + '! You found all the pairs!');
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

    const slotsEl = $('seqSlots'); slotsEl.innerHTML = '';
    const slotEls = [];
    for (let i = 0; i < N; i++) {
      const s = document.createElement('div'); s.className = 'seq-slot';
      s.innerHTML = '<span class="seq-num">' + (i + 1) + '</span>';
      slotsEl.appendChild(s); slotEls.push(s);
    }
    const trayEl = $('seqTray'); trayEl.innerHTML = '';
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

  $('seqHome').onclick = function () { if ('speechSynthesis' in window) speechSynthesis.cancel(); initHome(); show('home'); };
  $('seqSpeak').onclick = function () { if (seqSpeakText) speak(seqSpeakText); };

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
    if (prof.childName) { state.name = prof.childName; localStorage.setItem('ll_name', state.name); }
    if (prof.school) localStorage.setItem('ll_school', prof.school);
    if (prof.class) localStorage.setItem('ll_class', prof.class);
    if (prof.avatar) localStorage.setItem('ll_avatar', prof.avatar);
    if (typeof prof.points === 'number') localStorage.setItem('ll_points_total', String(prof.points));
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
    const classSel = entryClassSelect(localStorage.getItem('ll_class'));
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
      const cls = classSel.value;
      const avatar = avatarPick.dataset.value || '🧒';
      if (!child) return nudge(nameIn);
      if (!school) return nudge(schoolIn);
      state.name = child.slice(0, 14);
      localStorage.setItem('ll_name', state.name);
      localStorage.setItem('ll_school', school);
      localStorage.setItem('ll_class', cls);
      localStorage.setItem('ll_avatar', avatar);
      state.profile = Object.assign(state.profile || {}, { childName: state.name, school: school, class: cls, avatar: avatar });
      if (state.user) cacheProfile(state.user.uid, state.profile); // remember on this device
      saveProfile({ childName: state.name, school: school, class: cls, avatar: avatar }); // fire-and-forget (offline-safe)
      updateAvatarUI();
      stepMood(); // proceed immediately; never wait on the network
    };
    body.appendChild(nameIn);
    body.appendChild(schoolIn);
    body.appendChild(classSel);
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

  function levelBadge(total) {
    if (total >= 200) return '👑';
    if (total >= 100) return '🏆';
    if (total >= 50) return '🌟';
    if (total >= 20) return '🌸';
    return '🌱';
  }

  function renderProfile() {
    const signedIn = !!(fb.enabled && state.user);
    const name = (state.name && state.name !== 'Star') ? state.name : (localStorage.getItem('ll_name') || 'Little Star');
    $('profileName').textContent = name;
    const school = (state.profile && state.profile.school) || localStorage.getItem('ll_school') || '';
    const cls = (state.profile && state.profile.class) || localStorage.getItem('ll_class') || '';
    $('profileSchool').textContent = (school ? '🏫 ' + school : '') + (cls ? (school ? '  ·  ' : '') + '🎓 ' + cls : '');
    $('profileEmail').textContent = signedIn ? (state.user.email || '') : '';
    // Show the child's chosen boy/girl avatar (tap to switch).
    $('profilePhoto').hidden = true;
    $('profileAvatar').hidden = false;
    $('profileAvatar').textContent = getAvatar();
    $('profileAvatar').title = 'Tap to change character';
    const total = parseInt(localStorage.getItem('ll_points_total') || '0', 10);
    $('statTotal').textContent = total;
    $('statToday').textContent = getTodayStars();
    $('statBadge').textContent = levelBadge(total);
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

  // Class / grade dropdown. Only PP1 for now; add more options here as content grows.
  const CLASS_OPTIONS = [{ v: 'PP1', t: 'PP1 (Pre-Primary 1)' }];
  function entryClassSelect(current) {
    const sel = document.createElement('select');
    sel.className = 'name-input entry-field entry-select';
    sel.setAttribute('aria-label', 'Class');
    const cur = current || CLASS_OPTIONS[0].v;
    sel.innerHTML = CLASS_OPTIONS
      .map((o) => '<option value="' + o.v + '"' + (o.v === cur ? ' selected' : '') + '>' + o.t + '</option>')
      .join('');
    return sel;
  }

  // "Enter to have fun" sign-in: collects name + school (+ optional parent contact).
  function stepEntry() {
    const body = setWelcome({ emoji: '🎉', title: 'Welcome!', sub: "Let's have some fun!" });
    const note = document.createElement('p');
    note.className = 'welcome-note';
    note.textContent = '👩‍👧 Grown-up: please fill this in';
    const nameIn = entryInput("Child's name", (state.name && state.name !== 'Star') ? state.name : '', 14);
    const schoolIn = entryInput('School name', localStorage.getItem('ll_school') || '', 40);
    const classSel = entryClassSelect(localStorage.getItem('ll_class'));
    const parentIn = entryInput('Parent phone or email (optional)', localStorage.getItem('ll_parent') || '', 60);
    const btn = document.createElement('button');
    btn.className = 'welcome-opt welcome-start';
    btn.textContent = 'Enter to have fun! 🎉';
    const go = () => {
      const child = nameIn.value.trim();
      const school = schoolIn.value.trim();
      const cls = classSel.value;
      const parent = parentIn.value.trim();
      if (!child) return nudge(nameIn);
      if (!school) return nudge(schoolIn);
      state.name = child.slice(0, 14);
      localStorage.setItem('ll_name', state.name);
      localStorage.setItem('ll_school', school);
      localStorage.setItem('ll_class', cls);
      localStorage.setItem('ll_parent', parent);
      // Log each new/changed signup once per device (don't spam on every visit).
      const sig = child + '|' + school + '|' + cls + '|' + parent;
      if (localStorage.getItem('ll_signup_sig') !== sig) {
        recordSignup({ child: child, school: school, class: cls, parent: parent, ts: new Date().toISOString(), ref: document.referrer || '', ua: navigator.userAgent });
        localStorage.setItem('ll_signup_sig', sig);
      }
      stepMood();
    };
    btn.onclick = go;
    parentIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    body.appendChild(note);
    body.appendChild(nameIn);
    body.appendChild(schoolIn);
    body.appendChild(classSel);
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
