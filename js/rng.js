/* Seeded random so "Daily Play" is the same all day but changes every day.
   Free-play modes use a time-based seed for endless variety. */
(function (global) {
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Returns a random helper object seeded by a string.
  function makeRNG(seedStr) {
    const seed = xmur3(String(seedStr))();
    const rand = mulberry32(seed);
    const R = {
      next: rand,
      int: (min, max) => Math.floor(rand() * (max - min + 1)) + min, // inclusive
      pick: (arr) => arr[Math.floor(rand() * arr.length)],
      shuffle: (arr) => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      },
      // pick n unique items from arr
      sample: (arr, n) => R.shuffle(arr).slice(0, n),
      bool: () => rand() < 0.5,
    };
    return R;
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  global.makeRNG = makeRNG;
  global.todayKey = todayKey;
})(window);
