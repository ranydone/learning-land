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
  };

  /* ---------- voice ---------- */
  let voice = null;
  const hasTTS = 'speechSynthesis' in window;

  // Rank voices so we auto-pick the clearest, most natural one available.
  // Modern "Natural"/"Neural"/online voices (Edge, Chrome, Android, iOS) score highest.
  function scoreVoice(v) {
    const n = (v.name || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase();
    let s = 0;
    if (/natural|neural|online/.test(n)) s += 120;            // Microsoft/Edge neural voices
    if (/google/.test(n)) s += 60;                             // Chrome's Google voices (clear)
    if (/aria|jenny|libby|sonia|natasha|clara|emma|ava|allison|samantha|neerja|asha|swara/.test(n)) s += 55;
    if (/female|woman|girl/.test(n)) s += 25;                  // warmer for a young child
    if (/zira|heera/.test(n)) s += 10;                         // common Windows female (a bit robotic)
    if (/david|mark|guy|ravi|prabhat|george/.test(n)) s -= 20; // default male voices
    if (lang.startsWith('en-in')) s += 22;                     // familiar Indian-English accent
    else if (lang.startsWith('en-gb')) s += 16;
    else if (lang.startsWith('en-us')) s += 18;
    else if (lang.startsWith('en')) s += 8;
    else s -= 40;                                              // non-English: avoid
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
    document.querySelectorAll('.tile').forEach(t => {
      t.onclick = () => (t.dataset.story ? openStory(null)
        : t.dataset.memory ? startMemory()
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
    } // 'none' -> empty

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

  /* ---------- WELCOME / DAILY CHECK-IN ---------- */
  let welcomeTimer = null;

  function setWelcome(opts) {
    $('welcomeEmoji').textContent = opts.emoji;
    $('welcomeTitle').textContent = opts.title;
    $('welcomeSub').textContent = opts.sub || '';
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
    stepName();
  }

  function stepName() {
    const body = setWelcome({ emoji: '🌈', title: 'Hello there!', sub: 'What is your name?' });
    const input = document.createElement('input');
    input.className = 'name-input';
    input.type = 'text';
    input.maxLength = 14;
    input.setAttribute('autocomplete', 'off');
    input.placeholder = 'Type your name';
    input.value = (state.name && state.name !== 'Star') ? state.name : '';
    const btn = document.createElement('button');
    btn.className = 'welcome-opt welcome-start';
    btn.textContent = 'Start ▶️';
    const go = () => {
      const n = input.value.trim();
      if (n) { state.name = n.slice(0, 14); localStorage.setItem('ll_name', state.name); }
      if (!state.name) state.name = 'Star';
      stepMood();
    };
    btn.onclick = go;
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    body.appendChild(input);
    body.appendChild(btn);
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 120);
    speak('Hello! What is your name?');
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
  startWelcome();
})();
