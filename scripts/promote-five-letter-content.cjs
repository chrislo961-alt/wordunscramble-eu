#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const broadWords = fs.readFileSync(path.join(root, 'data/w5.txt'), 'utf8').trim().split(/\s+/);
const commonSet = new Set(fs.readFileSync(path.join(root, 'data/common.txt'), 'utf8').trim().split(/\s+/));

const pages = [
  {
    slug: '5-letter-words-starting-with-a',
    match: (word) => word.startsWith('a'),
    description: 'Browse common 5 letter words starting with A, grouped by useful patterns with puzzle tips and a larger alphabetical word list.',
    intro: 'Need a five-letter word beginning with A? Start with the familiar answers below, then scan the wider alphabetical list when the obvious choices do not fit your puzzle.',
    quick: ['about', 'above', 'after', 'again', 'alarm', 'alive', 'alone', 'angle', 'apple', 'argue', 'avoid', 'aware'],
    groups: [
      ['Useful everyday words', ['abide', 'abode', 'admit', 'adopt', 'adult', 'agent', 'agree', 'ahead', 'aisle', 'alert', 'allow', 'award']],
      ['Words with repeated letters', ['abbey', 'added', 'agree', 'alley', 'allow', 'apple', 'apply', 'array', 'asses', 'asset', 'attic', 'await']],
      ['Strong puzzle candidates', ['aback', 'acute', 'adieu', 'affix', 'alpha', 'amaze', 'amber', 'ample', 'angel', 'ankle', 'apron', 'atlas']],
    ],
    guidance: 'A is followed by almost every kind of letter, so the second position is usually the fastest way to narrow the list. If your pattern is A?O??, for example, use the Crossword Solver instead of reading hundreds of A words. Repeated letters also matter: APPLE needs two Ps, while AGREE needs two Es.',
    faqs: [
      ['What are common 5 letter words starting with A?', 'ABOUT, ABOVE, AFTER, AGAIN, ALONE, ANGLE and APPLE are familiar examples. The best answer depends on your confirmed letters and where they appear.'],
      ['How can I shorten a long list of A words?', 'Add every fixed position to the Crossword Solver, or enter your available letters in the Word Finder. One confirmed second or final letter removes most possibilities.'],
    ],
  },
  {
    slug: '5-letter-words-starting-with-c',
    match: (word) => word.startsWith('c'),
    description: 'Find common 5 letter words starting with C, including CH, CL and CR patterns, plus puzzle tips and an alphabetical word list.',
    intro: 'Five-letter C words become much easier to scan when you know the next letter. The CH, CL and CR groups cover many familiar puzzle answers, so they are separated below before the wider list.',
    quick: ['cabin', 'cable', 'camel', 'canal', 'candy', 'carry', 'cause', 'chain', 'chair', 'charm', 'chart', 'chase'],
    groups: [
      ['CH words', ['chain', 'chair', 'chalk', 'champ', 'charm', 'chart', 'chase', 'cheap', 'check', 'cheer', 'chess', 'child']],
      ['CL words', ['claim', 'clamp', 'class', 'clean', 'clear', 'clerk', 'click', 'cliff', 'climb', 'clock', 'clone', 'close']],
      ['CR words', ['craft', 'crane', 'crash', 'crate', 'crave', 'crawl', 'crazy', 'cream', 'crime', 'crisp', 'crowd', 'crown']],
    ],
    guidance: 'Treat the opening pair as one clue. C followed by H, L or R creates very different candidate sets, while a known ending can reduce them further: C???K points toward words such as CHECK, CHICK, CLOCK or CRACK. Use only confirmed letters so a speculative filter does not hide the answer.',
    faqs: [
      ['Which 5 letter C words are useful in word puzzles?', 'CHAIN, CHAIR, CLEAN, CLEAR, CRANE, CRATE and CROWN are common choices with distinct letter patterns.'],
      ['Why do CH, CL and CR have separate groups?', 'The second letter is a strong filter for C words. Grouping common beginnings makes it faster to compare candidates against known positions.'],
    ],
  },
  {
    slug: '5-letter-words-starting-with-s',
    match: (word) => word.startsWith('s'),
    description: 'Explore common 5 letter words starting with S, grouped into SH, ST and SC patterns with practical solving tips and more matches.',
    intro: 'S begins a large number of five-letter English words. Instead of scanning one enormous block, compare the common SH, ST and SC/SK beginnings with the letters already fixed in your puzzle.',
    quick: ['scale', 'scare', 'scene', 'scope', 'score', 'share', 'sharp', 'sheep', 'sheet', 'shirt', 'short', 'sound'],
    groups: [
      ['SH words', ['shade', 'shake', 'shame', 'shape', 'share', 'shark', 'sharp', 'shave', 'sheep', 'sheer', 'sheet', 'shelf']],
      ['ST words', ['stack', 'staff', 'stage', 'stain', 'stair', 'stake', 'stale', 'stand', 'stare', 'start', 'state', 'steam']],
      ['SC and SK words', ['scale', 'scalp', 'scare', 'scarf', 'scene', 'scent', 'scope', 'score', 'scout', 'skate', 'skill', 'skirt']],
    ],
    guidance: 'S often forms a consonant pair at the beginning. Locking the second letter therefore cuts the search sharply: SH??E, ST?R? and SC??? each lead to different groups. If you are solving a Wordle-style puzzle, record yellow-position restrictions as well as letters that must appear.',
    faqs: [
      ['What are common 5 letter words starting with S?', 'SCALE, SCORE, SHARE, SHARP, SHEET, SHORT, SOUND, STARE and STATE are familiar examples.'],
      ['How do I narrow hundreds of S words?', 'Start with the second letter, then add a known ending or fixed position. The Wordle Solver can also exclude confirmed grey letters.'],
    ],
  },
  {
    slug: '5-letter-words-ending-with-e',
    match: (word) => word.endsWith('e'),
    description: 'Browse common 5 letter words ending with E, grouped by familiar endings and silent-E patterns with practical puzzle guidance.',
    intro: 'A final E often changes the vowel sound earlier in a word, but it can also belong to endings such as -ORE or -OVE. Use the grouped examples to recognize the pattern before opening the larger list.',
    quick: ['above', 'alone', 'apple', 'brave', 'close', 'dance', 'drive', 'flame', 'house', 'place', 'score', 'state'],
    groups: [
      ['Words ending in -AKE', ['awake', 'brake', 'drake', 'flake', 'quake', 'shake', 'snake', 'stake']],
      ['Words ending in -ORE or -OVE', ['adore', 'chore', 'drove', 'glove', 'prove', 'score', 'shore', 'store', 'stove']],
      ['Common silent-E patterns', ['blade', 'blame', 'brave', 'crane', 'crate', 'drive', 'flame', 'grape', 'plane', 'plate', 'shine', 'smile']],
    ],
    guidance: 'Do not assume every final E is silent. HOUSE, AGREE and IMAGE behave differently from CRANE or SMILE. In a letter-position puzzle, enter the complete pattern such as ??A?E; the known final E is useful, but the middle letters usually decide the answer.',
    faqs: [
      ['What are common 5 letter words ending with E?', 'ABOVE, ALONE, APPLE, BRAVE, CLOSE, DRIVE, HOUSE, PLACE, SCORE and STATE are common examples.'],
      ['Is the final E always silent?', 'No. It is silent in many words such as CRANE and SMILE, but words including AGREE and IMAGE follow different pronunciation patterns.'],
    ],
  },
  {
    slug: '5-letter-words-ending-with-r',
    match: (word) => word.endsWith('r'),
    description: 'Find common 5 letter words ending with R, organized by -ER, -OR and other useful patterns for crosswords and letter games.',
    intro: 'Many five-letter words ending in R use the familiar -ER or -OR ending. Separating those patterns makes it quicker to compare likely answers with a crossword clue or known letter positions.',
    quick: ['actor', 'after', 'anger', 'baker', 'buyer', 'chair', 'cover', 'enter', 'favor', 'major', 'other', 'power'],
    groups: [
      ['Words ending in -ER', ['after', 'anger', 'baker', 'buyer', 'cider', 'cover', 'diner', 'eager', 'elder', 'enter', 'fewer', 'maker']],
      ['Words ending in -OR', ['actor', 'color', 'donor', 'honor', 'humor', 'major', 'manor', 'minor', 'motor', 'prior', 'tutor', 'vigor']],
      ['Other common R endings', ['altar', 'amber', 'cedar', 'chair', 'cigar', 'clear', 'floor', 'flour', 'lunar', 'polar', 'power', 'solar']],
    ],
    guidance: 'The ending can hint at meaning as well as spelling. Many -ER words name a person or thing that performs an action, while -OR appears in words such as ACTOR and DONOR. That is a useful clue, but always confirm it against the definition and crossing letters.',
    faqs: [
      ['What are common 5 letter words ending with R?', 'AFTER, ANGER, BAKER, CHAIR, COVER, ENTER, MAJOR, OTHER and POWER are familiar examples.'],
      ['Are most 5 letter R-ending words also ER words?', 'Many are, but not all. -OR words such as ACTOR and MAJOR and endings in words such as CHAIR, CIGAR and SOLAR create other useful groups.'],
    ],
  },
  {
    slug: '5-letter-words-ending-with-y',
    match: (word) => word.endsWith('y'),
    description: 'Browse common 5 letter words ending with Y, including -LY words, doubled consonants and familiar puzzle answers.',
    intro: 'A final Y appears in adverbs, adjectives, nouns and verbs, so meaning alone may not be enough. Look for an -LY ending, a doubled consonant or another confirmed letter before scanning the larger list.',
    quick: ['angry', 'candy', 'crazy', 'daily', 'dirty', 'early', 'empty', 'fancy', 'funny', 'happy', 'party', 'story'],
    groups: [
      ['Words ending in -LY', ['badly', 'daily', 'early', 'fully', 'godly', 'jolly', 'lowly', 'oddly', 'sadly', 'shyly', 'silly', 'slyly']],
      ['Doubled consonant before Y', ['belly', 'berry', 'buddy', 'bunny', 'carry', 'daddy', 'dizzy', 'funny', 'happy', 'jelly', 'silly', 'sunny']],
      ['Other useful Y endings', ['angry', 'candy', 'crazy', 'dirty', 'empty', 'fancy', 'forty', 'glory', 'lucky', 'party', 'ready', 'story']],
    ],
    guidance: 'Final Y can act like a vowel, which is why these words have many different shapes. Check whether your puzzle permits repeated letters: HAPPY, FUNNY and SILLY each need a double consonant, while ANGRY, EMPTY and STORY do not.',
    faqs: [
      ['What are common 5 letter words ending with Y?', 'ANGRY, CANDY, CRAZY, DAILY, DIRTY, EARLY, EMPTY, FUNNY, HAPPY, PARTY and STORY are common examples.'],
      ['Which Y-ending words use repeated letters?', 'BELLY, BERRY, FUNNY, HAPPY, JELLY, SILLY and SUNNY all contain a repeated consonant before the final Y.'],
    ],
  },
  {
    slug: '5-letter-words-containing-a',
    match: (word) => word.includes('a'),
    description: 'Find common 5 letter words containing A, with examples grouped by A position plus filters for faster puzzle solving.',
    intro: 'A can appear in any of the five positions, so its location matters more than the fact that it is present. Compare the position-based examples below, then use a pattern tool when you know an exact slot.',
    quick: ['about', 'after', 'apple', 'beach', 'black', 'chain', 'heart', 'place', 'share', 'table', 'train', 'water'],
    groups: [
      ['Words starting with A', ['about', 'after', 'again', 'alarm', 'alive', 'alone', 'apple', 'argue', 'aside', 'avoid', 'award', 'aware']],
      ['Words with A in the middle', ['beach', 'black', 'blame', 'chain', 'charm', 'craft', 'drama', 'flame', 'grape', 'heart', 'place', 'train']],
      ['Words ending with A', ['alpha', 'arena', 'aroma', 'extra', 'karma', 'llama', 'mocha', 'pasta', 'pizza', 'quota', 'salsa', 'sauna']],
    ],
    guidance: 'If A is green or otherwise fixed, write the full five-character pattern: ??A?? means A is third, while A???? means it starts the word. If A is only known to be present, use the included-letter field in the Wordle Solver and add any positions where it cannot appear.',
    faqs: [
      ['What are common 5 letter words containing A?', 'ABOUT, AFTER, APPLE, BEACH, BLACK, CHAIN, HEART, PLACE, SHARE, TABLE, TRAIN and WATER are familiar examples.'],
      ['How do I search for A in a specific position?', 'Use the Crossword Solver with question marks for unknown letters. For example, ??A?? finds five-letter words with A in the third position.'],
    ],
  },
  {
    slug: '5-letter-words-containing-e',
    match: (word) => word.includes('e'),
    description: 'Find common 5 letter words containing E, grouped by letter position with practical Wordle and crossword filtering tips.',
    intro: 'E is extremely common in five-letter English words, which makes an exact position or a second known letter especially valuable. Use these groups as a quick answer, then switch to a solver for precise patterns.',
    quick: ['above', 'beach', 'begin', 'check', 'clean', 'dream', 'early', 'enter', 'green', 'house', 'score', 'state'],
    groups: [
      ['Words starting with E', ['eager', 'early', 'earth', 'eight', 'elite', 'empty', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'event']],
      ['Words with E in the middle', ['beach', 'begin', 'below', 'bench', 'berry', 'blend', 'check', 'chest', 'clean', 'dream', 'fresh', 'green']],
      ['Words ending with E', ['above', 'alone', 'apple', 'brave', 'close', 'dance', 'drive', 'flame', 'house', 'place', 'score', 'state']],
    ],
    guidance: 'Because E appears so often, excluding letters usually helps more than simply requiring E. Record its position when known and watch for repeated Es in words such as AGREE, CHEEK, GREEN and SHEET. A broad dictionary can surface rare matches, so start with Common English for most puzzles.',
    faqs: [
      ['What are common 5 letter words containing E?', 'ABOVE, BEACH, BEGIN, CHECK, CLEAN, DREAM, EARLY, ENTER, GREEN, HOUSE, SCORE and STATE are common examples.'],
      ['Can a 5 letter word contain two Es?', 'Yes. AGREE, CHEEK, GREEN, SHEEP, SHEET and STEEL are familiar examples with two Es. Repeated letters should be entered carefully in Wordle-style filters.'],
    ],
  },
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function wordGrid(words) {
  return `<div class="wordgrid">${words.map((word) => `<div class="word">${word}</div>`).join('')}</div>`;
}

function evenSample(words, limit) {
  if (words.length <= limit) return words;
  return Array.from({ length: limit }, (_, index) => words[Math.floor(index * words.length / limit)]);
}

for (const page of pages) {
  const file = path.join(root, page.slug, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  const matches = broadWords.filter(page.match);
  const commonMatches = matches.filter((word) => commonSet.has(word));
  const claimedWords = [...page.quick, ...page.groups.flatMap(([, words]) => words)];
  for (const word of claimedWords) {
    if (!matches.includes(word)) throw new Error(`${word} does not match ${page.slug}`);
  }

  const listWords = evenSample(commonMatches, 240);
  const content = [
    `<h1>${html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1]}</h1>`,
    `<p class="content-intro">${escapeHtml(page.intro)}</p>`,
    `<div class="statline"><span class="stat">${matches.length.toLocaleString('en-US')} broad matches</span><span class="stat">${commonMatches.length.toLocaleString('en-US')} common words</span><span class="stat">5 letters</span></div>`,
    '<h2>Quick answer: common matches</h2>',
    '<p>Start here for familiar words that are more likely to be useful in everyday puzzles.</p>',
    wordGrid(page.quick),
    '<h2>Words grouped by useful patterns</h2>',
    ...page.groups.flatMap(([heading, words]) => [`<h3>${escapeHtml(heading)}</h3>`, wordGrid(words)]),
    '<h2>How to narrow the answer</h2>',
    `<p>${escapeHtml(page.guidance)}</p>`,
    '<div class="links"><a href="/wordle-solver/">Open Wordle Solver</a><a href="/crossword-solver/">Open Crossword Solver</a><a href="/word-finder/">Open Word Finder</a></div>',
    '<h2>Common-word list</h2>',
    `<p>This alphabetical ${commonMatches.length > 240 ? 'sample' : 'list'} favors familiar English words. Switch to Broad English in the Word Finder when a puzzle expects a rare, regional or specialist term.</p>`,
    wordGrid(listWords),
    ...(commonMatches.length > 240 ? [`<p class="muted">Showing ${listWords.length} common matches spread across the alphabetical list. Use the finder for all ${matches.length.toLocaleString('en-US')} broad-list matches.</p>`] : []),
    '<h2>Frequently asked questions</h2>',
    ...page.faqs.flatMap(([question, answer]) => [`<h3>${escapeHtml(question)}</h3>`, `<p>${escapeHtml(answer)}</p>`]),
  ].join('');

  html = html
    .replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["'][^>]*>/i, `<meta name="description" content="${escapeHtml(page.description)}">`)
    .replace(/<meta\s+name=["']robots["']\s+content=["'][^"']*["'][^>]*>/i, '<meta name="robots" content="index,follow">')
    .replace('<section class="content">', '<section class="content" data-content-tier="curated">')
    .replace(/<h1\b[^>]*>[\s\S]*?(?=<h2>Refine your search<\/h2>)/i, content);

  fs.writeFileSync(file, html);
}

const hubFile = path.join(root, '5-letter-words', 'index.html');
let hubHtml = fs.readFileSync(hubFile, 'utf8');
const cluster = [
  '<!-- curated-five-letter-cluster:start -->',
  '<h2>Popular five-letter letter patterns</h2>',
  '<p>These focused lists put familiar answers first and group words by useful patterns. Choose a known beginning, ending or required letter.</p>',
  '<div class="links">',
  ...pages.map((page) => {
    const label = page.slug
      .replace('5-letter-words-', '5 letter words ')
      .replaceAll('-', ' ')
      .replace(/\b([a-z])$/i, (letter) => letter.toUpperCase());
    return `<a href="/${page.slug}/">${label}</a>`;
  }),
  '</div>',
  '<!-- curated-five-letter-cluster:end -->',
].join('');
hubHtml = hubHtml
  .replace(/<!-- curated-five-letter-cluster:start -->[\s\S]*?<!-- curated-five-letter-cluster:end -->/i, '')
  .replace('<h2>Related word lists</h2>', `${cluster}<h2>Related word lists</h2>`);
fs.writeFileSync(hubFile, hubHtml);

console.log(`Promoted ${pages.length} five-letter content pages.`);
