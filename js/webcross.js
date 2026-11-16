/* Web Crossing: an 8x8 chess-style board. The 🐞 starts on the bottom row and must reach
   the 🌸 on the top row, one step at a time (up, down, left, right). Three spiders sit on
   the left edge; each one's web covers its whole row. Stepping toward a web first CUTS it
   (the ladybug stays put); the next step moves into the gap. After the ladybug moves, the
   spiders shift up or down a row and spin a fresh full web there.
   Starter: spiders shift every 2 moves. Growing: every move. Champion: every move, and the
   webs are thick (two cuts each). Spiders never land on the ladybug's row. */
(function () {
  const $ = (id) => document.getElementById(id);
  const P = () => window.POGO;
  const N = 8, TOP = 0, START = N - 1;
  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

  let speakText = '', g = null; // g = current game state
  function say(t) { speakText = t; P().speak(t); }

  function start() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    P().show('wcross');
    window.scrollTo(0, 0);
    const lvl = P().currentLevel();
    const R = window.makeRNG('wcross-' + Date.now() + '-' + Math.random());
    const rows = R.sample([1, 2, 3, 4, 5, 6], 3).sort(function (a, b) { return a - b; });
    g = {
      lvl: lvl, R: R,
      every: lvl === 1 ? 2 : 1,          // spiders shift after this many moves
      thick: lvl === 3 ? 2 : 1,          // cuts needed per web square
      kid: { r: START, c: R.int(2, 5) },
      spiders: rows.map(function (r) { return { r: r }; }),
      web: {},                           // row -> [strength per column]
      moves: 0, cuts: 0, done: false, snip: null, spidersSpoken: false
    };
    g.spiders.forEach(function (s) { g.web[s.r] = fullWeb(); });
    $('wcTitle').textContent = '🕸️ Web Crossing';
    $('wcHint').textContent = 'Get the 🐞 to the 🌸 at the top! A web blocks the way? Cut it ✂️ first, then move.';
    $('wcFeedback').className = 'feedback'; $('wcFeedback').textContent = '';
    $('wcControls').innerHTML = '';
    draw();
    say('Help the ladybug reach the flowers at the top! Move one step at a time. ' +
      'When a spider web is in the way, cut it first, then move.' + (lvl === 3 ? ' These webs are thick. Cut twice!' : ''));
  }

  function fullWeb() { const a = []; for (let c = 0; c < N; c++) a.push(g.thick); return a; }
  function webAt(r, c) { return g.web[r] ? g.web[r][c] : 0; }

  // Try to go one step. Into a web: cut it (stay put). Otherwise: move, then maybe shift spiders.
  function act(dir) {
    if (!g || g.done) return;
    const d = DIRS[dir], r = g.kid.r + d[0], c = g.kid.c + d[1];
    const feed = $('wcFeedback');
    if (r < 0 || r >= N || c < 0 || c >= N) {
      feed.className = 'feedback try'; feed.textContent = 'That is the edge of the board!';
      say('That is the edge of the board. Try another way.');
      return;
    }
    if (webAt(r, c) > 0) {
      g.web[r][c]--; g.cuts++;
      g.snip = r + ',' + c;
      draw();
      feed.className = 'feedback good';
      if (g.web[r][c] > 0) { feed.textContent = '✂️ Snip! Thick web — cut once more!'; say('Snip! It is a thick web. Cut once more!'); }
      else { feed.textContent = '✂️ Snip! The web is cut. Now step in!'; say('Snip! Now step in.'); }
      return;
    }
    g.kid = { r: r, c: c }; g.moves++; g.snip = null;
    if (r === TOP) { win(); return; }
    let moved = false;
    if (g.moves % g.every === 0) moved = shiftSpiders();
    draw();
    const ahead = webAt(g.kid.r - 1, g.kid.c) > 0;
    feed.className = 'feedback' + (moved ? ' try' : ' good');
    feed.textContent = moved ? '🕷️ The spiders moved their webs!' : (ahead ? '🕸️ A web is just above you — cut it!' : '👍 Good step!');
    if (moved && !g.spidersSpoken) { g.spidersSpoken = true; say('Oh! The spiders moved. Look where the webs are now!'); }
    else if (ahead) say('Web ahead! Cut it.');
    else P().speak(dir === 'up' ? 'Up!' : dir === 'down' ? 'Down.' : dir === 'left' ? 'Left.' : 'Right.');
  }

  // Each spider moves one row up or down (never onto the ladybug's row, another spider's row,
  // the start row or the flower row) and spins a fresh full web in its new row.
  function shiftSpiders() {
    let any = false;
    g.R.shuffle(g.spiders.slice()).forEach(function (s) {
      const taken = g.spiders.filter(function (o) { return o !== s; }).map(function (o) { return o.r; });
      const tries = g.R.shuffle([-1, 1]);
      for (let i = 0; i < tries.length; i++) {
        const nr = s.r + tries[i];
        if (nr < 1 || nr > N - 2 || nr === g.kid.r || taken.indexOf(nr) !== -1) continue;
        delete g.web[s.r];
        s.r = nr;
        g.web[nr] = fullWeb();
        any = true;
        break;
      }
    });
    return any;
  }

  function draw() {
    const board = $('wcBoard');
    board.innerHTML = '';
    const spiderRows = g.spiders.map(function (s) { return s.r; });
    for (let r = 0; r < N; r++) {
      const lane = document.createElement('div');
      lane.className = 'wc-lane';
      lane.textContent = spiderRows.indexOf(r) !== -1 ? '🕷️' : '';
      board.appendChild(lane);
      for (let c = 0; c < N; c++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        const w = webAt(r, c);
        const near = !g.done && Math.abs(r - g.kid.r) + Math.abs(c - g.kid.c) === 1;
        cell.className = 'wc-cell ' + ((r + c) % 2 ? 'dark' : 'light') +
          (r === TOP ? ' goal' : '') + (w === 1 ? ' web' : '') + (w >= 2 ? ' web web2' : '') +
          (near ? ' near' : '') + (g.snip === r + ',' + c ? ' snip' : '');
        if (r === g.kid.r && c === g.kid.c) cell.innerHTML = '<span class="wc-kid">🐞</span>';
        else if (r === TOP) cell.innerHTML = '<span class="wc-flower">🌸</span>';
        cell.setAttribute('aria-label', 'Row ' + (N - r) + ', column ' + (c + 1) + (w ? ', web' : ''));
        cell.onclick = (function (rr, cc) { return function () { tapCell(rr, cc); }; })(r, c);
        board.appendChild(cell);
      }
    }
    $('wcTitle').textContent = '🕸️ Web Crossing · ' + g.moves + ' steps';
  }

  // Tapping the square next to the ladybug is the same as pressing that arrow.
  function tapCell(r, c) {
    if (!g || g.done) return;
    const dr = r - g.kid.r, dc = c - g.kid.c;
    if (Math.abs(dr) + Math.abs(dc) !== 1) {
      if (dr || dc) {
        $('wcFeedback').className = 'feedback try'; $('wcFeedback').textContent = 'One step at a time! Tap a glowing square.';
        say('One step at a time. Tap a square next to the ladybug.');
      }
      return;
    }
    act(dr === -1 ? 'up' : dr === 1 ? 'down' : dc === -1 ? 'left' : 'right');
  }

  function win() {
    g.done = true;
    draw();
    $('wcTitle').textContent = '🎉 Home in ' + g.moves + ' steps!';
    $('wcFeedback').className = 'feedback good';
    $('wcFeedback').textContent = '🌸 The ladybug reached the flowers! ' + g.moves + ' steps, ' + g.cuts + ' snips.';
    say('Hooray! The ladybug reached the flowers in ' + g.moves + ' steps!');
    P().addStars(2); P().burst();
    setTimeout(P().burst, 400);
    const ctrl = $('wcControls');
    ctrl.innerHTML = '';
    const b = document.createElement('button');
    b.className = 'big-btn play-again seq-next';
    b.textContent = 'Play Again ▶️';
    b.onclick = start;
    ctrl.appendChild(b);
  }

  document.querySelectorAll('#wcPad .wc-arrow').forEach(function (b) {
    b.onclick = function () { act(b.dataset.dir); };
  });
  document.addEventListener('keydown', function (e) {
    if (!$('wcross').classList.contains('active')) return;
    const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
    if (k) { e.preventDefault(); act(k); }
  });
  $('wcHome').onclick = function () { P().goHome(); };
  $('wcSpeak').onclick = function () { if (speakText) P().speak(speakText); };

  window.WEBCROSS = { start: start, _state: function () { return g; }, _act: act };
})();
