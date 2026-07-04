/* Question generators.
   Every generator returns a normalized question object:
   {
     module, prompt, speak,
     display: { kind:'emojis'|'huge'|'text'|'color'|'none', value:'' },
     options: [ { label, emoji, correct } ],   // tap to answer
   }
   R is a seeded RNG (see rng.js). C is the CONTENT bank.
*/
(function (global) {
  const C = global.CONTENT;

  // ---- small helpers ----
  const repeatEmoji = (e, n) => Array.from({ length: n }, () => e).join(' ');

  // Build options from a correct value + distractor pool of {label, emoji}
  function buildOptions(R, correct, pool, n = 4) {
    const key = (o) => (o.label || '') + '|' + (o.emoji || '');
    const ckey = key(correct);
    const distract = R.sample(pool.filter(p => key(p) !== ckey), n - 1);
    return R.shuffle([{ ...correct, correct: true }, ...distract.map(d => ({ ...d, correct: false }))]);
  }
  // Numeric options around the answer
  function numberOptions(R, answer, lo, hi) {
    const set = new Set([answer]);
    let guard = 0;
    while (set.size < 4 && guard++ < 50) {
      const v = R.int(Math.max(lo, answer - 4), Math.min(hi, answer + 4));
      set.add(v);
    }
    while (set.size < 4) set.add(R.int(lo, hi)); // fallback
    return R.shuffle([...set]).map(v => ({ label: String(v), correct: v === answer }));
  }

  // Difficulty level: 1 = PP1, 2 = PP2, 3 = PP3. Set by buildSession().
  let LEVEL = 1;
  const at = (arr) => arr[LEVEL - 1]; // pick this level's value from a [pp1, pp2, pp3] array

  /* ================= NUMBERS ================= */
  const NUM = {
    count(R) {
      const max = at([10, 12, 15]);
      const item = R.pick([...C.fruits, ...C.animals]);
      const n = R.int(1, max);
      return {
        module: 'numbers',
        prompt: `How many ${item.name}?`,
        speak: `How many ${item.name} can you count?`,
        display: { kind: 'emojis', value: repeatEmoji(item.e, n) },
        options: numberOptions(R, n, 1, max + 2),
      };
    },
    bigger(R) {
      const max = at([9, 20, 50]);
      let a = R.int(1, max), b = R.int(1, max);
      while (a === b) b = R.int(1, max);
      const ans = Math.max(a, b);
      return {
        module: 'numbers',
        prompt: 'Which number is BIGGER?',
        speak: `Which number is bigger, ${a} or ${b}?`,
        display: { kind: 'none', value: '' },
        options: R.shuffle([a, b]).map(v => ({ label: String(v), correct: v === ans })),
      };
    },
    smaller(R) {
      const max = at([9, 20, 50]);
      let a = R.int(1, max), b = R.int(1, max);
      while (a === b) b = R.int(1, max);
      const ans = Math.min(a, b);
      return {
        module: 'numbers',
        prompt: 'Which number is SMALLER?',
        speak: `Which number is smaller, ${a} or ${b}?`,
        display: { kind: 'none', value: '' },
        options: R.shuffle([a, b]).map(v => ({ label: String(v), correct: v === ans })),
      };
    },
    next(R) {
      const max = at([10, 15, 20]);
      const start = R.int(1, max - 3);
      const seq = [start, start + 1, start + 2];
      const ans = start + 3;
      return {
        module: 'numbers',
        prompt: 'What number comes NEXT?',
        speak: `${seq.join(', ')} ... what comes next?`,
        display: { kind: 'huge', value: seq.join('  ') + '  ?' },
        options: numberOptions(R, ans, 1, max + 2),
      };
    },
    missing(R) {
      const max = at([10, 15, 20]);
      const start = R.int(1, max - 3);
      const seq = [start, start + 1, start + 2, start + 3];
      const hideIdx = R.int(1, 2);
      const ans = seq[hideIdx];
      const shown = seq.map((v, i) => (i === hideIdx ? '?' : v)).join('  ');
      return {
        module: 'numbers',
        prompt: 'Which number is MISSING?',
        speak: `Find the missing number. ${seq.map((v, i) => (i === hideIdx ? 'blank' : v)).join(', ')}`,
        display: { kind: 'huge', value: shown },
        options: numberOptions(R, ans, 1, max + 2),
      };
    },
    addSmall(R) {
      const amax = at([5, 9, 10]), bmax = at([4, 9, 10]);
      const a = R.int(1, amax), b = R.int(1, bmax);
      const ans = a + b;
      return {
        module: 'numbers',
        prompt: `Add them up!`,
        speak: `What is ${a} plus ${b}?`,
        display: { kind: 'emojis', value: repeatEmoji('🍎', a) + '  ➕  ' + repeatEmoji('🍏', b) },
        options: numberOptions(R, ans, 1, amax + bmax + 2),
      };
    },
    subtract(R) { // PP2+ : take away
      const amax = at([8, 12, 18]);
      const a = R.int(2, amax);
      const b = R.int(1, a - 1);
      const ans = a - b;
      const display = '<div class="add-objects">' + repeatEmoji('🍎', a) + '</div>'
        + '<div class="add-sentence">' + a + ' <b>−</b> ' + b + ' <b>=</b> ?</div>';
      return {
        module: 'numbers',
        prompt: 'Take away!',
        speak: `${a} take away ${b}. How many are left?`,
        display: { kind: 'emojis', value: display },
        options: numberOptions(R, ans, 0, a + 2),
      };
    },
    all(R) {
      const pool = [this.count, this.count, this.bigger, this.smaller, this.next, this.missing, this.addSmall];
      if (LEVEL >= 2) pool.push(this.subtract, this.addSmall);
      return R.pick(pool).call(this, R);
    },
  };

  /* ================= ALPHABETS ================= */
  const ABC = {
    startsWith(R) {
      const item = R.pick(C.abcThings);
      const pool = C.abcThings.filter(t => t.l !== item.l).map(t => ({ label: t.l }));
      return {
        module: 'alphabets',
        prompt: `Which letter does it start with?`,
        speak: `${item.word} starts with which letter?`,
        display: { kind: 'emojis', value: item.e + '  ' + item.word },
        options: buildOptions(R, { label: item.l }, pool),
      };
    },
    findLetter(R) {
      const item = R.pick(C.abcThings);
      const pool = C.abcThings.filter(t => t.l !== item.l).map(t => ({ label: t.l, emoji: t.e }));
      return {
        module: 'alphabets',
        prompt: `Find the letter ${item.l}`,
        speak: `Can you find the big letter ${item.l}?`,
        display: { kind: 'none', value: '' },
        options: buildOptions(R, { label: item.l, emoji: '' }, pool).map(o => ({ label: o.label, correct: o.correct })),
      };
    },
    whichPicture(R) {
      const item = R.pick(C.abcThings);
      const pool = C.abcThings.filter(t => t.l !== item.l).map(t => ({ label: t.word, emoji: t.e }));
      return {
        module: 'alphabets',
        prompt: `Which one starts with "${item.l}"?`,
        speak: `Which picture starts with the letter ${item.l}?`,
        display: { kind: 'huge', value: item.l },
        options: buildOptions(R, { label: item.word, emoji: item.e }, pool),
      };
    },
    nextLetter(R) {
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const i = R.int(0, 23);
      const cur = A[i], ans = A[i + 1];
      const pool = A.split('').filter(x => x !== ans && x !== cur).map(x => ({ label: x }));
      return {
        module: 'alphabets',
        prompt: `What comes after ${cur}?`,
        speak: `Which letter comes after ${cur}?`,
        display: { kind: 'huge', value: cur + '  ?' },
        options: buildOptions(R, { label: ans }, pool),
      };
    },
    caseMatch(R) { // PP2+ : match big letter to small letter
      const item = R.pick(C.abcThings);
      const showUpper = R.bool();
      const shown = showUpper ? item.l : item.l.toLowerCase();
      const ans = showUpper ? item.l.toLowerCase() : item.l;
      const pool = C.abcThings.filter(t => t.l !== item.l).map(t => ({ label: showUpper ? t.l.toLowerCase() : t.l }));
      return {
        module: 'alphabets',
        prompt: showUpper ? `Find the small letter for ${shown}` : `Find the BIG letter for ${shown}`,
        speak: `Find the ${showUpper ? 'small' : 'big'} letter for ${item.l}`,
        display: { kind: 'huge', value: shown },
        options: buildOptions(R, { label: ans }, pool),
      };
    },
    missingLetter(R) { // PP2+ : A B ? D
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const i = R.int(0, 23);
      const seq = [A[i], A[i + 1], A[i + 2]];
      const ans = seq[1];
      const pool = A.split('').filter(x => x !== ans).map(x => ({ label: x }));
      return {
        module: 'alphabets',
        prompt: `Which letter is MISSING?  ${seq[0]} → ❓ → ${seq[2]}`,
        speak: `${seq[0]}, blank, ${seq[2]}. Which letter is missing?`,
        display: { kind: 'huge', value: seq[0] + '  ❓  ' + seq[2] },
        options: buildOptions(R, { label: ans }, pool),
      };
    },
    all(R) {
      const pool = [this.startsWith, this.whichPicture, this.whichPicture, this.findLetter, this.nextLetter];
      if (LEVEL >= 2) pool.push(this.caseMatch, this.missingLetter);
      return R.pick(pool).call(this, R);
    },
  };

  /* ================= FUN QUIZ (world knowledge / MCQ) ================= */
  const QUIZ = {
    animalSound(R) {
      const a = R.pick(C.animals);
      const pool = C.animals.filter(x => x.sound !== a.sound).map(x => ({ label: x.sound }));
      return {
        module: 'quiz',
        prompt: `What sound does it make?`,
        speak: `What sound does the ${a.name} make?`,
        display: { kind: 'huge', value: a.e },
        options: buildOptions(R, { label: a.sound }, pool),
      };
    },
    whoSays(R) {
      const a = R.pick(C.animals);
      const pool = C.animals.filter(x => x.name !== a.name).map(x => ({ label: x.name, emoji: x.e }));
      return {
        module: 'quiz',
        prompt: `Who says "${a.sound}"?`,
        speak: `Who says ${a.sound}?`,
        display: { kind: 'none', value: '' },
        options: buildOptions(R, { label: a.name, emoji: a.e }, pool),
      };
    },
    oddCategory(R) {
      // pick a target category and 3 from it + 1 intruder
      const cats = [
        { name: 'fruit', items: C.fruits }, { name: 'animal', items: C.animals }, { name: 'vehicle', items: C.vehicles },
      ];
      const target = R.pick(cats);
      const others = cats.filter(c => c.name !== target.name);
      const intruderCat = R.pick(others);
      const same = R.sample(target.items, 3).map(x => ({ label: x.name, emoji: x.e, correct: false }));
      const intruder = R.pick(intruderCat.items);
      const opts = R.shuffle([...same, { label: intruder.name, emoji: intruder.e, correct: true }]);
      return {
        module: 'quiz',
        prompt: `Which one is NOT a ${target.name}?`,
        speak: `Three of these are a ${target.name}. Which one is not?`,
        display: { kind: 'none', value: '' },
        options: opts,
      };
    },
    pickCategory(R) {
      const cats = [
        { name: 'fruit', items: C.fruits }, { name: 'animal', items: C.animals }, { name: 'vehicle', items: C.vehicles },
      ];
      const target = R.pick(cats);
      const others = cats.filter(c => c.name !== target.name);
      const right = R.pick(target.items);
      const wrong = R.sample(others.flatMap(c => c.items), 3).map(x => ({ label: x.name, emoji: x.e, correct: false }));
      const opts = R.shuffle([{ label: right.name, emoji: right.e, correct: true }, ...wrong]);
      return {
        module: 'quiz',
        prompt: `Which one is a ${target.name}?`,
        speak: `Which one of these is a ${target.name}?`,
        display: { kind: 'none', value: '' },
        options: opts,
      };
    },
    colorName(R) {
      const col = R.pick(C.colors);
      const pool = C.colors.filter(c => c.name !== col.name).map(c => ({ label: c.name }));
      return {
        module: 'quiz',
        prompt: `What color is this?`,
        speak: `What color is this?`,
        display: { kind: 'color', value: col.hex },
        options: buildOptions(R, { label: col.name }, pool),
      };
    },
    situation(R) {
      const s = R.pick(C.situations);
      const wrong = R.sample(s.wrong, 3).map(w => ({ label: w.name, emoji: w.e, correct: false }));
      const opts = R.shuffle([{ label: s.right.name, emoji: s.right.e, correct: true }, ...wrong]);
      return {
        module: 'quiz',
        prompt: s.q,
        speak: s.q,
        display: { kind: 'none', value: '' },
        options: opts,
      };
    },
    opposite(R) { // PP2+ : opposites
      const pairs = [['big', 'small'], ['hot', 'cold'], ['up', 'down'], ['day', 'night'], ['happy', 'sad'], ['fast', 'slow'], ['open', 'closed'], ['full', 'empty'], ['tall', 'short'], ['wet', 'dry']];
      const p = R.pick(pairs);
      const showFirst = R.bool();
      const word = showFirst ? p[0] : p[1];
      const ans = showFirst ? p[1] : p[0];
      const pool = pairs.flat().filter(w => w !== ans && w !== word).map(w => ({ label: w }));
      return {
        module: 'quiz',
        prompt: `What is the OPPOSITE of "${word}"?`,
        speak: `What is the opposite of ${word}?`,
        display: { kind: 'none', value: '' },
        options: buildOptions(R, { label: ans }, pool),
      };
    },
    all(R) {
      const pool = [this.animalSound, this.whoSays, this.oddCategory, this.pickCategory, this.colorName, this.situation, this.situation];
      if (LEVEL >= 2) pool.push(this.opposite, this.oddCategory);
      return R.pick(pool).call(this, R);
    },
  };

  /* ================= THINK & CODE (logic basics) ================= */
  const LOGIC = {
    pattern(R) {
      const set = R.pick(C.patternSets);
      const reps = R.int(2, 2 + LEVEL); // longer patterns for higher classes
      const seq = [];
      for (let i = 0; i < reps; i++) seq.push(...set);
      const ans = set[seq.length % set.length];
      const pool = [...new Set(C.patternSets.flat())].filter(e => e !== ans).map(e => ({ label: '', emoji: e }));
      return {
        module: 'logic',
        prompt: `What comes NEXT in the pattern?`,
        speak: `Look at the pattern. What comes next?`,
        display: { kind: 'emojis', value: seq.join(' ') + '  ❓' },
        options: buildOptions(R, { label: '', emoji: ans }, pool),
      };
    },
    oddOneOut(R) {
      const cats = [C.fruits, C.animals, C.vehicles, C.shapes];
      const cat = R.pick(cats);
      const same = R.sample(cat, 3);
      const otherCats = cats.filter(c => c !== cat);
      const intruder = R.pick(R.pick(otherCats));
      const opts = R.shuffle([
        ...same.map(x => ({ label: '', emoji: x.e, correct: false })),
        { label: '', emoji: intruder.e, correct: true },
      ]);
      return {
        module: 'logic',
        prompt: `Which one is the ODD one out?`,
        speak: `Three of these go together. Which one is different?`,
        display: { kind: 'none', value: '' },
        options: opts,
      };
    },
    sizeOrder(R) {
      const big = R.bool();
      const e = R.pick(['🐘', '🍎', '⭐', '🟦', '🐱']);
      const sizes = [
        { label: 'small', emoji: `<span style="font-size:.5em">${e}</span>`, v: 1 },
        { label: 'medium', emoji: `<span style="font-size:.8em">${e}</span>`, v: 2 },
        { label: 'big', emoji: `<span style="font-size:1.3em">${e}</span>`, v: 3 },
      ];
      const ans = big ? 3 : 1;
      return {
        module: 'logic',
        prompt: big ? 'Tap the BIGGEST one' : 'Tap the SMALLEST one',
        speak: big ? 'Which one is the biggest?' : 'Which one is the smallest?',
        display: { kind: 'none', value: '' },
        options: R.shuffle(sizes).map(s => ({ label: '', emojiHTML: s.emoji, correct: s.v === ans })),
      };
    },
    sequenceOrder(R) {
      // "what happens FIRST?" daily-life ordering
      const stories = [
        { q: 'To eat a banana, what do you do FIRST?', right: { e: '🍌', name: 'peel it' }, wrong: [{ e: '🤤', name: 'eat it' }, { e: '🗑️', name: 'throw skin' }] },
        { q: 'To go outside in rain, what do you do FIRST?', right: { e: '☂️', name: 'take umbrella' }, wrong: [{ e: '🏃', name: 'run out' }, { e: '💦', name: 'get wet' }] },
        { q: 'Before you sleep at night, what do you do?', right: { e: '🪥', name: 'brush teeth' }, wrong: [{ e: '🍫', name: 'eat candy' }, { e: '📺', name: 'watch TV' }] },
        { q: 'To draw a picture, what do you pick up FIRST?', right: { e: '🖍️', name: 'crayon' }, wrong: [{ e: '🍴', name: 'fork' }, { e: '🧦', name: 'sock' }] },
        { q: 'A seed grows into a plant. What comes FIRST?', right: { e: '🌱', name: 'small sprout' }, wrong: [{ e: '🌳', name: 'big tree' }, { e: '🍎', name: 'fruit' }] },
      ];
      const s = R.pick(stories);
      const opts = R.shuffle([
        { label: s.right.name, emoji: s.right.e, correct: true },
        ...s.wrong.map(w => ({ label: w.name, emoji: w.e, correct: false })),
      ]);
      return { module: 'logic', prompt: s.q, speak: s.q, display: { kind: 'none', value: '' }, options: opts };
    },
    sorting(R) {
      // counting-based logic: which group has MORE / FEWER
      const e = R.pick(['🍎', '⭐', '🐟', '🎈']);
      let a = R.int(1, 6), b = R.int(1, 6);
      while (a === b) b = R.int(1, 6);
      const more = R.bool();
      const ans = more ? (a > b ? 'A' : 'B') : (a < b ? 'A' : 'B');
      return {
        module: 'logic',
        prompt: more ? 'Which box has MORE?' : 'Which box has FEWER?',
        speak: more ? 'Which box has more?' : 'Which box has fewer?',
        display: { kind: 'emojis', value: `A: ${repeatEmoji(e, a)}<br>B: ${repeatEmoji(e, b)}` },
        options: R.shuffle([{ label: 'A', correct: ans === 'A' }, { label: 'B', correct: ans === 'B' }]),
      };
    },
    all(R) { return R.pick([this.pattern, this.pattern, this.oddOneOut, this.sizeOrder, this.sequenceOrder, this.sorting]).call(this, R); },
  };

  /* ================= ADD UP (basic addition) ================= */
  const ADD = {
    pool: [
      { e: '🍎', n: 'apples' }, { e: '⭐', n: 'stars' }, { e: '🎈', n: 'balloons' },
      { e: '🍓', n: 'strawberries' }, { e: '🐥', n: 'chicks' }, { e: '🌸', n: 'flowers' },
      { e: '🍪', n: 'cookies' }, { e: '🐠', n: 'fish' }, { e: '🧁', n: 'cupcakes' }, { e: '🚗', n: 'cars' },
    ],
    // Concrete: show two groups of the SAME object so she can count them all.
    concrete(R) {
      const max = at([5, 8, 10]);
      const a = R.int(1, max), b = R.int(1, max);
      const ans = a + b;
      const it = R.pick(this.pool);
      const display =
        '<div class="add-objects">' + repeatEmoji(it.e, a) +
        ' <span class="plus">➕</span> ' + repeatEmoji(it.e, b) + '</div>' +
        '<div class="add-sentence">' + a + ' <b>+</b> ' + b + ' <b>=</b> ?</div>';
      return {
        module: 'addition',
        prompt: 'How many in all?',
        speak: `Count them all! ${a} ${it.n} plus ${b} ${it.n}. How many ${it.n} all together?`,
        display: { kind: 'emojis', value: display },
        options: numberOptions(R, ans, 0, max * 2 + 2),
      };
    },
    // Simple word problem with countable pictures.
    story(R) {
      const ma = at([4, 6, 8]), mb = at([3, 5, 7]);
      const a = R.int(1, ma), b = R.int(1, mb);
      const ans = a + b;
      const it = R.pick(this.pool);
      const display =
        '<div class="add-objects">' + repeatEmoji(it.e, a) +
        ' <span class="plus">➕</span> ' + repeatEmoji(it.e, b) + '</div>' +
        '<div class="add-sentence">' + a + ' <b>+</b> ' + b + ' <b>=</b> ?</div>';
      const q = `You have ${a} ${it.n}. You get ${b} more. How many now?`;
      return {
        module: 'addition',
        prompt: q,
        speak: q,
        display: { kind: 'emojis', value: display },
        options: numberOptions(R, ans, 0, ma + mb + 2),
      };
    },
    // "Add one more" — the easiest, builds the +1 idea.
    plusOne(R) {
      const a = R.int(1, at([8, 14, 19]));
      const ans = a + 1;
      const it = R.pick(this.pool);
      const display =
        '<div class="add-objects">' + repeatEmoji(it.e, a) +
        ' <span class="plus">➕</span> ' + it.e + '</div>' +
        '<div class="add-sentence">' + a + ' <b>+</b> 1 <b>=</b> ?</div>';
      return {
        module: 'addition',
        prompt: 'One more! How many now?',
        speak: `${a} ${it.n}, and one more. How many now?`,
        display: { kind: 'emojis', value: display },
        options: numberOptions(R, ans, 0, a + 3),
      };
    },
    // PP2+ : take away (subtraction).
    takeAway(R) {
      const a = R.int(2, at([8, 12, 18]));
      const b = R.int(1, a - 1);
      const ans = a - b;
      const it = R.pick(this.pool);
      const display =
        '<div class="add-objects">' + repeatEmoji(it.e, a) + '</div>' +
        '<div class="add-sentence">' + a + ' <b>−</b> ' + b + ' <b>=</b> ?</div>';
      return {
        module: 'addition',
        prompt: 'Take away! How many are left?',
        speak: `You have ${a} ${it.n}. Take away ${b}. How many are left?`,
        display: { kind: 'emojis', value: display },
        options: numberOptions(R, ans, 0, a + 2),
      };
    },
    all(R) {
      const pool = [this.concrete, this.concrete, this.story, this.plusOne];
      if (LEVEL >= 2) pool.push(this.takeAway, this.concrete);
      return R.pick(pool).call(this, R);
    },
  };

  /* ================= DAYS & MONTHS (calendar) ================= */
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const shortName = (s) => s.slice(0, 3);
  function nameOptions(R, ans, all) {
    return buildOptions(R, { label: ans }, all.filter((x) => x !== ans).map((x) => ({ label: x })));
  }
  const CAL = {
    nextDay(R) {
      const i = R.int(0, 6); const ans = DAYS[(i + 1) % 7];
      return { module: 'calendar', prompt: `What day comes AFTER ${DAYS[i]}?`, speak: `What day comes after ${DAYS[i]}?`, display: { kind: 'huge', value: '📅' }, options: nameOptions(R, ans, DAYS) };
    },
    prevDay(R) {
      const i = R.int(0, 6); const ans = DAYS[(i + 6) % 7];
      return { module: 'calendar', prompt: `What day comes BEFORE ${DAYS[i]}?`, speak: `What day comes before ${DAYS[i]}?`, display: { kind: 'huge', value: '📅' }, options: nameOptions(R, ans, DAYS) };
    },
    missingDay(R) {
      const i = R.int(0, 4); const seq = [DAYS[i], DAYS[i + 1], DAYS[i + 2]]; const ans = seq[1];
      return { module: 'calendar', prompt: `Which day is MISSING?  ${shortName(seq[0])} → ❓ → ${shortName(seq[2])}`, speak: `${seq[0]}, blank, ${seq[2]}. Which day is missing?`, display: { kind: 'huge', value: '📅' }, options: nameOptions(R, ans, DAYS) };
    },
    firstDay(R) {
      return { module: 'calendar', prompt: 'Which day comes FIRST in the week?', speak: 'Which day comes first in the week?', display: { kind: 'huge', value: '📅' }, options: nameOptions(R, 'Monday', DAYS) };
    },
    totalDays(R) {
      return { module: 'calendar', prompt: 'How many days are in a WEEK?', speak: 'How many days are there in one week?', display: { kind: 'huge', value: '📅' }, options: numberOptions(R, 7, 4, 12) };
    },
    nextMonth(R) {
      const i = R.int(0, 11); const ans = MONTHS[(i + 1) % 12];
      return { module: 'calendar', prompt: `What month comes AFTER ${MONTHS[i]}?`, speak: `What month comes after ${MONTHS[i]}?`, display: { kind: 'huge', value: '🗓️' }, options: nameOptions(R, ans, MONTHS) };
    },
    prevMonth(R) {
      const i = R.int(0, 11); const ans = MONTHS[(i + 11) % 12];
      return { module: 'calendar', prompt: `What month comes BEFORE ${MONTHS[i]}?`, speak: `What month comes before ${MONTHS[i]}?`, display: { kind: 'huge', value: '🗓️' }, options: nameOptions(R, ans, MONTHS) };
    },
    missingMonth(R) {
      const i = R.int(0, 9); const seq = [MONTHS[i], MONTHS[i + 1], MONTHS[i + 2]]; const ans = seq[1];
      return { module: 'calendar', prompt: `Which month is MISSING?  ${shortName(seq[0])} → ❓ → ${shortName(seq[2])}`, speak: `${seq[0]}, blank, ${seq[2]}. Which month is missing?`, display: { kind: 'huge', value: '🗓️' }, options: nameOptions(R, ans, MONTHS) };
    },
    firstMonth(R) {
      return { module: 'calendar', prompt: 'Which month comes FIRST in the year?', speak: 'Which month comes first in the year?', display: { kind: 'huge', value: '🗓️' }, options: nameOptions(R, 'January', MONTHS) };
    },
    totalMonths(R) {
      return { module: 'calendar', prompt: 'How many months are in a YEAR?', speak: 'How many months are there in one year?', display: { kind: 'huge', value: '🗓️' }, options: numberOptions(R, 12, 9, 15) };
    },
    all(R) { return R.pick([this.nextDay, this.prevDay, this.missingDay, this.firstDay, this.totalDays, this.nextMonth, this.prevMonth, this.missingMonth, this.firstMonth, this.totalMonths]).call(this, R); },
  };

  /* ================= CLOCK (tell the time) ================= */
  const CLOCK = {
    read(R) {
      const h = R.int(1, 12);
      const pool = [];
      for (let x = 1; x <= 12; x++) if (x !== h) pool.push({ label: x + " o'clock" });
      return {
        module: 'clock',
        prompt: 'What time is it?',
        speak: 'What time is it? Look at the short hand.',
        display: { kind: 'clock', value: { h: h, m: 0 } },
        options: buildOptions(R, { label: h + " o'clock" }, pool),
      };
    },
    readHalf(R) { // PP2+ : half past
      const h = R.int(1, 12);
      const pool = [];
      for (let x = 1; x <= 12; x++) if (x !== h) pool.push({ label: 'half past ' + x });
      return {
        module: 'clock',
        prompt: 'What time is it?',
        speak: 'What time is it? The big hand is on the 6, so it is half past.',
        display: { kind: 'clock', value: { h: h, m: 30 } },
        options: buildOptions(R, { label: 'half past ' + h }, pool),
      };
    },
    timeOfDay(R) {
      const items = [
        { q: 'When do you eat breakfast?', a: 'Morning' },
        { q: 'When do you wake up?', a: 'Morning' },
        { q: 'When do you go to school?', a: 'Morning' },
        { q: 'When do you eat lunch?', a: 'Afternoon' },
        { q: 'When is the sun high up?', a: 'Afternoon' },
        { q: 'When do you sleep in bed?', a: 'Night' },
        { q: 'When do you see the moon and stars?', a: 'Night' },
      ];
      const it = R.pick(items);
      const opts = [{ label: 'Morning', emoji: '🌅' }, { label: 'Afternoon', emoji: '☀️' }, { label: 'Night', emoji: '🌙' }];
      return {
        module: 'clock',
        prompt: it.q,
        speak: it.q,
        display: { kind: 'none', value: '' },
        options: R.shuffle(opts.map((o) => ({ label: o.label, emoji: o.emoji, correct: o.label === it.a }))),
      };
    },
    all(R) {
      const pool = [this.read, this.read, this.timeOfDay];
      if (LEVEL >= 2) pool.push(this.readHalf, this.read);
      return R.pick(pool).call(this, R);
    },
  };

  // Build a session of N questions for a given module key.
  function buildSession(moduleKey, R, n, level) {
    LEVEL = Math.max(1, Math.min(3, level || 1));
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < n * 12) {
      const q = makeOne(moduleKey, R);
      // avoid back-to-back identical prompts
      if (out.length && out[out.length - 1].prompt === q.prompt && out[out.length - 1].display.value === q.display.value) continue;
      out.push(q);
    }
    return out;
  }

  function makeOne(moduleKey, R) {
    switch (moduleKey) {
      case 'numbers': return NUM.all(R);
      case 'alphabets': return ABC.all(R);
      case 'quiz': return QUIZ.all(R);
      case 'logic': return LOGIC.all(R);
      case 'addition': return ADD.all(R);
      case 'calendar': return CAL.all(R);
      case 'clock': return CLOCK.all(R);
      case 'daily': {
        const m = R.pick([NUM, ABC, QUIZ, LOGIC, ADD, CAL, CLOCK]);
        return m.all(R);
      }
      default: return NUM.all(R);
    }
  }

  global.GENERATORS = { buildSession };
})(window);
