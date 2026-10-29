/* Puzzles: 10 picture & shape puzzles that share one picture library and drag engine.
   Pictures are drawn in code (SVG + emoji) on a 300x300 canvas, so any picture can be
   cut into any grid: 3x3 (9) for Starter, 4x3 (12) for Growing, 4x4 (16) for Champion. */
(function () {
  const $ = (id) => document.getElementById(id);
  const P = () => window.POGO;

  /* ---------- picture library ---------- */
  function txt(e, x, y, s) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + s + '" text-anchor="middle" dominant-baseline="central">' + e + '</text>';
  }
  function scene(id, name, top, bottom, extra, items) {
    return {
      id: id, name: name,
      svg: '<defs><linearGradient id="pzg-' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + top + '"/>' +
        '<stop offset="1" stop-color="' + bottom + '"/></linearGradient></defs><rect width="300" height="300" fill="url(#pzg-' + id + ')"/>' +
        extra + items.map(function (i) { return txt(i[0], i[1], i[2], i[3]); }).join('')
    };
  }
  function dots(list, color) {
    return list.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (p[2] || 2) + '" fill="' + color + '" opacity=".85"/>'; }).join('');
  }
  function city() {
    const blds = [[8, 120, 52, '#5e60ce'], [64, 88, 46, '#4ea8de'], [114, 140, 54, '#9d4edd'], [172, 100, 50, '#48bfe3'], [226, 128, 66, '#7400b8']];
    let s = '';
    blds.forEach(function (b) {
      s += '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + (250 - b[1]) + '" rx="4" fill="' + b[3] + '"/>';
      for (let y = b[1] + 10; y < 236; y += 22) for (let x = b[0] + 8; x < b[0] + b[2] - 10; x += 16) {
        s += '<rect x="' + x + '" y="' + y + '" width="8" height="10" fill="#ffe66d" opacity="' + ((x + y) % 3 ? '.9' : '.35') + '"/>';
      }
    });
    return s + '<rect y="250" width="300" height="50" fill="#495057"/><rect y="272" width="300" height="4" fill="#f8f9fa" opacity=".6"/>';
  }
  function rainbow() {
    const cols = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
    return cols.map(function (c, i) {
      const r = 132 - i * 12;
      return '<path d="M' + (150 - r) + ' 250 A' + r + ' ' + r + ' 0 0 1 ' + (150 + r) + ' 250" stroke="' + c + '" stroke-width="12" fill="none"/>';
    }).join('') + '<rect y="248" width="300" height="52" fill="#80ed99"/>';
  }
  const PICS = [
    scene('farm', 'farm', '#8ecae6', '#e0f4ff', '<path d="M0 190 Q150 160 300 190 V300 H0Z" fill="#8ac926"/>',
      [['☀️', 255, 45, 52], ['☁️', 70, 45, 48], ['☁️', 165, 72, 34], ['🌳', 45, 160, 78], ['🏠', 150, 158, 70], ['🐄', 80, 245, 58], ['🐖', 185, 255, 46], ['🐔', 262, 220, 40], ['🌻', 22, 272, 34], ['🌾', 270, 275, 36]]),
    scene('ocean', 'ocean', '#48cae4', '#023e8a', '<path d="M0 262 Q150 245 300 262 V300 H0Z" fill="#f4d58d"/>' + dots([[30, 120, 4], [36, 100, 3], [270, 200, 4], [264, 182, 3], [120, 40, 3]], '#caf0f8'),
      [['🐳', 85, 70, 70], ['🐠', 222, 58, 44], ['🐙', 238, 150, 60], ['🐟', 58, 165, 44], ['🐢', 150, 128, 52], ['🦀', 80, 274, 40], ['🐚', 200, 280, 30], ['🌿', 272, 262, 44], ['🐡', 150, 215, 38]]),
    scene('space', 'space', '#10002b', '#3c096c', dots([[20, 30], [90, 20], [200, 110], [280, 20], [30, 140], [110, 120, 1.5], [270, 120], [190, 210, 1.5], [20, 280], [290, 290], [100, 200], [230, 30, 1.5]], '#fff'),
      [['🪐', 70, 70, 70], ['🌙', 240, 50, 52], ['🚀', 160, 160, 72], ['👽', 60, 230, 50], ['🛸', 250, 160, 50], ['🌍', 240, 255, 56], ['⭐', 145, 40, 30], ['☄️', 125, 265, 40]]),
    scene('rainbow', 'rainbow', '#a2d2ff', '#ffe5ec', rainbow(),
      [['☁️', 38, 236, 72], ['☁️', 262, 236, 72], ['🦄', 150, 210, 58], ['☀️', 40, 45, 44], ['🦋', 252, 62, 36], ['🌷', 110, 280, 30], ['🌼', 195, 282, 30]]),
    scene('garden', 'garden', '#bde0fe', '#e2fdf0', '<rect y="200" width="300" height="100" fill="#95d5b2"/>' +
      [20, 60, 100, 140, 180, 220, 260].map(function (x) { return '<rect x="' + x + '" y="170" width="14" height="42" rx="6" fill="#f6bd60"/>'; }).join(''),
      [['🌷', 40, 240, 48], ['🌸', 112, 258, 44], ['🌼', 262, 244, 44], ['🦋', 80, 90, 48], ['🐝', 222, 80, 40], ['🐞', 172, 272, 34], ['🍄', 215, 212, 46], ['☀️', 150, 40, 50], ['🐌', 60, 290, 28]]),
    scene('dino', 'dinosaur land', '#ffd6a5', '#fdffb6', '<path d="M0 220 Q150 200 300 225 V300 H0Z" fill="#a3b18a"/>',
      [['🌋', 222, 118, 110], ['🦕', 92, 188, 92], ['🦖', 230, 240, 66], ['🌴', 28, 150, 80], ['🥚', 130, 272, 36], ['🌿', 278, 285, 38], ['☁️', 80, 40, 44]]),
    scene('city', 'city at night', '#03045e', '#7b2cbf', city() + dots([[30, 30], [120, 50], [180, 20], [290, 80, 1.5]], '#fff'),
      [['🌙', 250, 42, 50], ['🚗', 70, 268, 44], ['🚌', 205, 266, 52], ['🚦', 150, 228, 34]]),
    scene('snow', 'snowy day', '#caf0f8', '#ffffff', '<path d="M0 205 Q150 185 300 210 V300 H0Z" fill="#edf6f9" stroke="#bde0fe" stroke-width="3"/>',
      [['🏔️', 150, 92, 100], ['⛄', 78, 210, 80], ['🌲', 222, 175, 80], ['🌲', 274, 205, 54], ['🐧', 170, 258, 48], ['❄️', 40, 50, 30], ['❄️', 262, 50, 26], ['❄️', 30, 280, 24], ['🛷', 255, 280, 36]]),
    scene('party', 'birthday party', '#ffc8dd', '#cdb4db', '<rect y="230" width="300" height="70" fill="#e9c46a"/><rect x="60" y="226" width="180" height="10" rx="4" fill="#f4a261"/>',
      [['🎂', 150, 195, 80], ['🎈', 48, 70, 60], ['🎈', 252, 82, 56], ['🎁', 58, 262, 54], ['🧸', 244, 254, 58], ['🎉', 150, 62, 50], ['🍭', 150, 275, 34]]),
    scene('jungle', 'jungle', '#d8f3dc', '#52b788', '<path d="M0 0 Q40 40 0 80Z M300 0 Q260 50 300 100Z" fill="#2d6a4f"/>',
      [['🐒', 70, 90, 60], ['🦁', 205, 222, 80], ['🐘', 80, 230, 76], ['🦜', 245, 68, 50], ['🌴', 152, 122, 84], ['🐍', 150, 282, 34], ['🍌', 272, 150, 34]]),
    scene('beach', 'beach', '#90e0ef', '#caf0f8', '<rect y="150" width="300" height="55" fill="#0096c7"/><path d="M0 200 Q150 190 300 205 V300 H0Z" fill="#ffe8a3"/>',
      [['☀️', 250, 50, 56], ['⛵', 80, 150, 56], ['⛱️', 200, 222, 70], ['🦀', 70, 268, 40], ['🐚', 150, 280, 30], ['🏐', 262, 275, 34], ['🌴', 28, 198, 70], ['🐬', 165, 168, 40], ['☁️', 120, 50, 40]]),
    scene('night', 'night forest', '#1b263b', '#415a77', '<rect y="222" width="300" height="78" fill="#344e41"/>' + dots([[100, 30], [200, 100, 1.5], [280, 30], [20, 110]], '#fff'),
      [['🌙', 60, 50, 52], ['⭐', 150, 40, 22], ['⭐', 240, 72, 22], ['🌲', 40, 188, 80], ['🌲', 260, 178, 90], ['🦉', 150, 140, 60], ['🦊', 110, 255, 56], ['🍄', 220, 266, 40]])
  ];

  /* ---------- cutting a picture into pieces ---------- */
  const f = function (n) { return Math.round(n * 10) / 10; };
  function geo(cols, rows) { return { cols: cols, rows: rows, cw: 300 / cols, ch: 300 / rows }; }
  function gridFor(lvl) { return lvl === 1 ? [3, 3] : lvl === 2 ? [4, 3] : [4, 4]; }
  // Random knob directions for the inside edges: H = between rows, V = between columns.
  function tabs(R, g) {
    const H = [], V = [];
    for (let r = 0; r < g.rows; r++) {
      H.push([]); V.push([]);
      for (let c = 0; c < g.cols; c++) {
        H[r].push(r < g.rows - 1 ? (R.bool() ? 1 : -1) : 0);
        V[r].push(c < g.cols - 1 ? (R.bool() ? 1 : -1) : 0);
      }
    }
    return { H: H, V: V };
  }
  // Outward knob signs for one piece: [top, right, bottom, left]; 0 = flat edge.
  function edgesOf(T, r, c) {
    return [r > 0 ? -T.H[r - 1][c] : 0, T.V[r][c], T.H[r][c], c > 0 ? -T.V[r][c - 1] : 0];
  }
  function edgePath(ax, ay, bx, by, s, K) {
    if (!s) return ' L' + f(bx) + ' ' + f(by);
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len;
    function p(t, o) { return f(ax + dx * t + nx * o * K * s) + ' ' + f(ay + dy * t + ny * o * K * s); }
    return ' L' + p(0.36, 0) + ' C' + p(0.30, 0.20) + ' ' + p(0.38, 0.34) + ' ' + p(0.5, 0.34) +
      ' C' + p(0.62, 0.34) + ' ' + p(0.70, 0.20) + ' ' + p(0.64, 0) + ' L' + f(bx) + ' ' + f(by);
  }
  function piecePath(x, y, cw, ch, e, K) {
    return 'M' + f(x) + ' ' + f(y) + edgePath(x, y, x + cw, y, e[0], K) + edgePath(x + cw, y, x + cw, y + ch, e[1], K) +
      edgePath(x + cw, y + ch, x, y + ch, e[2], K) + edgePath(x, y + ch, x, y, e[3], K) + 'Z';
  }
  let uid = 0;
  // One piece of a picture. `edges` null = square piece. (sx, sy) shows content from another
  // cell inside this piece's shape (used for the "wrong picture" choices in Missing Piece).
  function pieceSVG(pic, x, y, cw, ch, edges, K, sx, sy) {
    const shift = sx === undefined ? '' : ' transform="translate(' + f(x - sx) + ' ' + f(y - sy) + ')"';
    if (!edges) {
      return '<svg viewBox="' + f(x) + ' ' + f(y) + ' ' + f(cw) + ' ' + f(ch) + '" preserveAspectRatio="none" aria-hidden="true"><g' + shift + '>' + pic.svg + '</g></svg>';
    }
    const m = 0.36 * K, id = 'pzc' + (++uid), d = piecePath(x, y, cw, ch, edges, K);
    return '<svg viewBox="' + f(x - m) + ' ' + f(y - m) + ' ' + f(cw + 2 * m) + ' ' + f(ch + 2 * m) + '" aria-hidden="true">' +
      '<defs><clipPath id="' + id + '"><path d="' + d + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + id + ')"><g' + shift + '>' + pic.svg + '</g></g>' +
      '<path d="' + d + '" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/></svg>';
  }
  function fullSVG(pic) { return '<svg viewBox="0 0 300 300" aria-hidden="true">' + pic.svg + '</svg>'; }
  // Position an element on a board using picture units (0-300).
  function put(el, x, y, w, h) {
    el.style.left = (x / 3) + '%'; el.style.top = (y / 3) + '%';
    el.style.width = (w / 3) + '%'; el.style.height = (h / 3) + '%';
  }

  /* ---------- shared screen helpers ---------- */
  let speakText = '', timers = [], lastPic = -1, current = null;
  const stage = $('pzStage'), tray = $('pzTray'), feed = $('pzFeedback'), ctrl = $('pzControls'),
    hint = $('pzHint'), title = $('pzTitle'), screen = $('puzzle');

  function say(t) { speakText = t; P().speak(t); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function rng(tag) { return window.makeRNG('pz-' + tag + '-' + Date.now() + '-' + Math.random()); }
  function pickPic(R) {
    let i = R.int(0, PICS.length - 1);
    if (i === lastPic) i = (i + 1) % PICS.length;
    lastPic = i;
    return PICS[i];
  }
  function good(msg) { feed.className = 'feedback good'; feed.textContent = msg; }
  function oops(msg, speech) { feed.className = 'feedback try'; feed.textContent = msg; say(speech || msg.replace(/[^\w\s.,!?'-]/g, '')); }
  function sizeVar() {
    const b = stage.querySelector('.pz-board');
    if (b) screen.style.setProperty('--pzB', b.clientWidth + 'px');
  }
  window.addEventListener('resize', function () { if (screen.classList.contains('active')) sizeVar(); });
  function makeBoard(extra) {
    const b = document.createElement('div');
    b.className = 'pz-board' + (extra ? ' ' + extra : '');
    stage.appendChild(b);
    return b;
  }
  function thumb(pic) {
    const t = document.createElement('div');
    t.className = 'pz-thumb';
    t.innerHTML = '<span>Make this:</span>' + fullSVG(pic);
    return t;
  }
  function button(label, fn) {
    const b = document.createElement('button');
    b.className = 'big-btn play-again seq-next';
    b.textContent = label;
    b.onclick = fn;
    ctrl.appendChild(b);
  }
  // A finished picture puzzle: celebrate, then offer the next picture.
  function solvedPicture(board, pic, stars) {
    board.classList.add('pz-solved');
    good('🎉 You made the ' + pic.name + '!');
    say('Hooray! You made the ' + pic.name + ' picture!');
    P().addStars(stars); P().burst();
    later(function () { P().burst(); }, 500);
    button('Next Picture ▶️', function () { start(current); });
  }
  // A round-based game: count the round, then show Play Again at the end.
  function finishRounds(msg, speech) {
    title.textContent = '🎉 Great job!';
    hint.textContent = '⭐ ' + msg + ' ⭐';
    stage.innerHTML = ''; tray.innerHTML = '';
    good('You finished the whole puzzle set!');
    say(speech);
    for (let k = 0; k < 3; k++) later(P().burst, k * 300);
    button('Play Again ▶️', function () { start(current); });
  }

  // Pointer drag that also reports taps. onDrop gets the dragged element's centre.
  function draggable(el, opts) {
    let down = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    el.addEventListener('pointerdown', function (e) {
      if (el.classList.contains('pz-locked')) return;
      down = true; moved = false; sx = e.clientX; sy = e.clientY;
      const r = el.getBoundingClientRect(); ox = (e.clientX - r.left) / r.width; oy = (e.clientY - r.top) / r.height;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    el.addEventListener('pointermove', function (e) {
      if (!down) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < 8) return;
      if (!moved) { moved = true; el.classList.add('pz-drag'); }
      el.style.left = (e.clientX - ox * el.offsetWidth) + 'px';
      el.style.top = (e.clientY - oy * el.offsetHeight) + 'px';
    });
    function end(e) {
      if (!down) return; down = false;
      if (!moved) { if (opts.onTap) opts.onTap(); return; }
      const r = el.getBoundingClientRect();
      el.classList.remove('pz-drag'); el.style.left = ''; el.style.top = '';
      opts.onDrop(e.type === 'pointerup' ? r.left + r.width / 2 : -1e4, e.type === 'pointerup' ? r.top + r.height / 2 : -1e4, r);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  function inside(rect, x, y) { return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom; }

  /* ---------- 1 & 2. Jigsaw / Picture Grid: drag pieces into the frame ---------- */
  function runRebuild(jig) {
    const lvl = P().currentLevel(), R = rng(jig ? 'jig' : 'grid');
    const d = gridFor(lvl), g = geo(d[0], d[1]), K = Math.min(g.cw, g.ch), n = g.cols * g.rows;
    const T = jig ? tabs(R, g) : null, m = jig ? 0.36 * K : 0;
    const pic = pickPic(R);
    title.textContent = (jig ? '🧩 Jigsaw' : '🔲 Picture Grid') + ' · ' + n + ' pieces';
    hint.textContent = 'Drag each piece into the frame!' + (lvl === 1 ? ' Tap a piece to see where it goes.' : '');
    const board = makeBoard(jig ? 'pz-jig' : 'pz-gridb');
    const guideOp = jig ? [0.3, 0.18, 0.1][lvl - 1] : 0.32;
    board.innerHTML = '<div class="pz-guide" style="opacity:' + guideOp + '">' + fullSVG(pic) + '</div>';
    if (!jig) {
      let lines = '';
      for (let c = 1; c < g.cols; c++) lines += '<line x1="' + f(c * g.cw) + '" y1="0" x2="' + f(c * g.cw) + '" y2="300"/>';
      for (let r = 1; r < g.rows; r++) lines += '<line x1="0" y1="' + f(r * g.ch) + '" x2="300" y2="' + f(r * g.ch) + '"/>';
      board.insertAdjacentHTML('beforeend', '<svg class="pz-lines" viewBox="0 0 300 300" preserveAspectRatio="none">' + lines + '</svg>');
    }
    sizeVar();
    let left = n;
    R.shuffle(Array.from({ length: n }, function (_, i) { return i; })).forEach(function (i) {
      const r = Math.floor(i / g.cols), c = i % g.cols, x = c * g.cw, y = r * g.ch;
      const el = document.createElement('div');
      el.className = 'pz-piece' + (jig ? '' : ' pz-sq');
      el.style.setProperty('--w', (g.cw + 2 * m) / 300);
      el.style.setProperty('--h', (g.ch + 2 * m) / 300);
      el.style.setProperty('--m', m / 300);
      el.innerHTML = pieceSVG(pic, x, y, g.cw, g.ch, jig ? edgesOf(T, r, c) : null, K);
      draggable(el, {
        onTap: function () {
          if (lvl > 1) { say('Drag the piece into the frame.'); return; }
          const fl = document.createElement('div');
          fl.className = 'pz-flash';
          put(fl, x, y, g.cw, g.ch);
          board.appendChild(fl);
          later(function () { fl.remove(); }, 1200);
          say('This piece goes here!');
        },
        onDrop: function (cx, cy) {
          const br = board.getBoundingClientRect(), k = br.width / 300;
          const tx = br.left + (x + g.cw / 2) * k, ty = br.top + (y + g.ch / 2) * k;
          if (Math.hypot(cx - tx, cy - ty) < K * k * 0.45) {
            el.classList.add('pz-placed', 'pz-locked');
            put(el, x - m, y - m, g.cw + 2 * m, g.ch + 2 * m);
            board.appendChild(el);
            left--;
            if (left === 0) { solvedPicture(board, pic, 2); return; }
            good('✨ It fits! ' + left + ' to go');
            say(left === 1 ? 'It fits! One more!' : 'It fits!');
          } else if (inside(br, cx, cy)) {
            oops('Not there — look at the picture on it 👀', 'Not there. Look at the picture on the piece.');
          }
        }
      });
      tray.appendChild(el);
    });
    say((jig ? 'Jigsaw time! ' : '') + 'Put the ' + n + ' pieces together to make the ' + pic.name + '!');
  }

  /* ---------- 3. Spin Tiles: tap each tile to turn it upright ---------- */
  function runSpin() {
    const lvl = P().currentLevel(), R = rng('spin');
    const d = gridFor(lvl), g = geo(d[0], d[1]), n = g.cols * g.rows, pic = pickPic(R);
    title.textContent = '🔄 Spin Tiles · ' + n + ' pieces';
    hint.textContent = 'Tap a tile to turn it. Make the picture right way up!';
    const board = makeBoard('pz-tiles');
    sizeVar();
    if (lvl < 3) tray.appendChild(thumb(pic));
    const turns = [];
    for (let i = 0; i < n; i++) turns.push(R.next() < 0.8 ? R.pick([90, 180, 270]) : 0);
    if (turns.filter(Boolean).length < 2) { turns[0] = 90; turns[n - 1] = 180; }
    let done = false;
    turns.forEach(function (t, i) {
      const r = Math.floor(i / g.cols), c = i % g.cols;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pz-tile';
      put(el, c * g.cw, r * g.ch, g.cw, g.ch);
      el.innerHTML = '<div class="pz-spin" style="transform:rotate(' + t + 'deg)">' + pieceSVG(pic, c * g.cw, r * g.ch, g.cw, g.ch, null) + '</div>';
      el.onclick = function () {
        if (done) return;
        turns[i] += 90;
        el.firstChild.style.transform = 'rotate(' + turns[i] + 'deg)';
        if (turns.every(function (v) { return v % 360 === 0; })) { done = true; later(function () { solvedPicture(board, pic, 2); }, 350); }
      };
      board.appendChild(el);
    });
    say('The ' + pic.name + ' picture is all turned around! Tap each tile to spin it the right way up.');
  }

  /* ---------- 4 & 6. Swap Tiles / Picture Strips: tap two pieces to swap them ---------- */
  function runSwap(strips) {
    const lvl = P().currentLevel(), R = rng(strips ? 'strips' : 'swap');
    const d = strips ? [[3, 4, 6][lvl - 1], 1] : gridFor(lvl);
    const g = geo(d[0], d[1]), n = g.cols * g.rows, pic = pickPic(R);
    title.textContent = (strips ? '📏 Picture Strips · ' : '🔀 Swap Tiles · ') + n + ' pieces';
    hint.textContent = 'Tap two pieces to swap them.' + (lvl < 3 ? ' A ✅ means it is in the right place!' : '');
    const board = makeBoard('pz-tiles');
    sizeVar();
    tray.appendChild(thumb(pic));
    const ids = Array.from({ length: n }, function (_, i) { return i; });
    let perm = ids;
    for (let tries = 0; tries < 50; tries++) {
      perm = R.shuffle(ids);
      if (perm.filter(function (p, s) { return p !== s; }).length >= Math.ceil(n * 0.6)) break;
    }
    let sel = -1, done = false;
    const tiles = ids.map(function (i) {
      const r = Math.floor(i / g.cols), c = i % g.cols;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pz-tile pz-swap' + (strips ? ' pz-strip' : '');
      el.innerHTML = pieceSVG(pic, c * g.cw, r * g.ch, g.cw, g.ch, null) + '<span class="pz-ok">✅</span>';
      el.onclick = function () { tap(perm.indexOf(i)); };
      board.appendChild(el);
      return el;
    });
    function layout() {
      perm.forEach(function (p, s) {
        put(tiles[p], (s % g.cols) * g.cw, Math.floor(s / g.cols) * g.ch, g.cw, g.ch);
        tiles[p].classList.toggle('ok', lvl < 3 && p === s);
      });
    }
    function tap(s) {
      if (done) return;
      if (sel === -1) { sel = s; tiles[perm[s]].classList.add('sel'); return; }
      tiles[perm[sel]].classList.remove('sel');
      if (sel !== s) {
        const t = perm[sel]; perm[sel] = perm[s]; perm[s] = t;
        layout();
        if (perm.every(function (p, k) { return p === k; })) { done = true; later(function () { solvedPicture(board, pic, 2); }, 400); }
      }
      sel = -1;
    }
    layout();
    say((strips ? 'The ' + pic.name + ' is cut into strips! ' : 'The ' + pic.name + ' is all mixed up! ') + 'Tap two pieces to swap them.');
  }

  /* ---------- 5. Slide Puzzle: slide pieces into the gap ---------- */
  function runSlide() {
    const lvl = P().currentLevel(), R = rng('slide');
    const d = lvl === 3 ? [4, 4] : [3, 3], g = geo(d[0], d[1]), n = g.cols * g.rows, pic = pickPic(R);
    const blankId = n - 1;
    title.textContent = '🎚️ Slide Puzzle · ' + n + ' pieces';
    hint.textContent = 'Tap a piece next to the gap to slide it!';
    const board = makeBoard('pz-tiles pz-slideb');
    sizeVar();
    tray.appendChild(thumb(pic));
    const perm = Array.from({ length: n }, function (_, i) { return i; });
    let b = n - 1, prev = -1;
    function nbrs(s) {
      const r = Math.floor(s / g.cols), c = s % g.cols, out = [];
      if (r > 0) out.push(s - g.cols); if (r < g.rows - 1) out.push(s + g.cols);
      if (c > 0) out.push(s - 1); if (c < g.cols - 1) out.push(s + 1);
      return out;
    }
    // Shuffle by making real moves, so it is always solvable (and only a few moves away).
    const moves = [6, 14, 24][lvl - 1];
    for (let k = 0; k < moves || perm.every(function (p, i) { return p === i; }); k++) {
      const opts = nbrs(b).filter(function (s) { return s !== prev; });
      const s = R.pick(opts);
      perm[b] = perm[s]; perm[s] = blankId; prev = b; b = s;
    }
    let done = false;
    const tiles = perm.map(function () { return null; });
    for (let i = 0; i < n - 1; i++) {
      const r = Math.floor(i / g.cols), c = i % g.cols;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pz-tile pz-swap';
      el.innerHTML = pieceSVG(pic, c * g.cw, r * g.ch, g.cw, g.ch, null) + (lvl < 3 ? '<span class="pz-num">' + (i + 1) + '</span>' : '');
      el.onclick = (function (id) { return function () { slide(perm.indexOf(id)); }; })(i);
      board.appendChild(el);
      tiles[i] = el;
    }
    function layout() {
      perm.forEach(function (p, s) { if (p !== blankId) put(tiles[p], (s % g.cols) * g.cw, Math.floor(s / g.cols) * g.ch, g.cw, g.ch); });
    }
    function slide(s) {
      if (done) return;
      if (nbrs(s).indexOf(b) === -1) { oops('Only pieces next to the gap can slide ↔️', 'Only pieces next to the empty gap can slide.'); return; }
      feed.className = 'feedback'; feed.textContent = '';
      perm[b] = perm[s]; perm[s] = blankId; b = s;
      layout();
      if (perm.every(function (p, i) { return p === i; })) {
        done = true;
        const last = document.createElement('div');
        last.className = 'pz-tile pz-last';
        put(last, ((n - 1) % g.cols) * g.cw, Math.floor((n - 1) / g.cols) * g.ch, g.cw, g.ch);
        last.innerHTML = pieceSVG(pic, ((n - 1) % g.cols) * g.cw, Math.floor((n - 1) / g.cols) * g.ch, g.cw, g.ch, null);
        board.appendChild(last);
        later(function () { solvedPicture(board, pic, 2); }, 400);
      }
    }
    layout();
    say('Slide the pieces into the gap to fix the ' + pic.name + ' picture!' + (lvl < 3 ? ' The numbers go in order.' : ''));
  }

  /* ---------- 7. Missing Piece: which piece fills the hole? ---------- */
  function runMissing() {
    const lvl = P().currentLevel(), R = rng('missing'), ROUNDS = 6;
    let round = 0;
    function ask() {
      stage.innerHTML = ''; tray.innerHTML = ''; ctrl.innerHTML = '';
      feed.className = 'feedback'; feed.textContent = '';
      const g = geo(3, 3), K = g.cw, pic = pickPic(R), T = lvl > 1 ? tabs(R, g) : null;
      const hole = R.int(0, 8), hr = Math.floor(hole / 3), hc = hole % 3, hx = hc * g.cw, hy = hr * g.ch;
      const he = T ? edgesOf(T, hr, hc) : null;
      title.textContent = '🕳️ Missing Piece (' + (round + 1) + '/' + ROUNDS + ')';
      hint.textContent = lvl === 1 ? 'Which piece fills the hole?' : 'Which piece fits? Check the bumps AND the picture!';
      const board = makeBoard();
      const hp = he ? piecePath(hx, hy, g.cw, g.ch, he, K) : 'M' + hx + ' ' + hy + 'h' + g.cw + 'v' + g.ch + 'h-' + g.cw + 'Z';
      board.innerHTML = '<svg viewBox="0 0 300 300" aria-hidden="true">' + pic.svg +
        '<path d="' + hp + '" fill="#2b2d42" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 4"/></svg>';
      sizeVar();
      const others = R.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8].filter(function (i) { return i !== hole; }));
      const opts = [{ ok: true, svg: pieceSVG(pic, hx, hy, g.cw, g.ch, he, K) }];
      const wrongPics = lvl === 1 ? 2 : lvl === 2 ? 1 : 2;
      for (let k = 0; k < wrongPics; k++) {
        const o = others[k];
        opts.push({ why: 'pic', svg: pieceSVG(pic, hx, hy, g.cw, g.ch, he, K, (o % 3) * g.cw, Math.floor(o / 3) * g.ch) });
      }
      if (he) { // right picture, wrong bumps
        const we = he.slice(), sides = [0, 1, 2, 3].filter(function (s) { return we[s] !== 0; });
        const s = R.pick(sides); we[s] = -we[s];
        opts.push({ why: 'shape', svg: pieceSVG(pic, hx, hy, g.cw, g.ch, we, K) });
      }
      const m = he ? 0.36 * K : 0;
      let locked = false;
      R.shuffle(opts).forEach(function (o) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pz-opt';
        b.style.setProperty('--w', (g.cw + 2 * m) / 300);
        b.style.setProperty('--h', (g.ch + 2 * m) / 300);
        b.innerHTML = o.svg;
        b.onclick = function () {
          if (locked || b.disabled) return;
          if (o.ok) {
            locked = true;
            b.style.visibility = 'hidden';
            const pc = document.createElement('div');
            pc.className = 'pz-placed pz-pop';
            put(pc, hx - m, hy - m, g.cw + 2 * m, g.ch + 2 * m);
            pc.innerHTML = o.svg;
            board.appendChild(pc);
            good('🎉 It fits perfectly!');
            say('Yes! It fits perfectly!');
            P().addStars(1); P().burst();
            round++;
            later(round >= ROUNDS ? function () { finishRounds('Missing Piece master!', 'Amazing! You found every missing piece!'); } : ask, 1500);
            return;
          }
          b.disabled = true; b.classList.add('wrong');
          if (o.why === 'shape') oops('The picture matches, but the bumps do not fit 🧩', 'The picture matches, but the bumps do not fit. Look at the shape!');
          else oops('That picture does not match the hole 👀', 'That picture does not match. Look at what is around the hole.');
        };
        tray.appendChild(b);
      });
      say('Which piece fills the hole in the ' + pic.name + '?');
    }
    ask();
  }

  /* ---------- 8. Shadow Match: drag each thing onto its shadow ---------- */
  const SHADOW_SETS = [
    ['🐘', '🦒', '🐇', '🐢', '🦆', '🐌', '🐈', '🐕', '🦕', '🐎', '🐓', '🦩'],
    ['🎸', '✂️', '🔑', '☂️', '🚲', '⚽', '🎈', '🍎', '🍌', '🔨', '🥄', '🎺'],
    ['🚗', '✈️', '🚀', '⛵', '🚂', '🚁', '🛴', '🚲', '🛸', '🚜']
  ];
  function runShadow() {
    const lvl = P().currentLevel(), R = rng('shadow'), ROUNDS = 3, n = [3, 4, 5][lvl - 1];
    let round = 0;
    function ask() {
      stage.innerHTML = ''; tray.innerHTML = ''; ctrl.innerHTML = '';
      feed.className = 'feedback'; feed.textContent = '';
      const set = R.pick(SHADOW_SETS), items = R.sample(set, n);
      const shadowsFor = lvl === 3 ? items.concat(R.sample(set.filter(function (e) { return items.indexOf(e) === -1; }), 1)) : items;
      title.textContent = '🌑 Shadow Match (' + (round + 1) + '/' + ROUNDS + ')';
      hint.textContent = 'Drag each picture onto its shadow!' + (lvl === 3 ? ' One shadow is extra.' : '');
      const wrap = document.createElement('div');
      wrap.className = 'pz-shadows';
      stage.appendChild(wrap);
      const shadows = R.shuffle(shadowsFor).map(function (e) {
        const s = document.createElement('div');
        s.className = 'pz-shadow';
        s.dataset.e = e;
        s.innerHTML = '<span>' + e + '</span>';
        wrap.appendChild(s);
        return s;
      });
      let left = n;
      R.shuffle(items).forEach(function (e) {
        const el = document.createElement('div');
        el.className = 'pz-emo';
        el.textContent = e;
        draggable(el, {
          onTap: function () {
            if (lvl > 1) { say('Drag it onto its shadow.'); return; }
            shadows.forEach(function (s) { if (s.dataset.e === e && !s.classList.contains('done')) { s.classList.remove('pz-glow'); void s.offsetWidth; s.classList.add('pz-glow'); } });
            say('Its shadow is glowing!');
          },
          onDrop: function (cx, cy) {
            const hit = shadows.filter(function (s) { return !s.classList.contains('done') && inside(s.getBoundingClientRect(), cx, cy); })[0];
            if (!hit) return;
            if (hit.dataset.e !== e) { oops('That shadow has a different shape 🔍', 'That shadow is a different shape. Look again!'); return; }
            hit.classList.add('done');
            el.remove();
            left--;
            if (left > 0) { good('✨ Match!'); say('Match!'); return; }
            good('🎉 All the shadows are matched!');
            say('Wonderful! You matched all the shadows!');
            P().addStars(1); P().burst();
            round++;
            later(round >= ROUNDS ? function () { finishRounds('Shadow detective!', 'Amazing! You are a shadow detective!'); } : ask, 1500);
          }
        });
        tray.appendChild(el);
      });
      say('Drag each picture onto its matching shadow!');
    }
    ask();
  }

  /* ---------- 9. Block Fit: fill the shape with blocks ---------- */
  const BLOCK_COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff924c', '#4cc9f0', '#f15bb5'];
  function normal(cells) {
    const r0 = Math.min.apply(null, cells.map(function (p) { return p[0]; })), c0 = Math.min.apply(null, cells.map(function (p) { return p[1]; }));
    return cells.map(function (p) { return [p[0] - r0, p[1] - c0]; });
  }
  function turn90(cells) { return normal(cells.map(function (p) { return [p[1], -p[0]]; })); }
  // Cut the region into random connected pieces of minS-maxS cells (tiny leftovers join a neighbour).
  function partition(R, cells, minS, maxS) {
    const key = function (r, c) { return r + ',' + c; };
    const free = new Set(cells.map(function (p) { return key(p[0], p[1]); }));
    const near = function (r, c) { return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]; };
    const pieces = [];
    while (free.size) {
      let start = null, best = 9;
      free.forEach(function (k) {
        const p = k.split(',').map(Number);
        const nf = near(p[0], p[1]).filter(function (q) { return free.has(key(q[0], q[1])); }).length;
        if (nf < best || (nf === best && R.bool())) { best = nf; start = p; }
      });
      const want = R.int(minS, maxS), piece = [start];
      free.delete(key(start[0], start[1]));
      while (piece.length < want) {
        const front = [];
        piece.forEach(function (p) { near(p[0], p[1]).forEach(function (q) { if (free.has(key(q[0], q[1]))) front.push(q); }); });
        if (!front.length) break;
        const q = R.pick(front);
        free.delete(key(q[0], q[1])); piece.push(q);
      }
      pieces.push(piece);
    }
    for (let guard = 0; guard < 50; guard++) {
      const i = pieces.findIndex(function (p) { return p.length < minS; });
      if (i === -1) break;
      const mine = new Set(pieces[i].map(function (p) { return key(p[0], p[1]); }));
      const j = pieces.findIndex(function (p, k) {
        return k !== i && p.some(function (q) { return near(q[0], q[1]).some(function (z) { return mine.has(key(z[0], z[1])); }); });
      });
      if (j === -1) break;
      pieces[j] = pieces[j].concat(pieces[i]);
      pieces.splice(i, 1);
    }
    return pieces;
  }
  function runBlocks() {
    const lvl = P().currentLevel(), R = rng('blocks'), ROUNDS = 3;
    const cfg = [{ cols: 3, rows: 3, min: 2, max: 3 }, { cols: 4, rows: 4, min: 3, max: 4 }, { cols: 5, rows: 4, min: 3, max: 4 }][lvl - 1];
    const canTurn = lvl > 1;
    let round = 0;
    function ask() {
      stage.innerHTML = ''; tray.innerHTML = ''; ctrl.innerHTML = '';
      feed.className = 'feedback'; feed.textContent = '';
      title.textContent = '🟦 Block Fit (' + (round + 1) + '/' + ROUNDS + ')';
      hint.textContent = 'Drag the blocks to fill every square!' + (canTurn ? ' Tap a block to turn it 🔄' : '');
      const cell = Math.floor(Math.min(window.innerWidth * 0.84, 330) / Math.max(cfg.cols, cfg.rows));
      screen.style.setProperty('--pzCell', cell + 'px');
      // The shape to fill: the full grid, minus two corners at the top level.
      const region = [];
      const cut = lvl === 3 ? R.sample(['0,0', '0,' + (cfg.cols - 1), (cfg.rows - 1) + ',0', (cfg.rows - 1) + ',' + (cfg.cols - 1)], 2) : [];
      for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < cfg.cols; c++) if (cut.indexOf(r + ',' + c) === -1) region.push([r, c]);
      const pieces = partition(R, region, cfg.min, cfg.max).map(function (cells, i) {
        let shape = normal(cells);
        if (canTurn) for (let t = R.int(0, 3); t > 0; t--) shape = turn90(shape);
        return { id: i, shape: shape, color: BLOCK_COLORS[i % BLOCK_COLORS.length] };
      });
      const board = document.createElement('div');
      board.className = 'pz-blkboard';
      board.style.gridTemplateColumns = 'repeat(' + cfg.cols + ', var(--pzCell))';
      stage.appendChild(board);
      const owner = {}; // "r,c" -> piece id
      const cellEls = {};
      for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < cfg.cols; c++) {
        const k = r + ',' + c, d = document.createElement('div');
        d.className = 'pz-bcell' + (cut.indexOf(k) === -1 ? '' : ' off');
        d.onclick = function () { if (owner[k] !== undefined) takeBack(owner[k]); };
        board.appendChild(d);
        cellEls[k] = d;
      }
      let filled = 0, finished = false;
      function blockEl(pc) {
        const el = document.createElement('div');
        el.className = 'pz-blk';
        function draw() {
          const h = 1 + Math.max.apply(null, pc.shape.map(function (p) { return p[0]; }));
          const w = 1 + Math.max.apply(null, pc.shape.map(function (p) { return p[1]; }));
          el.style.gridTemplateColumns = 'repeat(' + w + ', var(--pzCell))';
          let html = '';
          for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
            const on = pc.shape.some(function (p) { return p[0] === r && p[1] === c; });
            html += '<span' + (on ? ' style="background:' + pc.color + '"' : ' class="no"') + '></span>';
          }
          el.innerHTML = html;
        }
        draw();
        draggable(el, {
          onTap: function () {
            if (!canTurn) { say('Drag the block onto the grid.'); return; }
            pc.shape = turn90(pc.shape); draw(); say('Turn!');
          },
          onDrop: function (cx, cy, rect) {
            const br = board.getBoundingClientRect(), g0 = cellEls['0,0'].getBoundingClientRect();
            const c0 = Math.round((rect.left - g0.left) / cell), r0 = Math.round((rect.top - g0.top) / cell);
            const spots = pc.shape.map(function (p) { return (r0 + p[0]) + ',' + (c0 + p[1]); });
            const fits = spots.every(function (k) { return cellEls[k] && !cellEls[k].classList.contains('off') && owner[k] === undefined; });
            if (!fits) {
              if (inside(br, cx, cy)) oops('That block does not fit there 🤔', 'That block does not fit there. Try another spot' + (canTurn ? ', or turn it.' : '.'));
              return;
            }
            spots.forEach(function (k) { owner[k] = pc.id; cellEls[k].style.background = pc.color; cellEls[k].classList.add('on'); });
            pc.spots = spots;
            el.remove();
            filled += spots.length;
            if (filled === region.length) {
              finished = true;
              good('🎉 Every square is filled!');
              say('Brilliant! You filled the whole shape!');
              P().addStars(1); P().burst();
              round++;
              later(round >= ROUNDS ? function () { finishRounds('Block builder!', 'Amazing! You are a block builder!'); } : ask, 1500);
            } else { good('✨ Nice fit!'); say('Nice fit!'); }
          }
        });
        return el;
      }
      function takeBack(id) {
        if (finished) return;
        const pc = pieces[id];
        pc.spots.forEach(function (k) { delete owner[k]; cellEls[k].style.background = ''; cellEls[k].classList.remove('on'); });
        filled -= pc.spots.length;
        tray.appendChild(blockEl(pc));
        say('Block back. Try again!');
      }
      R.shuffle(pieces).forEach(function (pc) { tray.appendChild(blockEl(pc)); });
      say('Fill every square with the blocks!' + (canTurn ? ' Tap a block to turn it.' : '') + ' Tap a placed block to take it back.');
    }
    ask();
  }

  /* ---------- 10. Copy the Pattern: colour your grid like the example ---------- */
  function runCopy() {
    const lvl = P().currentLevel(), R = rng('copy'), ROUNDS = 3;
    const cfg = [{ n: 3, colors: 2, fill: [3, 4] }, { n: 4, colors: 3, fill: [6, 8] }, { n: 4, colors: 4, fill: [8, 10] }][lvl - 1];
    const PAL = ['#ff595e', '#1982c4', '#ffca3a', '#8ac926'];
    let round = 0;
    function ask() {
      stage.innerHTML = ''; tray.innerHTML = ''; ctrl.innerHTML = '';
      feed.className = 'feedback'; feed.textContent = '';
      title.textContent = '🎨 Copy the Pattern (' + (round + 1) + '/' + ROUNDS + ')';
      hint.textContent = lvl === 3 ? 'Remember the pattern, then copy it! Tap 👀 to peek.' : 'Make your grid look just like the example!';
      const N = cfg.n * cfg.n, pal = PAL.slice(0, cfg.colors);
      const target = Array(N).fill(-1);
      R.sample(Array.from({ length: N }, function (_, i) { return i; }), R.int(cfg.fill[0], cfg.fill[1])).forEach(function (i) { target[i] = R.int(0, cfg.colors - 1); });
      const mine = Array(N).fill(-1);
      let color = 0, locked = false;
      function grid(cls, values, onTap) {
        const g = document.createElement('div');
        g.className = 'pz-cgrid ' + cls;
        g.style.gridTemplateColumns = 'repeat(' + cfg.n + ', 1fr)';
        values.forEach(function (v, i) {
          const c = document.createElement(onTap ? 'button' : 'div');
          if (onTap) { c.type = 'button'; c.onclick = function () { onTap(i, c); }; }
          c.className = 'pz-ccell';
          if (v >= 0) c.style.background = pal[v];
          g.appendChild(c);
        });
        return g;
      }
      const ex = document.createElement('div');
      ex.className = 'pz-example';
      ex.innerHTML = '<span class="pz-label">Example</span>';
      const exGrid = grid('small', target);
      ex.appendChild(exGrid);
      const cover = document.createElement('div');
      cover.className = 'pz-cover';
      cover.textContent = '🙈';
      ex.appendChild(cover);
      stage.appendChild(ex);
      const yours = document.createElement('div');
      yours.className = 'pz-example';
      yours.innerHTML = '<span class="pz-label">Your grid</span>';
      yours.appendChild(grid('big', mine, function (i, c) {
        if (locked) return;
        mine[i] = mine[i] === color ? -1 : color;
        c.style.background = mine[i] >= 0 ? pal[mine[i]] : '';
        if (mine.every(function (v, k) { return v === target[k]; })) {
          locked = true;
          cover.classList.remove('on');
          good('🎉 A perfect copy!');
          say('Perfect! Your grid matches the example!');
          P().addStars(1); P().burst();
          round++;
          later(round >= ROUNDS ? function () { finishRounds('Pattern copier!', 'Amazing! You copied every pattern!'); } : ask, 1500);
        }
      }));
      stage.appendChild(yours);
      // Colour picker.
      pal.forEach(function (p, i) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pz-swatch' + (i === 0 ? ' sel' : '');
        b.style.background = p;
        b.setAttribute('aria-label', 'colour ' + (i + 1));
        b.onclick = function () {
          color = i;
          tray.querySelectorAll('.pz-swatch').forEach(function (s) { s.classList.remove('sel'); });
          b.classList.add('sel');
        };
        tray.appendChild(b);
      });
      if (lvl === 3) {
        later(function () { if (!locked) { cover.classList.add('on'); say('Now copy it from memory! Tap peek if you need help.'); } }, 6000);
        const peek = document.createElement('button');
        peek.type = 'button';
        peek.className = 'pz-swatch pz-peek';
        peek.textContent = '👀';
        peek.onclick = function () {
          if (locked) return;
          cover.classList.remove('on');
          later(function () { if (!locked) cover.classList.add('on'); }, 2000);
        };
        tray.appendChild(peek);
      }
      say(lvl === 3 ? 'Look carefully and remember the pattern! It will hide soon.' : 'Pick a colour, then tap the squares to copy the example. Tap again to clear.');
    }
    ask();
  }

  /* ---------- starting a game ---------- */
  const GAMES = {
    jigsaw: function () { runRebuild(true); }, grid: function () { runRebuild(false); },
    spin: runSpin, swap: function () { runSwap(false); }, slide: runSlide, strips: function () { runSwap(true); },
    missing: runMissing, shadow: runShadow, blocks: runBlocks, copy: runCopy
  };
  function reset() {
    timers.forEach(clearTimeout); timers = [];
    stage.innerHTML = ''; tray.innerHTML = ''; ctrl.innerHTML = '';
    feed.className = 'feedback'; feed.textContent = '';
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  function start(name) {
    if (!GAMES[name]) return;
    current = name;
    reset();
    P().show('puzzle');
    stage.dataset.game = name;
    GAMES[name]();
  }
  $('pzHome').onclick = function () { reset(); P().show('puzzleHub'); };
  $('pzHubHome').onclick = function () { P().goHome(); };
  $('pzSpeak').onclick = function () { if (speakText) P().speak(speakText); };

  window.PUZZLES = { start: start };
})();
