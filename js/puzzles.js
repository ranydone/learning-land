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

  // 40 more pictures for Spin Tiles. Each has a clear "up" (sky above, ground below) and
  // things spread over the whole picture, so every tile shows which way it is turned.
  function stripes(y, h, w, a, b) {
    let s = '';
    for (let x = 0, k = 0; x < 300; x += w, k++) s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (k % 2 ? b : a) + '"/>';
    return s;
  }
  function rain() {
    let s = '';
    for (let i = 0; i < 26; i++) {
      const x = (i * 47) % 300, y = 80 + (i * 61) % 140;
      s += '<line x1="' + x + '" y1="' + y + '" x2="' + (x - 6) + '" y2="' + (y + 16) + '" stroke="#4895ef" stroke-width="3" stroke-linecap="round"/>';
    }
    return s;
  }
  function checker(x, y, w, h, n, a, b) { // a checked blanket / cloth
    let s = '';
    const rows = Math.round(n * h / w), cw = w / n, ch = h / rows;
    const r1 = function (v) { return Math.round(v * 10) / 10; }; // `f` is defined further down
    for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) {
      s += '<rect x="' + r1(x + c * cw) + '" y="' + r1(y + r * ch) + '" width="' + r1(cw) + '" height="' + r1(ch) + '" fill="' + ((r + c) % 2 ? b : a) + '"/>';
    }
    return s;
  }
  function kite(cx, cy, s, c) { // diamond kite with a string and a tail
    return '<path d="M' + cx + ' ' + (cy - s) + ' L' + (cx + s * 0.7) + ' ' + cy + ' L' + cx + ' ' + (cy + s * 1.2) + ' L' + (cx - s * 0.7) + ' ' + cy + 'Z" fill="' + c + '"/>' +
      '<path d="M' + cx + ' ' + (cy - s) + ' V' + (cy + s * 1.2) + ' M' + (cx - s * 0.7) + ' ' + cy + ' H' + (cx + s * 0.7) + '" stroke="#fff" stroke-width="2"/>' +
      '<path d="M' + cx + ' ' + (cy + s * 1.2) + ' q8 12 0 24 q-8 12 0 24" stroke="' + c + '" stroke-width="3" fill="none"/>';
  }
  function balloon(cx, cy, r, a, b) { // hot-air balloon with a basket
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + a + '"/><ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (r * 0.42) + '" ry="' + r + '" fill="' + b + '"/>' +
      '<path d="M' + (cx - r * 0.6) + ' ' + (cy + r * 0.8) + ' L' + (cx - 8) + ' ' + (cy + r + 18) + ' M' + (cx + r * 0.6) + ' ' + (cy + r * 0.8) + ' L' + (cx + 8) + ' ' + (cy + r + 18) + '" stroke="#5c4033" stroke-width="2"/>' +
      '<rect x="' + (cx - 10) + '" y="' + (cy + r + 16) + '" width="20" height="14" rx="3" fill="#9c6644"/>';
  }
  function bricks(x, y, w, h) { // a brick wall
    let s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#e5e5e5"/>';
    for (let r = 0, yy = y; yy < y + h; r++, yy += 16) for (let xx = x - (r % 2 ? 16 : 0); xx < x + w; xx += 32) {
      const l = Math.max(xx, x), rr = Math.min(xx + 30, x + w);
      if (rr > l) s += '<rect x="' + (l + 1) + '" y="' + (yy + 1) + '" width="' + (rr - l - 2) + '" height="14" rx="2" fill="#c1440e"/>';
    }
    return s;
  }
  function rangoli(cx, cy) {
    return ['#ff006e', '#ffbe0b', '#3a86ff', '#8338ec', '#fb5607'].map(function (c, i) {
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + (26 - i * 5) + '" fill="' + c + '"/>';
    }).join('');
  }
  const SPIN_PICS = [
    scene('pond', 'frog pond', '#a8dadc', '#f1faee', '<rect y="150" width="300" height="150" fill="#95d5b2"/><ellipse cx="150" cy="218" rx="128" ry="58" fill="#48cae4"/><ellipse cx="150" cy="222" rx="96" ry="38" fill="#0096c7" opacity=".45"/>',
      [['☀️', 255, 40, 46], ['☁️', 70, 45, 46], ['🦋', 160, 92, 34], ['🌾', 28, 150, 48], ['🌾', 274, 158, 44], ['🐸', 105, 222, 46], ['🦆', 200, 198, 42], ['🐟', 196, 248, 28], ['🐢', 58, 272, 32], ['🌸', 252, 272, 30]]),
    scene('market', 'fruit market', '#fff1e6', '#ffe5ec', stripes(18, 52, 30, '#e63946', '#ffffff') + '<rect y="210" width="300" height="90" fill="#bc6c25"/><rect y="204" width="300" height="10" fill="#dda15e"/>',
      [['🏷️', 150, 112, 30], ['🍎', 50, 168, 46], ['🍌', 120, 165, 48], ['🍇', 190, 170, 46], ['🍉', 255, 165, 52], ['🍓', 55, 248, 38], ['🍍', 130, 244, 50], ['🍒', 200, 252, 36], ['🧺', 262, 254, 44]]),
    scene('train', 'train ride', '#bde0fe', '#e0fbfc', '<path d="M0 175 Q75 125 150 175 T300 175 V300 H0Z" fill="#90be6d"/><rect y="238" width="300" height="6" fill="#6c584c"/>' + stripes(244, 6, 15, '#6c584c', 'transparent'),
      [['☁️', 60, 45, 44], ['☁️', 210, 62, 36], ['☀️', 266, 34, 40], ['🐦', 140, 70, 26], ['🌳', 262, 172, 50], ['🚂', 70, 220, 52], ['🚃', 135, 220, 52], ['🚃', 200, 220, 52], ['🐄', 42, 280, 36], ['🌻', 150, 282, 32], ['🌻', 250, 280, 32]]),
    scene('castle', 'fairy castle', '#cdb4db', '#ffc8dd', '<path d="M0 232 Q150 210 300 232 V300 H0Z" fill="#80b918"/>',
      [['👑', 150, 34, 34], ['✨', 55, 58, 30], ['🐉', 252, 88, 52], ['☁️', 92, 108, 40], ['🏰', 150, 168, 108], ['🌳', 28, 188, 52], ['🦄', 58, 248, 50], ['🍄', 150, 274, 30], ['🌸', 248, 272, 32]]),
    scene('pirate', 'pirate sea', '#90e0ef', '#caf0f8', '<rect y="150" width="300" height="150" fill="#0077b6"/><ellipse cx="250" cy="152" rx="52" ry="14" fill="#ffd166"/>' +
      '<rect x="96" y="40" width="4" height="72" fill="#5c4033"/><rect x="100" y="40" width="46" height="30" fill="#212529"/>' + txt('☠️', 123, 55, 22),
      [['🦜', 40, 60, 40], ['☀️', 262, 36, 40], ['⛵', 112, 138, 70], ['🏝️', 250, 124, 54], ['🐠', 150, 204, 30], ['🦈', 66, 218, 46], ['⚓', 268, 216, 34], ['💰', 60, 276, 34], ['🐙', 200, 256, 46]]),
    scene('school', 'classroom', '#fefae0', '#faedcd', '<rect x="30" y="28" width="200" height="104" rx="6" fill="#2d6a4f" stroke="#8d6e63" stroke-width="6"/>' +
      '<text x="130" y="82" font-size="34" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">ABC 123</text>' +
      '<rect y="232" width="300" height="68" fill="#d4a373"/><rect x="50" y="196" width="200" height="16" rx="4" fill="#bc6c25"/>',
      [['🕐', 266, 62, 36], ['📚', 72, 172, 40], ['🍎', 132, 178, 30], ['✏️', 182, 178, 30], ['🌍', 232, 172, 36], ['🎒', 42, 264, 44], ['🖍️', 150, 266, 30], ['🧮', 252, 264, 40]]),
    scene('kitchen', 'kitchen', '#ffe8d6', '#ffd7ba', '<rect x="188" y="28" width="84" height="72" fill="#a2d2ff" stroke="#fff" stroke-width="6"/><line x1="230" y1="28" x2="230" y2="100" stroke="#fff" stroke-width="5"/>' +
      '<rect x="20" y="96" width="140" height="6" fill="#9c6644"/><rect y="200" width="300" height="100" fill="#b08968"/><rect y="194" width="300" height="10" fill="#ddb892"/>',
      [['🕰️', 60, 68, 40], ['🧂', 130, 76, 30], ['☀️', 210, 58, 30], ['🍳', 60, 176, 44], ['🥞', 130, 176, 40], ['🧁', 200, 178, 36], ['🥛', 262, 176, 40], ['🍪', 50, 258, 36], ['🥕', 122, 260, 36], ['🍲', 192, 260, 40], ['☕', 258, 260, 36]]),
    scene('bedroom', 'bedtime', '#22223b', '#4a4e69', '<rect x="30" y="28" width="100" height="92" fill="#14213d" stroke="#f2e9e4" stroke-width="6"/><rect y="230" width="300" height="70" fill="#9a8c98"/><ellipse cx="150" cy="270" rx="110" ry="20" fill="#c9ada7"/>',
      [['🌙', 80, 70, 44], ['⭐', 180, 40, 22], ['⭐', 262, 72, 20], ['💤', 232, 136, 30], ['🧸', 58, 208, 50], ['🛏️', 192, 200, 90], ['📖', 128, 270, 34], ['🧦', 250, 272, 30]]),
    scene('arctic', 'icy north', '#caf0f8', '#ade8f4', '<rect y="160" width="300" height="50" fill="#48cae4"/><path d="M0 205 Q150 185 300 210 V300 H0Z" fill="#f8f9fa"/><ellipse cx="205" cy="258" rx="58" ry="18" fill="#0096c7"/>',
      [['❄️', 200, 40, 28], ['☁️', 140, 62, 40], ['❄️', 272, 92, 24], ['🏔️', 66, 120, 90], ['🐋', 252, 176, 44], ['🦭', 160, 212, 48], ['🐧', 48, 240, 46], ['🐧', 100, 268, 38], ['🐟', 205, 258, 24]]),
    scene('desert', 'desert', '#ffb703', '#ffe8a3', '<path d="M0 205 Q80 160 160 205 T300 192 V300 H0Z" fill="#e9c46a"/><path d="M0 250 Q100 225 200 250 T300 245 V300 H0Z" fill="#d4a24c"/>',
      [['🦅', 70, 60, 38], ['☀️', 250, 46, 56], ['🌴', 215, 162, 50], ['🐪', 112, 190, 80], ['🌵', 38, 200, 60], ['🌵', 262, 222, 50], ['🦂', 60, 276, 30], ['🐍', 170, 272, 34], ['🏺', 242, 280, 34]]),
    scene('autumn', 'autumn park', '#ffe5d9', '#fec89a', '<rect x="40" y="80" width="24" height="150" fill="#6f4518"/><circle cx="52" cy="80" r="55" fill="#f77f00"/><path d="M0 230 Q150 210 300 232 V300 H0Z" fill="#bc6c25"/>',
      [['🍁', 200, 50, 36], ['🍂', 250, 110, 34], ['🍁', 150, 122, 28], ['🍂', 274, 196, 30], ['🐿️', 122, 218, 52], ['🦔', 210, 250, 44], ['🎃', 60, 265, 46], ['🌰', 160, 276, 26], ['🍄', 270, 272, 34]]),
    scene('circus', 'circus', '#ffafcc', '#ffc8dd', '<path d="M56 232 L150 72 L244 232Z" fill="#e63946"/><path d="M150 72 L118 232 L182 232Z" fill="#fff"/><rect y="232" width="300" height="68" fill="#ffd166"/>',
      [['⭐', 150, 46, 26], ['🎈', 40, 60, 46], ['🎈', 260, 70, 46], ['🎉', 258, 156, 36], ['🤡', 150, 196, 44], ['🐘', 54, 240, 54], ['🦁', 250, 248, 50], ['🍿', 150, 276, 32]]),
    scene('safari', 'safari', '#ffd166', '#fcefb4', '<rect y="182" width="300" height="118" fill="#a7c957"/><rect x="225" y="92" width="10" height="100" fill="#7f5539"/><ellipse cx="230" cy="92" rx="56" ry="16" fill="#386641"/>',
      [['☀️', 55, 45, 50], ['🦅', 150, 50, 30], ['🚙', 140, 164, 34], ['🦒', 70, 160, 80], ['🦓', 165, 218, 62], ['🦩', 266, 202, 40], ['🦛', 70, 266, 46], ['🐊', 232, 276, 42]]),
    scene('soil', 'under the ground', '#bde0fe', '#bde0fe', '<rect y="112" width="300" height="188" fill="#7f5539"/><rect y="104" width="300" height="12" fill="#80b918"/>' +
      '<path d="M20 150 Q90 200 160 150 T290 220" stroke="#9c6644" stroke-width="14" fill="none" stroke-linecap="round"/><rect y="236" width="300" height="64" fill="#6b4226"/>',
      [['🌻', 60, 66, 56], ['🌱', 150, 90, 30], ['🐦', 222, 66, 30], ['☀️', 262, 30, 36], ['🪱', 70, 172, 40], ['🥕', 132, 160, 44], ['🐜', 205, 168, 34], ['🥔', 248, 222, 40], ['🐛', 88, 258, 36], ['💎', 172, 268, 30], ['🐜', 40, 282, 26]]),
    scene('sports', 'sports day', '#a2d2ff', '#cdeac0', '<rect y="168" width="300" height="132" fill="#55a630"/><line x1="0" y1="232" x2="300" y2="232" stroke="#fff" stroke-width="3"/><circle cx="150" cy="232" r="26" stroke="#fff" stroke-width="3" fill="none"/>',
      [['☀️', 40, 40, 40], ['☁️', 130, 46, 40], ['🪁', 232, 56, 46], ['🌳', 122, 142, 46], ['🥅', 250, 172, 52], ['🏀', 58, 192, 36], ['⚽', 150, 232, 36], ['🚲', 70, 266, 46], ['🏆', 260, 270, 38]]),
    scene('music', 'music show', '#240046', '#5a189a', '<path d="M40 0 L0 220 L90 220Z M260 0 L210 220 L300 220Z" fill="#ffd60a" opacity=".22"/><rect y="220" width="300" height="80" fill="#9d0208"/><rect y="216" width="300" height="8" fill="#ffba08"/>',
      [['🎶', 70, 58, 34], ['⭐', 150, 34, 22], ['🎵', 230, 50, 30], ['🎤', 150, 106, 40], ['🎸', 60, 170, 52], ['🥁', 150, 184, 60], ['🎹', 245, 178, 52], ['🎺', 60, 262, 36], ['🎻', 240, 262, 38]]),
    scene('rainy', 'rainy day', '#adb5bd', '#dee2e6', rain() + '<rect y="232" width="300" height="68" fill="#74c69d"/><ellipse cx="150" cy="268" rx="70" ry="14" fill="#90e0ef"/>',
      [['🌧️', 70, 44, 56], ['🌧️', 222, 40, 50], ['☔', 150, 166, 70], ['🐤', 40, 214, 30], ['🌷', 274, 218, 34], ['🐸', 60, 256, 40], ['🦆', 150, 266, 36], ['🐌', 250, 264, 34]]),
    scene('harbour', 'harbour', '#ffd6a5', '#caf0f8', '<rect y="170" width="300" height="130" fill="#0096c7"/><rect y="150" width="120" height="22" fill="#7f5539"/><rect x="20" y="172" width="8" height="30" fill="#5c4033"/><rect x="90" y="172" width="8" height="30" fill="#5c4033"/>' +
      '<rect x="250" y="70" width="22" height="100" fill="#fff"/>' + [80, 120].map(function (y) { return '<rect x="250" y="' + y + '" width="22" height="18" fill="#e63946"/>'; }).join('') + '<path d="M246 70 L261 50 L276 70Z" fill="#e63946"/>',
      [['☀️', 60, 48, 40], ['🐦', 140, 62, 28], ['🏠', 50, 128, 40], ['🚢', 182, 140, 60], ['⛵', 90, 214, 44], ['🛥️', 222, 232, 44], ['⚓', 40, 256, 34], ['🐟', 150, 272, 28], ['🦀', 270, 282, 28]]),
    scene('bakery', 'bakery', '#fdf0d5', '#f8d7c4', '<rect x="10" y="104" width="280" height="8" fill="#a0522d"/><rect x="10" y="204" width="280" height="8" fill="#a0522d"/><rect y="290" width="300" height="10" fill="#a0522d"/>',
      [['🎂', 60, 74, 48], ['🧁', 150, 78, 42], ['🍩', 240, 78, 42], ['🍪', 56, 178, 40], ['🍰', 150, 175, 44], ['🥐', 244, 178, 44], ['🍭', 60, 262, 40], ['🍬', 150, 268, 36], ['🥧', 240, 262, 42]]),
    scene('roads', 'busy road', '#bde0fe', '#e2eafc', '<rect y="150" width="300" height="150" fill="#95d5b2"/><rect y="198" width="300" height="62" fill="#495057"/>' + stripes(226, 5, 24, '#ffffff', 'transparent'),
      [['☁️', 60, 45, 40], ['☀️', 262, 40, 42], ['🏠', 60, 132, 52], ['🏥', 150, 122, 56], ['🏫', 245, 130, 54], ['🚒', 62, 214, 44], ['🚓', 250, 214, 40], ['🚑', 160, 244, 44], ['🚲', 60, 284, 30], ['🌳', 272, 282, 34]]),
    scene('picnic', 'picnic', '#bde0fe', '#e9f5db', '<rect y="150" width="300" height="150" fill="#95d5b2"/><rect x="30" y="70" width="20" height="100" fill="#7f5539"/><circle cx="40" cy="70" r="45" fill="#52b788"/>' +
      checker(95, 196, 180, 72, 9, '#e63946', '#ffffff'),
      [['☀️', 255, 40, 46], ['☁️', 150, 50, 40], ['🦋', 222, 110, 32], ['🐶', 50, 236, 50], ['🧺', 122, 214, 44], ['🥪', 182, 224, 36], ['🍉', 242, 214, 36], ['🍓', 230, 256, 30], ['🐜', 150, 262, 24], ['🌼', 30, 286, 26]]),
    scene('playground', 'playground', '#a2d2ff', '#ffffff', '<rect y="230" width="300" height="70" fill="#f4a261"/><path d="M40 230 V120 M70 230 V120" stroke="#e63946" stroke-width="6"/>' +
      [140, 165, 190, 215].map(function (y) { return '<line x1="40" y1="' + y + '" x2="70" y2="' + y + '" stroke="#e63946" stroke-width="4"/>'; }).join('') +
      '<path d="M70 120 Q120 140 150 230" stroke="#ffb703" stroke-width="12" fill="none"/><path d="M190 230 L210 110 L270 110 L290 230" stroke="#1982c4" stroke-width="6" fill="none"/>' +
      '<path d="M225 110 V190 M255 110 V190" stroke="#495057" stroke-width="2"/><rect x="218" y="190" width="44" height="8" rx="3" fill="#8338ec"/>',
      [['☀️', 40, 40, 40], ['☁️', 150, 40, 40], ['🪁', 270, 50, 36], ['🐦', 240, 76, 26], ['🎈', 140, 100, 40], ['⚽', 60, 272, 30], ['🐕', 130, 262, 40], ['🧸', 240, 268, 32]]),
    scene('aquarium', 'aquarium', '#caf0f8', '#0077b6', '<path d="M0 255 Q150 240 300 255 V300 H0Z" fill="#ffe8a3"/><path d="M6 40 Q50 30 100 40 T200 40 T294 40" stroke="#fff" stroke-width="3" fill="none"/>' +
      '<path d="M40 262 Q28 222 45 190 Q58 160 40 130" stroke="#2d6a4f" stroke-width="8" fill="none"/><path d="M262 262 Q275 225 258 195 Q245 168 262 145" stroke="#40916c" stroke-width="8" fill="none"/>' +
      dots([[150, 70, 4], [156, 54, 3], [70, 110, 3], [240, 150, 4]], '#ffffff') + '<rect x="5" y="5" width="290" height="290" rx="12" fill="none" stroke="#495057" stroke-width="10"/>',
      [['🐠', 100, 90, 44], ['🐡', 220, 100, 40], ['🐟', 160, 160, 40], ['🦐', 80, 192, 34], ['🐙', 228, 202, 46], ['🐚', 120, 270, 28], ['⭐', 200, 272, 26], ['🦀', 262, 276, 26]]),
    scene('airport', 'airport', '#90e0ef', '#e0fbfc', '<rect y="230" width="300" height="70" fill="#a7c957"/><rect y="252" width="300" height="32" fill="#495057"/>' + stripes(266, 4, 26, '#ffffff', 'transparent') +
      '<rect x="30" y="120" width="26" height="112" fill="#adb5bd"/><rect x="20" y="100" width="46" height="24" rx="4" fill="#48cae4"/>',
      [['☀️', 34, 40, 36], ['☁️', 100, 44, 44], ['🚁', 258, 60, 44], ['✈️', 165, 96, 60], ['☁️', 238, 140, 36], ['🛫', 200, 212, 46], ['🧳', 110, 238, 34], ['🌳', 272, 224, 36]]),
    scene('workshop', 'workshop', '#e9ecef', '#ced4da', '<rect x="20" y="20" width="260" height="114" rx="6" fill="#d4a373"/>' +
      dots([[40, 30], [80, 30], [120, 30], [160, 30], [200, 30], [240, 30], [40, 125], [120, 125], [200, 125], [260, 125]], '#8d6e63') +
      '<rect y="200" width="300" height="16" fill="#8d6e63"/><rect x="20" y="216" width="12" height="54" fill="#6d4c41"/><rect x="268" y="216" width="12" height="54" fill="#6d4c41"/><rect y="270" width="300" height="30" fill="#6c757d"/>',
      [['🔨', 60, 60, 40], ['🔧', 128, 60, 40], ['🪛', 196, 62, 36], ['✂️', 252, 62, 34], ['⚙️', 90, 108, 30], ['🔩', 172, 108, 28], ['🧰', 70, 178, 44], ['🚗', 168, 182, 40], ['🪚', 242, 184, 36], ['📦', 150, 246, 32]]),
    scene('veggies', 'vegetable patch', '#caf0f8', '#d8f3dc', '<rect y="180" width="300" height="120" fill="#9c6644"/>' +
      [205, 235, 265, 292].map(function (y) { return '<rect y="' + y + '" width="300" height="5" fill="#7f5539"/>'; }).join('') +
      [10, 50, 90, 130, 170, 210, 250].map(function (x) { return '<rect x="' + x + '" y="140" width="14" height="44" rx="6" fill="#f6bd60"/>'; }).join(''),
      [['🐦', 80, 60, 32], ['☁️', 160, 50, 40], ['☀️', 255, 40, 46], ['🥕', 50, 212, 40], ['🥦', 120, 212, 40], ['🌽', 190, 206, 44], ['🍅', 255, 212, 36], ['🥬', 60, 266, 38], ['🥒', 140, 268, 36], ['🐰', 222, 262, 44]]),
    scene('building', 'building site', '#ffd6a5', '#fff3b0', '<rect y="230" width="300" height="70" fill="#bc6c25"/>' + bricks(150, 150, 130, 80) +
      // a tower crane: criss-cross mast, long arm, counterweight, cab and a hook
      '<rect x="52" y="62" width="18" height="168" fill="#ffb703"/><path d="M52 230 L70 210 L52 190 L70 170 L52 150 L70 130 L52 110 L70 90 L52 70" stroke="#e85d04" stroke-width="3" fill="none"/>' +
      '<rect x="14" y="50" width="222" height="12" fill="#ffb703"/>' + [40, 80, 120, 160, 200].map(function (x) { return '<path d="M' + x + ' 50 L' + (x + 20) + ' 62" stroke="#e85d04" stroke-width="2"/>'; }).join('') +
      '<rect x="14" y="62" width="30" height="20" fill="#6c757d"/><rect x="70" y="62" width="24" height="18" rx="3" fill="#4361ee"/><rect x="74" y="65" width="16" height="9" fill="#caf0f8"/>' +
      '<line x1="182" y1="62" x2="182" y2="108" stroke="#495057" stroke-width="2"/><path d="M178 108 h8 v6 a4 4 0 0 1 -8 0Z" fill="#495057"/>',
      [['🐦', 110, 36, 24], ['☀️', 262, 40, 40], ['☁️', 250, 104, 34], ['🧱', 182, 124, 26], ['🚧', 40, 266, 40], ['🚜', 132, 254, 52], ['⛑️', 248, 266, 36]]),
    scene('bees', 'bee garden', '#fff3b0', '#ffe8a3', '<path d="M0 220 Q150 200 300 222 V300 H0Z" fill="#80b918"/><line x1="20" y1="58" x2="140" y2="58" stroke="#7f5539" stroke-width="6"/>' +
      '<ellipse cx="80" cy="84" rx="26" ry="16" fill="#e9c46a"/><ellipse cx="80" cy="110" rx="36" ry="18" fill="#f4a261"/><ellipse cx="80" cy="138" rx="30" ry="16" fill="#e9c46a"/><circle cx="80" cy="140" r="6" fill="#5c4033"/>',
      [['🐝', 150, 60, 34], ['☀️', 260, 40, 40], ['🐝', 222, 110, 30], ['🐝', 136, 152, 28], ['🌻', 182, 200, 60], ['🌻', 260, 210, 54], ['🍯', 70, 250, 40], ['🌼', 130, 274, 30], ['🌷', 230, 276, 30]]),
    scene('camping', 'camping trip', '#023e8a', '#ff9e00', '<path d="M0 222 L70 122 L140 222Z" fill="#1d3557"/><path d="M100 222 L190 102 L280 222Z" fill="#457b9d"/><path d="M190 102 L172 126 L208 126Z" fill="#fff"/>' +
      '<rect y="220" width="300" height="80" fill="#386641"/>' + dots([[30, 30], [120, 60, 1.5], [200, 30]], '#fff'),
      [['⭐', 60, 44, 20], ['🌙', 250, 40, 40], ['🌲', 28, 200, 60], ['⛺', 110, 214, 70], ['🌲', 272, 195, 60], ['🔥', 200, 252, 40], ['🎒', 58, 274, 32], ['🦌', 250, 270, 36]]),
    scene('balloons', 'hot-air balloons', '#ffc8dd', '#bde0fe', '<path d="M0 232 Q150 205 300 236 V300 H0Z" fill="#90be6d"/>' + balloon(100, 112, 34, '#e63946', '#ffd166') + balloon(214, 76, 28, '#4361ee', '#4cc9f0'),
      [['☁️', 60, 50, 40], ['🕊️', 160, 38, 30], ['☀️', 270, 34, 34], ['🎈', 34, 160, 30], ['☁️', 236, 152, 36], ['🌳', 60, 250, 44], ['🏠', 160, 258, 40], ['🐑', 250, 268, 34]]),
    scene('diwali', 'Diwali night', '#10002b', '#5a189a', '<path d="M30 145 L150 85 L270 145Z" fill="#7b2cbf"/><rect x="40" y="145" width="220" height="105" fill="#3c096c"/>' +
      '<rect x="64" y="168" width="34" height="30" fill="#ffd60a"/><rect x="202" y="168" width="34" height="30" fill="#ffd60a"/><rect x="132" y="190" width="36" height="60" fill="#ffba08"/>' +
      '<rect y="250" width="300" height="50" fill="#7b2cbf"/>' + rangoli(150, 276),
      [['🎆', 60, 48, 50], ['🌙', 150, 34, 30], ['🎇', 240, 56, 50], ['🪔', 40, 264, 30], ['🪔', 100, 266, 26], ['🪔', 200, 266, 26], ['🪔', 260, 264, 30]]),
    scene('kites', 'kite festival', '#4cc9f0', '#caf0f8', kite(150, 96, 30, '#e63946') + kite(240, 64, 24, '#ffbe0b') + kite(90, 150, 22, '#8338ec') +
      '<rect x="0" y="210" width="90" height="90" fill="#f4a261"/><rect x="90" y="230" width="110" height="70" fill="#e9c46a"/><rect x="200" y="200" width="100" height="100" fill="#e76f51"/>' +
      '<rect x="20" y="236" width="20" height="20" fill="#fff"/><rect x="130" y="252" width="20" height="20" fill="#fff"/><rect x="240" y="232" width="20" height="20" fill="#fff"/>',
      [['🪁', 60, 60, 42], ['☀️', 272, 140, 34], ['☁️', 200, 152, 36], ['🐈', 92, 214, 32], ['🪴', 240, 184, 30], ['🐦', 160, 218, 24]]),
    scene('cricket', 'cricket match', '#a2d2ff', '#e0fbfc', stripes(84, 50, 20, '#4361ee', '#ffd166') + '<ellipse cx="150" cy="230" rx="170" ry="96" fill="#55a630"/>' +
      '<rect x="130" y="168" width="40" height="112" fill="#e9c46a"/><path d="M140 168 V190 M150 168 V190 M160 168 V190 M140 258 V280 M150 258 V280 M160 258 V280" stroke="#7f5539" stroke-width="3"/><circle cx="200" cy="200" r="6" fill="#c1121f"/>',
      [['☀️', 40, 36, 36], ['🐦', 150, 44, 24], ['☁️', 240, 40, 40], ['🎉', 150, 108, 26], ['🏏', 90, 230, 44], ['🧢', 50, 272, 30], ['🏆', 250, 250, 36]]),
    scene('village', 'village temple', '#ffbe0b', '#fff3b0', '<rect y="210" width="300" height="90" fill="#ccd5ae"/><path d="M0 286 Q150 270 300 290 V300 H0Z" fill="#48cae4"/>',
      [['🐦', 80, 50, 26], ['☀️', 250, 40, 44], ['🌴', 40, 158, 70], ['🛕', 150, 150, 80], ['🌴', 265, 165, 60], ['🐄', 70, 248, 46], ['🛺', 200, 248, 46], ['🌾', 130, 272, 30], ['🐐', 275, 266, 32]]),
    scene('meadow', 'butterfly meadow', '#bde0fe', '#fdffb6', '<path d="M0 182 Q150 162 300 186 V300 H0Z" fill="#80b918"/>',
      [['☁️', 110, 32, 30], ['🦋', 60, 64, 40], ['🦋', 250, 62, 38], ['🦋', 160, 104, 34], ['🐝', 232, 150, 30], ['🌼', 40, 222, 36], ['🌷', 110, 240, 40], ['🌸', 190, 226, 36], ['🌻', 260, 232, 46], ['🐛', 80, 280, 30], ['🐞', 170, 280, 28]]),
    scene('breakfast', 'breakfast table', '#fff8e1', '#ffe5b4', '<rect x="188" y="20" width="100" height="90" fill="#a2d2ff" stroke="#fff" stroke-width="6"/><rect y="190" width="300" height="110" fill="#e9c46a"/>' + stripes(190, 8, 20, '#e63946', '#ffffff'),
      [['🖼️', 60, 60, 44], ['☀️', 238, 62, 40], ['🥣', 60, 168, 40], ['🍌', 130, 170, 40], ['🥛', 200, 166, 40], ['🍞', 262, 170, 40], ['🍳', 70, 250, 40], ['🧃', 140, 250, 36], ['🍓', 200, 256, 32], ['🥄', 256, 256, 30]]),
    scene('toyroom', 'toy room', '#e0c3fc', '#cdb4db', '<rect x="20" y="100" width="260" height="8" fill="#9c6644"/><rect y="230" width="300" height="70" fill="#ffafcc"/><ellipse cx="150" cy="268" rx="120" ry="22" fill="#ffc8dd"/>',
      [['🎲', 50, 80, 30], ['🧩', 110, 80, 32], ['📚', 170, 78, 34], ['🪀', 240, 80, 30], ['🪁', 242, 152, 40], ['🚂', 70, 196, 44], ['🧸', 160, 198, 52], ['🎈', 262, 206, 36], ['🚗', 60, 266, 36], ['⚽', 150, 272, 30], ['🦖', 250, 266, 40]]),
    scene('lake', 'mountain lake', '#a8dadc', '#f1faee', '<path d="M0 165 L80 80 L160 165Z" fill="#6c757d"/><path d="M110 165 L200 70 L300 165Z" fill="#495057"/><path d="M200 70 L183 92 L217 92Z" fill="#fff"/>' +
      '<rect y="160" width="300" height="100" fill="#457b9d"/><rect y="258" width="300" height="42" fill="#606c38"/>',
      [['🦅', 70, 50, 32], ['☀️', 255, 36, 40], ['🌲', 28, 168, 50], ['🌲', 272, 162, 50], ['🚣', 130, 194, 46], ['🦢', 222, 212, 40], ['🐟', 90, 236, 28], ['🎣', 50, 276, 32], ['🐸', 200, 280, 28]]),
    scene('treehouse', 'treehouse', '#caf0f8', '#d8f3dc', '<rect x="130" y="130" width="40" height="112" fill="#7f5539"/><circle cx="110" cy="100" r="60" fill="#52b788"/><circle cx="190" cy="96" r="62" fill="#40916c"/>' +
      '<path d="M96 100 L150 70 L204 100Z" fill="#9b2226"/><rect x="104" y="100" width="92" height="50" fill="#e76f51"/><rect x="138" y="114" width="22" height="36" fill="#6d4c41"/>' +
      '<path d="M190 150 V240 M206 150 V240" stroke="#bc6c25" stroke-width="4"/>' + [168, 186, 204, 222].map(function (y) { return '<line x1="190" y1="' + y + '" x2="206" y2="' + y + '" stroke="#bc6c25" stroke-width="3"/>'; }).join('') +
      '<rect y="240" width="300" height="60" fill="#80b918"/>',
      [['☀️', 36, 32, 32], ['🐦', 262, 40, 28], ['🦉', 52, 140, 36], ['🍎', 250, 116, 30], ['🐿️', 252, 214, 40], ['🐕', 60, 266, 40], ['🌼', 262, 276, 28]]),
    scene('icecream', 'ice cream shop', '#bde0fe', '#ffe5ec', stripes(18, 42, 30, '#ff5d8f', '#ffffff') + '<rect x="84" y="72" width="132" height="40" rx="8" fill="#fff" stroke="#ff5d8f" stroke-width="4"/>' +
      '<text x="150" y="92" font-size="18" font-weight="bold" fill="#ff5d8f" text-anchor="middle" dominant-baseline="central">ICE CREAM</text><rect y="186" width="300" height="114" fill="#ffafcc"/><rect y="180" width="300" height="10" fill="#fb6f92"/>',
      [['🍓', 270, 94, 26], ['🍦', 60, 148, 44], ['🍨', 240, 148, 44], ['🍧', 60, 240, 40], ['🍫', 150, 242, 36], ['🍒', 240, 240, 36]])
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
  let speakText = '', timers = [], lastPic = null, current = null;
  const stage = $('pzStage'), tray = $('pzTray'), feed = $('pzFeedback'), ctrl = $('pzControls'),
    hint = $('pzHint'), title = $('pzTitle'), screen = $('puzzle');

  function say(t) { speakText = t; P().speak(t); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function rng(tag) { return window.makeRNG('pz-' + tag + '-' + Date.now() + '-' + Math.random()); }
  function pickPic(R, list) {
    list = list || PICS;
    let i = R.int(0, list.length - 1);
    if (list[i] === lastPic) i = (i + 1) % list.length; // never the same picture twice in a row
    lastPic = list[i];
    return list[i];
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
    const d = gridFor(lvl), g = geo(d[0], d[1]), n = g.cols * g.rows, pic = pickPic(R, PICS.concat(SPIN_PICS));
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
      hint.textContent = 'Make your grid look just like the example!';
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
      say('Pick a colour, then tap the squares to copy the example. Tap again to clear.');
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
