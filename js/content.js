/* Content banks for a 5-year-old (KG1). Emoji-first so a pre-reader can play,
   with text + voice support for early reading. */
window.CONTENT = {
  animals: [
    { e: '🐄', name: 'cow', sound: 'moo' },
    { e: '🐶', name: 'dog', sound: 'woof' },
    { e: '🐱', name: 'cat', sound: 'meow' },
    { e: '🦁', name: 'lion', sound: 'roar' },
    { e: '🐸', name: 'frog', sound: 'ribbit' },
    { e: '🐝', name: 'bee', sound: 'buzz' },
    { e: '🐑', name: 'sheep', sound: 'baa' },
    { e: '🦆', name: 'duck', sound: 'quack' },
    { e: '🐴', name: 'horse', sound: 'neigh' },
    { e: '🐷', name: 'pig', sound: 'oink' },
    { e: '🐘', name: 'elephant', sound: 'pawoo' },
    { e: '🐔', name: 'hen', sound: 'cluck' },
    { e: '🐮', name: 'calf', sound: 'moo' },
    { e: '🦉', name: 'owl', sound: 'hoot' },
  ],
  fruits: [
    { e: '🍎', name: 'apple' }, { e: '🍌', name: 'banana' }, { e: '🍇', name: 'grapes' },
    { e: '🍊', name: 'orange' }, { e: '🍓', name: 'strawberry' }, { e: '🍉', name: 'watermelon' },
    { e: '🥭', name: 'mango' }, { e: '🍒', name: 'cherry' }, { e: '🍍', name: 'pineapple' },
    { e: '🍐', name: 'pear' }, { e: '🍑', name: 'peach' }, { e: '🥝', name: 'kiwi' },
  ],
  vegetables: [
    { e: '🥕', name: 'carrot' }, { e: '🥦', name: 'broccoli' }, { e: '🌽', name: 'corn' },
    { e: '🍅', name: 'tomato' }, { e: '🥔', name: 'potato' }, { e: '🧅', name: 'onion' },
  ],
  vehicles: [
    { e: '🚗', name: 'car' }, { e: '🚌', name: 'bus' }, { e: '🚂', name: 'train' },
    { e: '✈️', name: 'plane' }, { e: '🚀', name: 'rocket' }, { e: '🚲', name: 'bicycle' },
    { e: '🚓', name: 'police car' }, { e: '🚑', name: 'ambulance' }, { e: '🚒', name: 'fire truck' },
    { e: '⛵', name: 'boat' }, { e: '🚁', name: 'helicopter' }, { e: '🛵', name: 'scooter' },
  ],
  colors: [
    { name: 'red', hex: '#ef476f' }, { name: 'blue', hex: '#3aa0ff' }, { name: 'green', hex: '#27c46b' },
    { name: 'yellow', hex: '#ffd60a' }, { name: 'orange', hex: '#fb8500' }, { name: 'purple', hex: '#9b5de5' },
    { name: 'pink', hex: '#ff5da2' }, { name: 'brown', hex: '#9c6644' }, { name: 'black', hex: '#222222' },
  ],
  shapes: [
    { e: '⚫', name: 'circle' }, { e: '🟥', name: 'square' }, { e: '🔺', name: 'triangle' },
    { e: '⭐', name: 'star' }, { e: '❤️', name: 'heart' }, { e: '🔷', name: 'diamond' },
  ],
  // For phonics: first letter of each word
  abcThings: [
    { l: 'A', e: '🍎', word: 'Apple' }, { l: 'B', e: '⚽', word: 'Ball' }, { l: 'C', e: '🐱', word: 'Cat' },
    { l: 'D', e: '🐶', word: 'Dog' }, { l: 'E', e: '🥚', word: 'Egg' }, { l: 'F', e: '🐟', word: 'Fish' },
    { l: 'G', e: '🐐', word: 'Goat' }, { l: 'H', e: '🎩', word: 'Hat' }, { l: 'I', e: '🍦', word: 'Ice cream' },
    { l: 'J', e: '🧃', word: 'Juice' }, { l: 'K', e: '🪁', word: 'Kite' }, { l: 'L', e: '🦁', word: 'Lion' },
    { l: 'M', e: '🥭', word: 'Mango' }, { l: 'N', e: '🪺', word: 'Nest' }, { l: 'O', e: '🍊', word: 'Orange' },
    { l: 'P', e: '🐷', word: 'Pig' }, { l: 'Q', e: '👑', word: 'Queen' }, { l: 'R', e: '🐰', word: 'Rabbit' },
    { l: 'S', e: '☀️', word: 'Sun' }, { l: 'T', e: '🌳', word: 'Tree' }, { l: 'U', e: '☂️', word: 'Umbrella' },
    { l: 'V', e: '🚐', word: 'Van' }, { l: 'W', e: '⌚', word: 'Watch' }, { l: 'X', e: '📦', word: 'boX' },
    { l: 'Y', e: '🪀', word: 'Yo-yo' }, { l: 'Z', e: '🦓', word: 'Zebra' },
  ],
  // Everyday "what should you do?" situations (logic / common sense)
  situations: [
    { q: 'It is raining outside. What do you take?', right: { e: '☂️', name: 'umbrella' }, wrong: [{ e: '🕶️', name: 'sunglasses' }, { e: '🩴', name: 'slippers' }, { e: '🪀', name: 'toy' }] },
    { q: 'It is night and dark. What do you turn on?', right: { e: '💡', name: 'light' }, wrong: [{ e: '🧊', name: 'ice' }, { e: '📕', name: 'book' }, { e: '🧦', name: 'sock' }] },
    { q: 'Your hands are dirty. What do you use?', right: { e: '🧼', name: 'soap' }, wrong: [{ e: '🍬', name: 'candy' }, { e: '🖍️', name: 'crayon' }, { e: '📱', name: 'phone' }] },
    { q: 'It is very cold. What do you wear?', right: { e: '🧥', name: 'jacket' }, wrong: [{ e: '🩳', name: 'shorts' }, { e: '🕶️', name: 'sunglasses' }, { e: '👙', name: 'swimsuit' }] },
    { q: 'You are sleepy. Where do you go?', right: { e: '🛏️', name: 'bed' }, wrong: [{ e: '🍳', name: 'frying pan' }, { e: '🚿', name: 'shower' }, { e: '🪑', name: 'chair' }] },
    { q: 'You want to clean your teeth. What do you use?', right: { e: '🪥', name: 'toothbrush' }, wrong: [{ e: '🍫', name: 'chocolate' }, { e: '🥄', name: 'spoon' }, { e: '🧹', name: 'broom' }] },
    { q: 'The plant looks dry. What does it need?', right: { e: '💧', name: 'water' }, wrong: [{ e: '🔥', name: 'fire' }, { e: '🍕', name: 'pizza' }, { e: '🧱', name: 'brick' }] },
    { q: 'You feel hungry. What do you do?', right: { e: '🍽️', name: 'eat food' }, wrong: [{ e: '😴', name: 'sleep' }, { e: '🏃', name: 'run' }, { e: '📺', name: 'watch TV' }] },
    { q: 'You want to cross the road safely. What do you look for?', right: { e: '🟢', name: 'green light' }, wrong: [{ e: '🔴', name: 'red light' }, { e: '🍦', name: 'ice cream' }, { e: '🎈', name: 'balloon' }] },
    { q: 'It is sunny and bright. What do you wear on your eyes?', right: { e: '🕶️', name: 'sunglasses' }, wrong: [{ e: '🧤', name: 'gloves' }, { e: '🧣', name: 'scarf' }, { e: '👢', name: 'boots' }] },
  ],
  // Patterns for coding logic (repeat to extend, ask "what comes next?")
  patternSets: [
    ['🔴', '🔵'], ['⭐', '🌙'], ['🍎', '🍌'], ['🟥', '🟦', '🟨'], ['🐶', '🐱'],
    ['👆', '👇'], ['🔺', '⬜'], ['❤️', '💛'], ['🚗', '🚌'], ['🌞', '🌧️'],
  ],
  praise: ['Great job!', 'Awesome!', 'Well done!', 'You did it!', 'Super!', 'Brilliant!', 'Yay!', 'Amazing!', 'Good thinking!'],
  tryAgain: ['Try again!', 'Almost! Try once more.', 'Not yet, you can do it!', 'Have another go!'],
};
