/* Spell It: an A-Z board of picture words. Pick a letter, see "A is for Apple 🍎",
   then put the word's letters into the boxes in order (tap or drag the tiles).
   Every level names (and says) the next letter: "First, find A", "Now find R".
   Starter: faint letters in the boxes and the right tile points. Growing: extra letters.
   Champion: longer words, the written word is hidden, extra letters, and a 💡 hint. */
(function () {
  const $ = (id) => document.getElementById(id);
  const P = () => window.POGO;

  const WORDS = {
    A: [['ANT', '🐜'], ['APPLE', '🍎'], ['ARROW', '🏹']],
    B: [['BEE', '🐝'], ['BUS', '🚌'], ['BEAR', '🐻'], ['BALL', '🏀'], ['BANANA', '🍌']],
    C: [['CAT', '🐱'], ['COW', '🐮'], ['CAR', '🚗'], ['CAKE', '🎂'], ['CARROT', '🥕']],
    D: [['DOG', '🐶'], ['DUCK', '🦆'], ['DRUM', '🥁'], ['DOLPHIN', '🐬']],
    E: [['EGG', '🥚'], ['EYE', '👁️'], ['EAGLE', '🦅'], ['ELEPHANT', '🐘']],
    F: [['FOX', '🦊'], ['FISH', '🐟'], ['FROG', '🐸'], ['FLOWER', '🌸']],
    G: [['GOAT', '🐐'], ['GIFT', '🎁'], ['GRAPES', '🍇'], ['GUITAR', '🎸']],
    H: [['HAT', '🎩'], ['HEN', '🐔'], ['HORSE', '🐴'], ['HOUSE', '🏠']],
    I: [['ICE', '🧊'], ['INSECT', '🐛'], ['ISLAND', '🏝️']],
    J: [['JET', '✈️'], ['JUICE', '🧃'], ['JACKET', '🧥']],
    K: [['KEY', '🔑'], ['KITE', '🪁'], ['KING', '🤴'], ['KIWI', '🥝'], ['KOALA', '🐨']],
    L: [['LEAF', '🍃'], ['LION', '🦁'], ['LAMB', '🐑'], ['LEMON', '🍋']],
    M: [['MAP', '🗺️'], ['MOON', '🌙'], ['MILK', '🥛'], ['MOUSE', '🐭'], ['MONKEY', '🐒']],
    N: [['NUT', '🥜'], ['NOSE', '👃'], ['NEST', '🪺'], ['NOODLES', '🍜']],
    O: [['OWL', '🦉'], ['ONION', '🧅'], ['ORANGE', '🍊'], ['OCTOPUS', '🐙']],
    P: [['PIG', '🐷'], ['PEN', '🖊️'], ['PEAR', '🍐'], ['PANDA', '🐼'], ['PIZZA', '🍕']],
    Q: [['QUEEN', '👸']],
    R: [['RAT', '🐀'], ['RING', '💍'], ['ROSE', '🌹'], ['ROBOT', '🤖'], ['RABBIT', '🐰'], ['ROCKET', '🚀']],
    S: [['SUN', '☀️'], ['SOCK', '🧦'], ['STAR', '⭐'], ['SNAKE', '🐍'], ['SPIDER', '🕷️']],
    T: [['TEA', '🍵'], ['TENT', '⛺'], ['TREE', '🌳'], ['TIGER', '🐯'], ['TRAIN', '🚂']],
    U: [['UP', '⬆️'], ['UNICORN', '🦄'], ['UMBRELLA', '☂️']],
    V: [['VAN', '🚐'], ['VASE', '🏺'], ['VIOLIN', '🎻'], ['VOLCANO', '🌋']],
    W: [['WEB', '🕸️'], ['WOLF', '🐺'], ['WAVE', '🌊'], ['WATCH', '⌚'], ['WHALE', '🐳']],
    X: [['BOX', '📦'], ['FOX', '🦊']], // few words start with X, so X is found inside a word
    Y: [['YARN', '🧶'], ['YOYO', '🪀'], ['YELLOW', '🟡']],
    Z: [['ZERO', '0️⃣'], ['ZEBRA', '🦓']]
  };
  const LETTERS = Object.keys(WORDS);
  LETTERS.forEach(function (L) { WORDS[L].sort(function (a, b) { return a[0].length - b[0].length; }); });

  const DONE_KEY = 'll_spell_done';
  function loadDone() { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveDone(d) { try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function nice(w) { return w.charAt(0) + w.slice(1).toLowerCase(); }
  function spelled(w) { return w.split('').join(', '); }

  let speakText = '';
  // Speak a moment later: some browsers drop speech that starts right after a cancel.
  let sayTimer = null;
  function say(t) {
    speakText = t;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { P().speak(t); }, 120);
  }

  /* ---------- A-Z board ---------- */
  function open() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    const done = loadDone(), board = $('spBoard');
    board.innerHTML = '';
    LETTERS.forEach(function (L) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sp-letter' + (done[L] ? ' done' : '');
      b.innerHTML = '<span class="sp-big">' + L + '</span><span class="sp-emo">' + WORDS[L][0][1] + '</span>' + (done[L] ? '<span class="sp-star">⭐</span>' : '');
      b.setAttribute('aria-label', 'Letter ' + L);
      b.onclick = function () { play(L); };
      board.appendChild(b);
    });
    const count = LETTERS.filter(function (L) { return done[L]; }).length;
    $('spHubNote').textContent = count ? '⭐ ' + count + ' of 26 letters spelled! Tap a letter to play.' : 'Tap a letter to spell its word!';
    P().show('spellHub');
  }

  /* ---------- spell one word ---------- */
  function play(L) {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    P().show('spell');
    window.scrollTo(0, 0);
    const lvl = P().currentLevel();
    const R = window.makeRNG('spell-' + L + '-' + Date.now() + '-' + Math.random());
    const list = WORDS[L];
    let pool = lvl === 1 ? list.filter(function (w) { return w[0].length <= 5; })
      : lvl === 2 ? list.filter(function (w) { return w[0].length <= 6; })
        : list.filter(function (w) { return w[0].length >= 5; });
    if (!pool.length) pool = lvl === 3 ? list : [list[0]];
    const pick = R.pick(pool), word = pick[0], inside = word.charAt(0) !== L;
    const head = inside ? L + ' is in ' + nice(word) : L + ' is for ' + nice(word);
    let next = 0, finished = false, misses = 0;

    $('spTitle').textContent = '✏️ ' + (lvl < 3 ? head : 'Letter ' + L); // top level: do not show the word
    $('spPic').textContent = pick[1];
    $('spWord').textContent = lvl < 3 ? nice(word) : '❓';
    const feed = $('spFeedback'), ctrl = $('spControls'), boxesEl = $('spBoxes'), tilesEl = $('spTiles');
    feed.className = 'feedback'; feed.textContent = '';
    ctrl.innerHTML = '';

    // One box per letter (faint letter inside at Starter level).
    boxesEl.innerHTML = '';
    boxesEl.style.setProperty('--n', word.length);
    const boxes = word.split('').map(function (ch) {
      const b = document.createElement('div');
      b.className = 'sp-box';
      b.innerHTML = lvl === 1 ? '<span class="sp-ghost">' + ch + '</span>' : '';
      boxesEl.appendChild(b);
      return b;
    });

    // Letter tiles: the word's letters plus a few that do not belong (Growing and up).
    const extras = lvl === 1 ? 0 : lvl === 2 ? 2 : 3;
    const others = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(function (c) { return word.indexOf(c) === -1; });
    const letters = R.shuffle(word.split('').concat(R.sample(others, extras)));
    tilesEl.innerHTML = '';
    const tiles = letters.map(function (ch) {
      const t = document.createElement('button');
      t.type = 'button';
      t.className = 'sp-tile';
      t.textContent = ch;
      t.dataset.ch = ch;
      grabbable(t);
      tilesEl.appendChild(t);
      return t;
    });

    // Always show (and say) which letter to find next. Starter also points at the tile;
    // higher levels point only after a wrong try.
    function mark() {
      boxes.forEach(function (b, i) { b.classList.toggle('next', i === next && !finished); });
      tiles.forEach(function (x) { x.classList.remove('point'); });
      const nextEl = $('spNext');
      if (finished) { nextEl.innerHTML = ''; return; }
      const need = word[next];
      nextEl.innerHTML = (next === 0 ? 'First, find 👉 <b>' : need === word[next - 1] ? 'Another 👉 <b>' : 'Now find 👉 <b>') + need + '</b>';
      if (lvl === 1 || misses >= 1) {
        const t = tiles.filter(function (x) { return !x.disabled && x.dataset.ch === need; })[0];
        if (t) t.classList.add('point');
      }
    }

    function tryTile(t) {
      if (finished || t.disabled) return;
      const ch = t.dataset.ch;
      if (ch === word[next]) {
        const b = boxes[next];
        b.innerHTML = '<span class="sp-in">' + ch + '</span>';
        b.classList.add('filled');
        t.disabled = true; t.classList.add('used');
        next++; misses = 0;
        if (next === word.length) { complete(); return; }
        mark();
        feed.className = 'feedback good';
        feed.textContent = '✓ ' + word.slice(0, next).split('').join(' - ');
        say(ch + '! Now find ' + (word[next] === ch ? 'another ' : '') + word[next] + '.');
      } else {
        t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
        misses++;
        mark();
        feed.className = 'feedback try';
        feed.textContent = 'That is ' + ch + '. We need ' + word[next] + '!';
        say('That is ' + ch + '. We need ' + word[next] + '.');
      }
    }

    // Tap a tile, or drag it onto the boxes. Either way it tries the next box.
    function grabbable(t) {
      let down = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0, dragged = false;
      t.addEventListener('pointerdown', function (e) {
        if (t.disabled || finished) return;
        down = true; moved = false; sx = e.clientX; sy = e.clientY;
        const r = t.getBoundingClientRect(); ox = e.clientX - r.left; oy = e.clientY - r.top;
        try { t.setPointerCapture(e.pointerId); } catch (_) {}
      });
      t.addEventListener('pointermove', function (e) {
        if (!down) return;
        if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
        if (!moved) { moved = true; t.classList.add('drag'); }
        t.style.left = (e.clientX - ox) + 'px'; t.style.top = (e.clientY - oy) + 'px';
      });
      function end(e) {
        if (!down) return; down = false;
        if (!moved) return; // a plain tap is handled by click
        dragged = true;
        t.classList.remove('drag'); t.style.left = ''; t.style.top = '';
        const br = boxesEl.getBoundingClientRect();
        if (e.type === 'pointerup' && e.clientX >= br.left - 20 && e.clientX <= br.right + 20 && e.clientY >= br.top - 30 && e.clientY <= br.bottom + 30) tryTile(t);
      }
      t.addEventListener('pointerup', end);
      t.addEventListener('pointercancel', end);
      t.addEventListener('click', function () {
        if (dragged) { dragged = false; return; }
        tryTile(t);
      });
    }

    function complete() {
      finished = true;
      mark();
      boxes.forEach(function (b) { b.classList.add('win'); });
      $('spWord').textContent = nice(word);
      $('spTitle').textContent = '✏️ ' + head;
      feed.className = 'feedback good';
      feed.textContent = '🎉 ' + word.split('').join('-') + ' spells ' + nice(word) + '!';
      say(spelled(word) + '. ' + nice(word) + '! Well done!');
      const done = loadDone(); done[L] = true; saveDone(done);
      P().addStars(1); P().burst();
      ctrl.innerHTML = '';
      const i = LETTERS.indexOf(L);
      const nextBtn = document.createElement('button');
      nextBtn.className = 'big-btn play-again seq-next';
      if (i < LETTERS.length - 1) {
        nextBtn.textContent = 'Next: ' + LETTERS[i + 1] + ' ▶️';
        nextBtn.onclick = function () { play(LETTERS[i + 1]); };
      } else {
        nextBtn.textContent = '🏆 A to Z done!';
        nextBtn.onclick = open;
        for (let k = 1; k < 4; k++) setTimeout(P().burst, k * 300);
      }
      ctrl.appendChild(nextBtn);
      if (list.length > 1) {
        const again = document.createElement('button');
        again.className = 'big-btn sp-again';
        again.textContent = '🔁 Another ' + L + ' word';
        again.onclick = function () { play(L); };
        ctrl.appendChild(again);
      }
    }

    if (lvl === 3) { // hint: make the right tile glow
      const hintBtn = document.createElement('button');
      hintBtn.className = 'round-btn sp-hint';
      hintBtn.title = 'Hint';
      hintBtn.textContent = '💡';
      hintBtn.onclick = function () {
        if (finished) return;
        const t = tiles.filter(function (x) { return !x.disabled && x.dataset.ch === word[next]; })[0];
        if (t) { t.classList.remove('glow'); void t.offsetWidth; t.classList.add('glow'); }
        say('Look for the glowing letter.');
      };
      ctrl.appendChild(hintBtn);
    }

    mark();
    if (lvl === 1) say(head + '! Let us spell ' + nice(word) + ': ' + spelled(word) + '. Find ' + word[0] + ' first!');
    else if (lvl === 2) say(head + '! Spell ' + nice(word) + '. Find ' + word[0] + ' first!');
    else say('Spell the word ' + nice(word) + '! Find ' + word[0] + ' first!');
  }

  $('spHubHome').onclick = function () { P().goHome(); };
  $('spPlayAll').onclick = function () { play('A'); };
  $('spBack').onclick = open;
  $('spSpeak').onclick = function () { if (speakText) P().speak(speakText); };

  window.SPELL = { open: open, play: play, WORDS: WORDS };
})();
